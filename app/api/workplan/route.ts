import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  activityUpdates,
  contractPayments,
  contracts,
  workplanRecords,
  workplanYears,
} from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";
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
  const savedYears = await getDb().select().from(workplanYears);
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
      if (toYear === BASE_YEAR || existing.length) {
        return Response.json({ error: "That workplan year already exists." }, { status: 409 });
      }

      await db.insert(workplanYears).values({
        year: toYear,
        title: (payload.title ?? `${toYear} workplan`).trim().slice(0, 200),
        status: "draft",
        reportingDate: `${toYear}-12-31`,
        createdAt: now,
        updatedAt: now,
        updatedBy,
      });

      const source = await materializeYear(fromYear);
      const [savedUpdates, sourceContracts, savedPayments] = await Promise.all([
        db.select().from(activityUpdates),
        db.select().from(contracts).where(eq(contracts.planYear, fromYear)),
        db.select().from(contractPayments),
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
      const neededBudgetKeys = new Set(
        openContracts.map((contract) => contract.budgetKey),
      );
      const includedBudgets = source.budgetLines.filter(
        (budget) =>
          copyFullStructure ||
          neededBudgetKeys.has(budget.id) ||
          includedActivityCodes.some((code) =>
            codesShareBudgetLine(code, budget.code),
          ),
      );

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
      for (let index = 0; index < rows.length; index += 40) {
        await db.insert(workplanRecords).values(rows.slice(index, index + 40));
      }

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
        await db.insert(contracts).values({
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
          createdAt: now,
          updatedAt: now,
          updatedBy,
        });
        let assignedPercentage = 0;
        await db.insert(contractPayments).values(
          unpaidPayments.map((payment, index) => {
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
              paid: 0,
              paidAt: "",
              updatedAt: now,
            };
          }),
        );
      }

      const [plan, years] = await Promise.all([materializeYear(toYear), yearList()]);
      return Response.json({ year: toYear, years, ...plan }, { status: 201 });
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
    await db
      .insert(workplanRecords)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({
        target: workplanRecords.id,
        set: values,
      });
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
      year?: number;
      recordType?: string;
      recordKey?: string;
      parentKey?: string;
    };
    const year = Number(payload.year);
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
    const values = {
      id: recordId(year, recordType, recordKey),
      planYear: year,
      recordType,
      recordKey,
      parentKey: (payload.parentKey ?? "").trim().slice(0, 220),
      payload: "{}",
      isDeleted: 1,
      updatedAt: now,
      updatedBy: session.email,
    };
    await getDb()
      .insert(workplanRecords)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({ target: workplanRecords.id, set: values });
    const plan = await materializeYear(year);
    return Response.json({ deletedKey: recordKey, year, ...plan });
  } catch (error) {
    console.error("Unable to remove workplan record", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
