import { eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { getDb } from "@/db";
import {
  activityUpdates,
  budgetAllocations,
  contractPayments,
  contracts,
  financeEntries,
  paymentDocuments,
  quarterlyUpdates,
  workplanRecords,
  workplanYears,
} from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";
import { snapshot, writeAuditLog } from "@/lib/audit-log";
import workplan from "@/lib/workplan-data.json";

const BASE_YEAR = 2026;
const recordTypes = new Set(["activity", "subactivity", "budget"]);

type JsonRecord = Record<string, unknown>;
type ActivityRecord = JsonRecord & {
  id: string;
  code: string;
  status?: unknown;
  subactivities: SubactivityRecord[];
};
type SubactivityRecord = JsonRecord & {
  id: string;
  activityId: string;
};
type BudgetRecord = JsonRecord & {
  id: string;
  code: string;
};

function safePayload(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : {};
  } catch {
    return {};
  }
}

function recordId(year: number, type: string, key: string) {
  return `${year}:${type}:${key}`;
}

function stripYearPrefix(value: string) {
  return value.replace(/^\d{4}:/, "");
}

function shiftDate(value: unknown, year: number) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${year}${value.slice(4)}`
    : value;
}

function copyForYear(payload: JsonRecord, year: number, kind: string) {
  const copied: JsonRecord = { ...payload };
  for (const field of ["startDate", "endDate", "progressStartDate", "progressEndDate"]) {
    copied[field] = shiftDate(copied[field], year);
  }
  if (kind !== "budget") {
    copied.status = "not_started";
    copied.rawStatus = "";
    copied.progressSummary = "";
  }
  if (kind === "activity") copied.progress = 0;
  return copied;
}

function normalizeCode(value: unknown) {
  return String(value ?? "").replace(/\s/g, "").replace(/\.+$/, "");
}

function codesShareBudgetLine(activityCode: unknown, budgetCode: unknown) {
  const activity = normalizeCode(activityCode);
  const budget = normalizeCode(budgetCode);
  return Boolean(
    activity &&
      budget &&
      (activity === budget ||
        activity.startsWith(`${budget}.`) ||
        budget.startsWith(`${activity}.`)),
  );
}

async function materializeYear(year: number) {
  const rows = await getDb()
    .select()
    .from(workplanRecords)
    .where(eq(workplanRecords.planYear, year));

  const activities =
    year === BASE_YEAR
      ? (structuredClone(workplan.activities) as unknown as ActivityRecord[])
      : [];
  const budgets =
    year === BASE_YEAR
      ? (structuredClone(workplan.budgetLines) as unknown as BudgetRecord[])
      : [];

  const activityMap = new Map(
    activities.map((item) => [item.id, { ...item, subactivities: [...item.subactivities] }]),
  );
  for (const row of rows.filter((item) => item.recordType === "activity")) {
    if (row.isDeleted) {
      activityMap.delete(row.recordKey);
      continue;
    }
    const current = activityMap.get(row.recordKey);
    activityMap.set(row.recordKey, {
      ...(current ?? {}),
      ...safePayload(row.payload),
      id: row.recordKey,
      subactivities: current?.subactivities ?? [],
    } as ActivityRecord);
  }

  const subactivityMap = new Map<string, SubactivityRecord>();
  for (const activity of activityMap.values()) {
    for (const subactivity of activity.subactivities ?? []) {
      subactivityMap.set(subactivity.id, {
        ...subactivity,
        activityId: activity.id,
      });
    }
  }
  for (const row of rows.filter((item) => item.recordType === "subactivity")) {
    if (row.isDeleted) {
      subactivityMap.delete(row.recordKey);
      continue;
    }
    subactivityMap.set(row.recordKey, {
      ...(subactivityMap.get(row.recordKey) ?? {}),
      ...safePayload(row.payload),
      id: row.recordKey,
      activityId: row.parentKey,
    } as SubactivityRecord);
  }

  for (const activity of activityMap.values()) {
    activity.subactivities = [...subactivityMap.values()]
      .filter((item) => item.activityId === activity.id)
      .sort((a, b) =>
        String(a.startDate ?? "").localeCompare(String(b.startDate ?? "")) ||
        String(a.title ?? "").localeCompare(String(b.title ?? "")),
      );
  }

  const budgetMap = new Map(budgets.map((item) => [item.id, item]));
  for (const row of rows.filter((item) => item.recordType === "budget")) {
    if (row.isDeleted) {
      budgetMap.delete(row.recordKey);
      continue;
    }
    budgetMap.set(row.recordKey, {
      ...(budgetMap.get(row.recordKey) ?? {}),
      ...safePayload(row.payload),
      id: row.recordKey,
    } as BudgetRecord);
  }

  return {
    activities: [...activityMap.values()].sort((a, b) =>
      String(a.code ?? "").localeCompare(String(b.code ?? ""), undefined, {
        numeric: true,
      }),
    ),
    budgetLines: [...budgetMap.values()].sort((a, b) =>
      String(a.code ?? "").localeCompare(String(b.code ?? ""), undefined, {
        numeric: true,
      }),
    ),
  };
}

async function yearList() {
  const db = getDb();
  const [savedYears, savedRecords, savedContracts] = await Promise.all([
    db.select().from(workplanYears),
    db
      .select({ planYear: workplanRecords.planYear })
      .from(workplanRecords)
      .where(eq(workplanRecords.isDeleted, 0)),
    db.select({ planYear: contracts.planYear }).from(contracts),
  ]);
  const yearsWithContent = new Set([
    ...savedRecords.map((item) => item.planYear),
    ...savedContracts.map((item) => item.planYear),
  ]);
  const years = new Map<number, (typeof savedYears)[number] | null>([[BASE_YEAR, null]]);
  for (const item of savedYears) years.set(item.year, item);
  return [...years.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, item]) => ({
      year,
      title: item?.title || `${year} workplan`,
      status: item?.status || (year === BASE_YEAR ? "active" : "draft"),
      reportingDate:
        item?.reportingDate || (year === BASE_YEAR ? workplan.meta.reportingDate : ""),
      isEmpty: year !== BASE_YEAR && !yearsWithContent.has(year),
    }));
}

function storageMessage(error: unknown) {
  const text = error instanceof Error ? error.message : "Unexpected error";
  if (text.includes("no such table") || text.includes("workplan_records")) {
    return "Workplan editing is being prepared. The 2026 source plan remains available.";
  }
  return "The editable workplan is temporarily unavailable.";
}

export async function GET(request: Request) {
  const session = await requireAppSession(request);
  if (session instanceof Response) return session;
  const year = Number(new URL(request.url).searchParams.get("year") || BASE_YEAR);
  if (!Number.isInteger(year) || year < BASE_YEAR || year > 2100) {
    return Response.json({ error: "Choose a valid workplan year." }, { status: 400 });
  }
  try {
    const [plan, years] = await Promise.all([materializeYear(year), yearList()]);
    return Response.json({ year, years, ...plan });
  } catch (error) {
    console.error("Unable to load editable workplan", error);
    if (year === BASE_YEAR) {
      return Response.json({
        year,
        years: [
          {
            year: BASE_YEAR,
            title: `${BASE_YEAR} workplan`,
            status: "active",
            reportingDate: workplan.meta.reportingDate,
          },
        ],
        activities: workplan.activities,
        budgetLines: workplan.budgetLines,
        warning: storageMessage(error),
      });
    }
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as {
      action?: string;
      year?: number;
      fromYear?: number;
      toYear?: number;
      copyCurrent?: boolean;
      title?: string;
      recordType?: string;
      recordKey?: string;
      parentKey?: string;
      record?: JsonRecord;
    };
    const db = getDb();
    const updatedBy = session.email;
    const now = new Date().toISOString();

    if (payload.action === "create_year") {
      const fromYear = Number(payload.fromYear ?? BASE_YEAR);
      const toYear = Number(payload.toYear);
      if (
        !Number.isInteger(fromYear) ||
        !Number.isInteger(toYear) ||
        toYear <= fromYear ||
        toYear > 2100
      ) {
        return Response.json({ error: "Choose a valid future year." }, { status: 400 });
      }
      const existing = await db
        .select()
        .from(workplanYears)
        .where(eq(workplanYears.year, toYear))
        .limit(1);
      if (toYear === BASE_YEAR) {
        return Response.json({ error: "That workplan year already exists." }, { status: 409 });
      }
      let repairingEmptyDraft = false;
      if (existing.length) {
        const [targetRecords, targetContracts] = await Promise.all([
          db
            .select({ id: workplanRecords.id })
            .from(workplanRecords)
            .where(eq(workplanRecords.planYear, toYear))
            .limit(1),
          db
            .select({ id: contracts.id })
            .from(contracts)
            .where(eq(contracts.planYear, toYear))
            .limit(1),
        ]);
        repairingEmptyDraft =
          existing[0].status === "draft" &&
          targetRecords.length === 0 &&
          targetContracts.length === 0;
        if (!repairingEmptyDraft) {
          return Response.json(
            { error: "That workplan year already exists." },
            { status: 409 },
          );
        }
      }

      const yearRow: typeof workplanYears.$inferInsert = {
        year: toYear,
        title: (payload.title ?? `${toYear} workplan`).trim().slice(0, 200),
        status: "draft",
        reportingDate: `${toYear}-12-31`,
        createdAt: now,
        updatedAt: now,
        updatedBy,
      };

      const source = await materializeYear(fromYear);
      const [savedUpdates, sourceContracts, savedPayments, sourceFinanceEntries] = await Promise.all([
        db.select().from(activityUpdates),
        db.select().from(contracts).where(eq(contracts.planYear, fromYear)),
        db.select().from(contractPayments),
        db.select().from(financeEntries),
      ]);
      const updateStatus = new Map(
        savedUpdates.map((item) => [item.activityKey, item.status]),
      );
      const openContracts = sourceContracts.filter((contract) =>
        ["draft", "active"].includes(contract.status),
      );
      const contractTargetKeys = new Set(
        openContracts.map((contract) => contract.activityKey),
      );
      const copyFullStructure = Boolean(payload.copyCurrent);
      const includedActivities: Array<{
        activity: ActivityRecord;
        subactivities: SubactivityRecord[];
      }> = [];

      for (const activity of source.activities) {
        const unfinishedSubactivities = activity.subactivities.filter(
          (subactivity) =>
            (updateStatus.get(subactivity.id) ?? String(subactivity.status ?? "not_reported")) !==
              "completed" || contractTargetKeys.has(subactivity.id),
        );
        const activityStatus =
          updateStatus.get(activity.id) ?? String(activity.status ?? "not_reported");
        const includeActivity =
          copyFullStructure ||
          contractTargetKeys.has(activity.id) ||
          (activity.subactivities.length
            ? unfinishedSubactivities.length > 0
            : activityStatus !== "completed");
        if (!includeActivity) continue;
        includedActivities.push({
          activity,
          subactivities: copyFullStructure
            ? activity.subactivities
            : unfinishedSubactivities,
        });
      }

      const includedActivityCodes = includedActivities.map(
        ({ activity }) => activity.code,
      );
      const includedActivityKeys = new Set(
        includedActivities.map(({ activity }) => activity.id),
      );
      const neededBudgetKeys = new Set(
        openContracts.map((contract) => contract.budgetKey),
      );
      const includedBudgets = source.budgetLines.filter((budget) => {
        if (copyFullStructure || neededBudgetKeys.has(budget.id)) return true;
        if (Array.isArray(budget.linkedActivityKeys)) {
          return budget.linkedActivityKeys.some(
            (key) => typeof key === "string" && includedActivityKeys.has(key),
          );
        }
        return includedActivityCodes.some((code) =>
          codesShareBudgetLine(code, budget.code),
        );
      });

      const rows: Array<typeof workplanRecords.$inferInsert> = [];
      const activityKeys = new Map<string, string>();
      const budgetKeys = new Map<string, string>();
      for (const { activity } of includedActivities) {
        const key = `${toYear}:${stripYearPrefix(activity.id)}`;
        activityKeys.set(activity.id, key);
        const { subactivities: _subactivities, ...activityPayload } = activity;
        void _subactivities;
        const copied = copyForYear(activityPayload, toYear, "activity");
        copied.id = key;
        copied.transferredFromYear = fromYear;
        rows.push({
          id: recordId(toYear, "activity", key),
          planYear: toYear,
          recordType: "activity",
          recordKey: key,
          parentKey: "",
          payload: JSON.stringify(copied),
          isDeleted: 0,
          createdAt: now,
          updatedAt: now,
          updatedBy,
        });
      }
      for (const { activity, subactivities } of includedActivities) {
        for (const subactivity of subactivities) {
          const key = `${toYear}:${stripYearPrefix(subactivity.id)}`;
          const parentKey = activityKeys.get(activity.id) ?? "";
          activityKeys.set(subactivity.id, key);
          const copied = copyForYear(subactivity, toYear, "subactivity");
          copied.id = key;
          copied.activityId = parentKey;
          copied.transferredFromYear = fromYear;
          rows.push({
            id: recordId(toYear, "subactivity", key),
            planYear: toYear,
            recordType: "subactivity",
            recordKey: key,
            parentKey,
            payload: JSON.stringify(copied),
            isDeleted: 0,
            createdAt: now,
            updatedAt: now,
            updatedBy,
          });
        }
      }
      for (const budget of includedBudgets) {
        const key = `${toYear}:${stripYearPrefix(budget.id)}`;
        budgetKeys.set(budget.id, key);
        const copied = copyForYear(budget, toYear, "budget");
        copied.id = key;
        copied.transferredFromYear = fromYear;
        const approvedMnt = Math.max(
          0,
          Math.round(Number(budget.budgetMntMillion ?? 0) * 1_000_000),
        );
        const manualCommitmentMnt = sourceFinanceEntries
          .filter(
            (entry) =>
              entry.budgetKey === budget.id && entry.entryType === "commitment",
          )
          .reduce((total, entry) => total + entry.amountMnt, 0);
        const manualExpenditureMnt = sourceFinanceEntries
          .filter(
            (entry) =>
              entry.budgetKey === budget.id && entry.entryType === "expenditure",
          )
          .reduce((total, entry) => total + entry.amountMnt, 0);
        const contractCommitmentMnt = sourceContracts
          .filter(
            (contract) =>
              contract.budgetKey === budget.id && contract.status !== "closed",
          )
          .reduce((total, contract) => {
            const paid = savedPayments
              .filter(
                (payment) =>
                  payment.contractId === contract.id && Boolean(payment.paid),
              )
              .reduce((subtotal, payment) => subtotal + payment.amountMnt, 0);
            return total + Math.max(contract.amountMnt - paid, 0);
          }, 0);
        const contractExpenditureMnt = sourceContracts
          .filter((contract) => contract.budgetKey === budget.id)
          .reduce(
            (total, contract) =>
              total +
              savedPayments
                .filter(
                  (payment) =>
                    payment.contractId === contract.id && Boolean(payment.paid),
                )
                .reduce((subtotal, payment) => subtotal + payment.amountMnt, 0),
            0,
          );
        const remainingMnt = Math.max(
          0,
          approvedMnt -
            manualCommitmentMnt -
            manualExpenditureMnt -
            contractCommitmentMnt -
            contractExpenditureMnt,
        );
        copied.budgetMntMillion = remainingMnt / 1_000_000;
        copied.transferredRemainingMnt = remainingMnt;
        if (Array.isArray(budget.linkedActivityKeys)) {
          copied.linkedActivityKeys = budget.linkedActivityKeys
            .filter((activityKey): activityKey is string =>
              typeof activityKey === "string",
            )
            .map((activityKey) => activityKeys.get(activityKey))
            .filter((activityKey): activityKey is string => Boolean(activityKey));
        }
        rows.push({
          id: recordId(toYear, "budget", key),
          planYear: toYear,
          recordType: "budget",
          recordKey: key,
          parentKey: "",
          payload: JSON.stringify(copied),
          isDeleted: 0,
          createdAt: now,
          updatedAt: now,
          updatedBy,
        });
      }
      const carriedContractRows: Array<typeof contracts.$inferInsert> = [];
      const carriedPaymentRows: Array<typeof contractPayments.$inferInsert> = [];
      for (const contract of openContracts) {
        const activityKey = activityKeys.get(contract.activityKey);
        const budgetKey = budgetKeys.get(contract.budgetKey);
        const unpaidPayments = savedPayments
          .filter(
            (payment) =>
              payment.contractId === contract.id && !Boolean(payment.paid),
          )
          .sort((a, b) => a.sequence - b.sequence);
        const outstandingMnt = unpaidPayments.reduce(
          (total, payment) => total + payment.amountMnt,
          0,
        );
        if (!activityKey || !budgetKey || !outstandingMnt || !unpaidPayments.length) {
          continue;
        }
        const newContractId = crypto.randomUUID();
        carriedContractRows.push({
          id: newContractId,
          planYear: toYear,
          contractNumber: contract.contractNumber,
          status: contract.status,
          budgetKey,
          activityKey,
          torName: contract.torName,
          serviceProviderName: contract.serviceProviderName,
          serviceProviderType: contract.serviceProviderType,
          startDate: contract.startDate,
          endDate: contract.endDate,
          amountMnt: outstandingMnt,
          currency: contract.currency,
          foreignAmountMinor: contract.currency === "USD"
            ? unpaidPayments.reduce(
                (total, payment) => total + payment.foreignAmountMinor,
                0,
              )
            : 0,
          exchangeRateMnt: contract.exchangeRateMnt,
          transferredFromYear: fromYear,
          createdAt: now,
          updatedAt: now,
          updatedBy,
        });
        let assignedPercentage = 0;
        carriedPaymentRows.push(
          ...unpaidPayments.map((payment, index) => {
            const isLast = index === unpaidPayments.length - 1;
            const remainingSlots = unpaidPayments.length - index - 1;
            const percentage = isLast
              ? 100 - assignedPercentage
              : Math.min(
                  100 - assignedPercentage - remainingSlots,
                  Math.max(
                    1,
                    Math.round((payment.amountMnt / outstandingMnt) * 100),
                  ),
                );
            assignedPercentage += percentage;
            return {
              id: crypto.randomUUID(),
              contractId: newContractId,
              sequence: index + 1,
              label: payment.label,
              dueDate: payment.dueDate,
              deliverable: payment.deliverable,
              percentage,
              amountMnt: payment.amountMnt,
              foreignAmountMinor: payment.foreignAmountMinor,
              paid: 0,
              paidAt: "",
              updatedAt: now,
            };
          }),
        );
      }

      const writes: BatchItem<"sqlite">[] = repairingEmptyDraft
        ? [
            db
              .update(workplanYears)
              .set({ updatedAt: now, updatedBy })
              .where(eq(workplanYears.year, toYear)),
          ]
        : [db.insert(workplanYears).values(yearRow)];
      for (let index = 0; index < rows.length; index += 8) {
        writes.push(db.insert(workplanRecords).values(rows.slice(index, index + 8)));
      }
      for (let index = 0; index < carriedContractRows.length; index += 5) {
        writes.push(
          db.insert(contracts).values(carriedContractRows.slice(index, index + 5)),
        );
      }
      for (let index = 0; index < carriedPaymentRows.length; index += 8) {
        writes.push(
          db.insert(contractPayments).values(carriedPaymentRows.slice(index, index + 8)),
        );
      }
      await db.batch(
        writes as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
      );

      const [plan, years] = await Promise.all([materializeYear(toYear), yearList()]);
      return Response.json(
        {
          year: toYear,
          years,
          transferSummary: {
            activities: includedActivities.length,
            subactivities: includedActivities.reduce(
              (total, item) => total + item.subactivities.length,
              0,
            ),
            budgetLines: includedBudgets.length,
            contracts: carriedContractRows.length,
          },
          repaired: repairingEmptyDraft,
          ...plan,
        },
        { status: 201 },
      );
    }

    const year = Number(payload.year);
    const recordType = payload.recordType?.trim() ?? "";
    const recordKey = payload.recordKey?.trim() ?? "";
    if (
      !Number.isInteger(year) ||
      year < BASE_YEAR ||
      year > 2100 ||
      !recordTypes.has(recordType) ||
      !recordKey ||
      recordKey.length > 220 ||
      !payload.record ||
      typeof payload.record !== "object" ||
      Array.isArray(payload.record)
    ) {
      return Response.json({ error: "Enter a valid workplan record." }, { status: 400 });
    }
    const serialized = JSON.stringify(payload.record);
    if (serialized.length > 60_000) {
      return Response.json({ error: "This workplan record is too large." }, { status: 400 });
    }
    const values = {
      id: recordId(year, recordType, recordKey),
      planYear: year,
      recordType,
      recordKey,
      parentKey: (payload.parentKey ?? "").trim().slice(0, 220),
      payload: serialized,
      isDeleted: 0,
      updatedAt: now,
      updatedBy,
    };
    const [existingRecord] = await db
      .select()
      .from(workplanRecords)
      .where(eq(workplanRecords.id, values.id))
      .limit(1);
    await db
      .insert(workplanRecords)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({
        target: workplanRecords.id,
        set: values,
      });
    if (["activity", "subactivity"].includes(recordType)) {
      const [savedRecord] = await db
        .select()
        .from(workplanRecords)
        .where(eq(workplanRecords.id, values.id))
        .limit(1);
      await writeAuditLog({
        entityType: "activity",
        entityKey: recordKey,
        action: existingRecord ? "edited details" : "created",
        previousValue: existingRecord
          ? snapshot("workplan_record", existingRecord)
          : null,
        newValue: snapshot("workplan_record", savedRecord),
        changedBy: updatedBy,
      });
    }
    const plan = await materializeYear(year);
    return Response.json({ year, ...plan });
  } catch (error) {
    console.error("Unable to save editable workplan", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as {
      action?: string;
      year?: number;
      recordType?: string;
      recordKey?: string;
      parentKey?: string;
    };
    const year = Number(payload.year);
    if (payload.action === "delete_year") {
      if (!session.isAdmin) {
        return Response.json(
          { error: "Administrator access is required." },
          { status: 403 },
        );
      }
      if (!Number.isInteger(year) || year <= BASE_YEAR || year > 2100) {
        return Response.json(
          { error: "Only a future draft workplan can be removed." },
          { status: 400 },
        );
      }

      const db = getDb();
      const [savedYear, records, savedContracts] = await Promise.all([
        db.select().from(workplanYears).where(eq(workplanYears.year, year)).limit(1),
        db.select({
          id: workplanRecords.id,
          recordKey: workplanRecords.recordKey,
          recordType: workplanRecords.recordType,
        })
          .from(workplanRecords)
          .where(eq(workplanRecords.planYear, year)),
        db.select({ id: contracts.id })
          .from(contracts)
          .where(eq(contracts.planYear, year)),
      ]);
      if (!savedYear.length) {
        return Response.json({ error: "That workplan year does not exist." }, { status: 404 });
      }
      if (savedYear[0].status !== "draft") {
        return Response.json(
          { error: "Only a draft workplan can be removed." },
          { status: 409 },
        );
      }
      const activityKeys = records
        .filter((record) => ["activity", "subactivity"].includes(record.recordType))
        .map((record) => record.recordKey);
      const budgetKeys = records
        .filter((record) => record.recordType === "budget")
        .map((record) => record.recordKey);
      const contractIds = savedContracts.map((contract) => contract.id);
      const chunks = <T,>(values: T[], size = 50) =>
        Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
          values.slice(index * size, index * size + size),
        );

      for (const ids of chunks(contractIds)) {
        await db.delete(paymentDocuments).where(inArray(paymentDocuments.contractId, ids));
        await db.delete(contractPayments).where(inArray(contractPayments.contractId, ids));
      }
      await db.delete(contracts).where(eq(contracts.planYear, year));
      await db.delete(quarterlyUpdates).where(eq(quarterlyUpdates.planYear, year));
      await db.delete(budgetAllocations).where(eq(budgetAllocations.planYear, year));
      for (const keys of chunks(activityKeys)) {
        await db.delete(activityUpdates).where(inArray(activityUpdates.activityKey, keys));
        await db.delete(financeEntries).where(inArray(financeEntries.activityKey, keys));
      }
      for (const keys of chunks(budgetKeys)) {
        await db.delete(financeEntries).where(inArray(financeEntries.budgetKey, keys));
      }
      await db.delete(workplanRecords).where(eq(workplanRecords.planYear, year));
      await db.delete(workplanYears).where(eq(workplanYears.year, year));
      return Response.json({ deletedYear: year, years: await yearList() });
    }
    const recordType = payload.recordType?.trim() ?? "";
    const recordKey = payload.recordKey?.trim() ?? "";
    if (
      !Number.isInteger(year) ||
      year < BASE_YEAR ||
      !recordTypes.has(recordType) ||
      !recordKey
    ) {
      return Response.json({ error: "Choose a valid workplan record." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const db = getDb();
    const id = recordId(year, recordType, recordKey);
    const [existingRecord] = await db
      .select()
      .from(workplanRecords)
      .where(eq(workplanRecords.id, id))
      .limit(1);
    let previousRecord = existingRecord;
    if (!previousRecord && ["activity", "subactivity"].includes(recordType)) {
      const currentPlan = await materializeYear(year);
      const currentData =
        recordType === "activity"
          ? currentPlan.activities.find((item) => item.id === recordKey)
          : currentPlan.activities
              .flatMap((item) => item.subactivities)
              .find((item) => item.id === recordKey);
      if (currentData) {
        previousRecord = {
          id,
          planYear: year,
          recordType,
          recordKey,
          parentKey: (payload.parentKey ?? "").trim().slice(0, 220),
          payload: JSON.stringify(currentData),
          isDeleted: 0,
          createdAt: now,
          updatedAt: now,
          updatedBy: "",
        };
      }
    }
    const values = {
      id,
      planYear: year,
      recordType,
      recordKey,
      parentKey: (payload.parentKey ?? "").trim().slice(0, 220),
      payload: "{}",
      isDeleted: 1,
      updatedAt: now,
      updatedBy: session.email,
    };
    await db
      .insert(workplanRecords)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({ target: workplanRecords.id, set: values });
    if (["activity", "subactivity"].includes(recordType)) {
      const [deletedRecord] = await db
        .select()
        .from(workplanRecords)
        .where(eq(workplanRecords.id, id))
        .limit(1);
      await writeAuditLog({
        entityType: "activity",
        entityKey: recordKey,
        action: "removed",
        previousValue: previousRecord
          ? snapshot("workplan_record", previousRecord)
          : null,
        newValue: snapshot("workplan_record", deletedRecord),
        changedBy: session.email,
      });
    }
    const plan = await materializeYear(year);
    return Response.json({ deletedKey: recordKey, year, ...plan });
  } catch (error) {
    console.error("Unable to remove workplan record", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
