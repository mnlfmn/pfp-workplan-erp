import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  budgetAllocations,
  contractFundingAllocations,
  contractPaymentAllocations,
  contractPayments,
  contracts,
  financeEntries,
  paymentDocuments,
  systemMetadata,
  workplanRecords,
} from "@/db/schema";
import { requireAdminSession, requireAppSession } from "@/lib/app-auth";
import { snapshot, writeAuditLog } from "@/lib/audit-log";
import { getBucket } from "@/lib/storage";
import { defaultMetadata } from "@/lib/system-metadata";
import workplan from "@/lib/workplan-data.json";

const validStatuses = new Set(["draft", "active", "completed", "closed"]);

type PaymentPayload = {
  id?: string;
  label?: string;
  dueDate?: string;
  deliverable?: string;
  percentage?: number;
  amountMnt?: number;
  foreignAmountMinor?: number;
  paid?: boolean;
  paidAt?: string;
  allocations?: PaymentAllocationPayload[];
};

type FundingAllocationPayload = {
  id?: string;
  budgetKey?: string;
  activityKey?: string;
  amountMnt?: number;
};

type PaymentAllocationPayload = {
  fundingAllocationId?: string;
  budgetKey?: string;
  activityKey?: string;
  amountMnt?: number;
};

type ContractPayload = {
  id?: string;
  planYear?: number;
  contractNumber?: string;
  status?: string;
  budgetKey?: string;
  activityKey?: string;
  torName?: string;
  serviceProviderName?: string;
  serviceProviderType?: string;
  startDate?: string;
  endDate?: string;
  amountMnt?: number;
  currency?: string;
  foreignAmountMinor?: number;
  exchangeRateMnt?: number;
  allocations?: FundingAllocationPayload[];
  payments?: PaymentPayload[];
  allowOverBudget?: boolean;
};

function fundingTargetKey(budgetKey: string, activityKey: string) {
  return `${budgetKey}\u0000${activityKey}`;
}

function normalizedFundingAllocations(payload: ContractPayload) {
  if (payload.allocations?.length) return payload.allocations;
  return payload.budgetKey && payload.activityKey
    ? [
        {
          budgetKey: payload.budgetKey,
          activityKey: payload.activityKey,
          amountMnt: payload.amountMnt,
        },
      ]
    : [];
}

function normalizedPaymentAllocations(
  payment: PaymentPayload,
  allocations: FundingAllocationPayload[],
) {
  if (payment.allocations?.length) return payment.allocations;
  if (allocations.length === 1) {
    return [
      {
        fundingAllocationId: allocations[0].id,
        budgetKey: allocations[0].budgetKey,
        activityKey: allocations[0].activityKey,
        amountMnt: payment.amountMnt,
      },
    ];
  }
  return [];
}

function safePayload(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeCode(value: string) {
  return value.replace(/\s/g, "").replace(/\.+$/, "");
}

function codesShareBudgetLine(activityCode: string, budgetCode: string) {
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

async function validateTarget(
  planYear: number,
  budgetKey: string,
  activityKey: string,
) {
  let budgetCode = "";
  let activityCode = "";
  let mainActivityKey = activityKey;
  if (planYear === 2026) {
    budgetCode = workplan.budgetLines.find((line) => line.id === budgetKey)?.code ?? "";
    for (const activity of workplan.activities) {
      if (activity.id === activityKey) {
        activityCode = activity.code;
        mainActivityKey = activity.id;
      }
      if (activity.subactivities.some((item) => item.id === activityKey)) {
        activityCode = activity.code;
        mainActivityKey = activity.id;
      }
    }
  }

  const db = getDb();
  const [budgetRecord] = await db
    .select()
    .from(workplanRecords)
    .where(
      and(
        eq(workplanRecords.planYear, planYear),
        eq(workplanRecords.recordType, "budget"),
        eq(workplanRecords.recordKey, budgetKey),
        eq(workplanRecords.isDeleted, 0),
      ),
    )
    .limit(1);
  const budgetPayload = budgetRecord ? safePayload(budgetRecord.payload) : {};
  if (budgetPayload.code) {
    budgetCode = String(budgetPayload.code);
  }

  if (!activityCode) {
    const [record] = await db
      .select()
      .from(workplanRecords)
      .where(
        and(
          eq(workplanRecords.planYear, planYear),
          eq(workplanRecords.recordKey, activityKey),
          eq(workplanRecords.isDeleted, 0),
        ),
      )
      .limit(1);
    if (record?.recordType === "activity") {
      activityCode = String(safePayload(record.payload).code ?? "");
      mainActivityKey = record.recordKey;
    } else if (record?.recordType === "subactivity" && record.parentKey) {
      mainActivityKey = record.parentKey;
      const [parent] = await db
        .select()
        .from(workplanRecords)
        .where(
          and(
            eq(workplanRecords.planYear, planYear),
            eq(workplanRecords.recordType, "activity"),
            eq(workplanRecords.recordKey, record.parentKey),
            eq(workplanRecords.isDeleted, 0),
          ),
        )
        .limit(1);
      const baseParent =
        planYear === 2026
          ? workplan.activities.find((activity) => activity.id === record.parentKey)
          : undefined;
      activityCode = String(
        parent
          ? safePayload(parent.payload).code ?? ""
          : baseParent?.code ?? "",
      );
    }
  }

  if (Array.isArray(budgetPayload.linkedActivityKeys)) {
    return budgetPayload.linkedActivityKeys.some(
      (key) => typeof key === "string" && key === mainActivityKey,
    );
  }

  return codesShareBudgetLine(activityCode, budgetCode);
}

function validateDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function validProviderType(value: string) {
  if (!value) return false;
  const saved = await getDb()
    .select({ value: systemMetadata.value })
    .from(systemMetadata)
    .where(eq(systemMetadata.category, "service_provider_type"));
  const allowed = saved.length
    ? saved.map((item) => item.value)
    : defaultMetadata.service_provider_type.map((item) => item.value);
  return allowed.includes(value);
}

async function validateContract(payload: ContractPayload) {
  const planYear = Number(payload.planYear);
  const amountMnt = Number(payload.amountMnt);
  const currency = payload.currency === "USD" ? "USD" : "MNT";
  const foreignAmountMinor = Number(payload.foreignAmountMinor ?? 0);
  const exchangeRateMnt = Number(payload.exchangeRateMnt ?? 1);
  const status = payload.status?.trim() ?? "";
  const startDate = payload.startDate?.trim() ?? "";
  const endDate = payload.endDate?.trim() ?? "";
  const payments = payload.payments ?? [];
  const allocations = normalizedFundingAllocations(payload);

  if (!Number.isInteger(planYear) || planYear < 2000 || planYear > 2100) {
    return "Choose a valid workplan year.";
  }
  if (!payload.contractNumber?.trim()) return "Enter the contract number.";
  if (!validStatuses.has(status)) return "Choose a valid contract status.";
  if (!allocations.length) return "Add at least one budget line allocation.";
  if (!payload.torName?.trim()) return "Enter the Terms of Reference name.";
  if (!payload.serviceProviderName?.trim()) return "Enter the service provider name.";
  if (!(await validProviderType(payload.serviceProviderType?.trim() ?? ""))) {
    return "Choose a valid service provider type.";
  }
  if (!validateDate(startDate) || !validateDate(endDate) || endDate < startDate) {
    return "Choose valid contract dates; the end date must be after the start date.";
  }
  if (!Number.isSafeInteger(amountMnt) || amountMnt <= 0) {
    return "Enter a whole tugrik contract amount greater than zero.";
  }
  if (
    currency === "USD" &&
    (!Number.isSafeInteger(foreignAmountMinor) ||
      foreignAmountMinor <= 0 ||
      !Number.isSafeInteger(exchangeRateMnt) ||
      exchangeRateMnt <= 0 ||
      Math.round((foreignAmountMinor / 100) * exchangeRateMnt) !== amountMnt)
  ) {
    return "Enter a valid USD amount and the signed exchange rate.";
  }
  if (!payments.length) return "Add at least one payment installment.";

  let allocationTotal = 0;
  const fundingTargets = new Set<string>();
  for (const allocation of allocations) {
    const budgetKey = allocation.budgetKey?.trim() ?? "";
    const activityKey = allocation.activityKey?.trim() ?? "";
    const allocationAmount = Number(allocation.amountMnt);
    const key = fundingTargetKey(budgetKey, activityKey);
    if (!budgetKey || !activityKey) {
      return "Choose a budget line and workplan activity for every allocation.";
    }
    if (fundingTargets.has(key)) {
      return "Each budget line and workplan activity combination can be used only once per contract.";
    }
    if (!Number.isSafeInteger(allocationAmount) || allocationAmount <= 0) {
      return "Each budget line allocation needs a whole tugrik amount greater than zero.";
    }
    if (!(await validateTarget(planYear, budgetKey, activityKey))) {
      return "Choose activities that belong to their selected budget lines.";
    }
    fundingTargets.add(key);
    allocationTotal += allocationAmount;
  }
  if (allocationTotal !== amountMnt) {
    return "Budget line allocations must add up exactly to the total contract amount.";
  }

  let amountTotal = 0;
  let percentageTotal = 0;
  let foreignAmountTotal = 0;
  const scheduledByFundingTarget = new Map<string, number>();
  for (const payment of payments) {
    const paymentAmount = Number(payment.amountMnt);
    const percentage = Number(payment.percentage);
    if (!payment.label?.trim() || !payment.deliverable?.trim()) {
      return "Each payment needs a label and deliverable.";
    }
    if (!validateDate(payment.dueDate?.trim() ?? "")) {
      return "Choose a valid due date for every payment.";
    }
    if (!Number.isSafeInteger(paymentAmount) || paymentAmount <= 0) {
      return "Each payment needs a whole tugrik amount greater than zero.";
    }
    if (!Number.isInteger(percentage) || percentage <= 0 || percentage > 100) {
      return "Each payment percentage must be a whole number between 1 and 100.";
    }
    if (payment.paid && !validateDate(payment.paidAt?.trim() ?? "")) {
      return "Paid installments need a valid paid date.";
    }
    amountTotal += paymentAmount;
    percentageTotal += percentage;
    foreignAmountTotal += Number(payment.foreignAmountMinor ?? 0);

    const paymentAllocations = normalizedPaymentAllocations(payment, allocations);
    if (!paymentAllocations.length) {
      return "Split every payment across the contract budget lines.";
    }
    const paymentTargets = new Set<string>();
    let paymentAllocationTotal = 0;
    for (const allocation of paymentAllocations) {
      const key = fundingTargetKey(
        allocation.budgetKey?.trim() ?? "",
        allocation.activityKey?.trim() ?? "",
      );
      const allocationAmount = Number(allocation.amountMnt);
      if (!fundingTargets.has(key) || paymentTargets.has(key)) {
        return "Each payment split must use a unique budget line and workplan activity combination from this contract.";
      }
      if (!Number.isSafeInteger(allocationAmount) || allocationAmount <= 0) {
        return "Each payment budget line split needs a whole tugrik amount greater than zero.";
      }
      paymentTargets.add(key);
      paymentAllocationTotal += allocationAmount;
      scheduledByFundingTarget.set(
        key,
        (scheduledByFundingTarget.get(key) ?? 0) + allocationAmount,
      );
    }
    if (paymentAllocationTotal !== paymentAmount) {
      return "Each payment budget line split must add up exactly to that payment amount.";
    }
  }
  if (amountTotal !== amountMnt) {
    return "Payment amounts must add up exactly to the total contract amount.";
  }
  if (percentageTotal !== 100) {
    return "Payment percentages must add up to 100%.";
  }
  if (currency === "USD" && foreignAmountTotal !== foreignAmountMinor) {
    return "USD payment amounts must add up exactly to the USD contract amount.";
  }
  for (const allocation of allocations) {
    const key = fundingTargetKey(
      allocation.budgetKey?.trim() ?? "",
      allocation.activityKey?.trim() ?? "",
    );
    if ((scheduledByFundingTarget.get(key) ?? 0) !== Number(allocation.amountMnt)) {
      return "Payment budget line splits must fully distribute every contract budget line allocation.";
    }
  }
  return "";
}

async function approvedBudgetAmounts(planYear: number) {
  const amounts = new Map<string, number>();
  if (planYear === 2026) {
    for (const line of workplan.budgetLines) {
      amounts.set(line.id, Math.round(Number(line.budgetMntMillion) * 1_000_000));
    }
  }
  const records = await getDb()
    .select()
    .from(workplanRecords)
    .where(
      and(
        eq(workplanRecords.planYear, planYear),
        eq(workplanRecords.recordType, "budget"),
      ),
    );
  for (const record of records) {
    if (record.isDeleted) {
      amounts.delete(record.recordKey);
      continue;
    }
    const payload = safePayload(record.payload);
    amounts.set(
      record.recordKey,
      Math.round(Number(payload.budgetMntMillion ?? 0) * 1_000_000),
    );
  }
  return amounts;
}

async function validateFundingCapacity(
  payload: ContractPayload,
  excludeContractId = "",
) {
  const planYear = Number(payload.planYear);
  const proposedAllocations = normalizedFundingAllocations(payload);
  const db = getDb();
  const [approvedBudgets, manualRows, contractRows, fundingRows, paymentRows, paymentAllocationRows, activityBudgetRows] =
    await Promise.all([
      approvedBudgetAmounts(planYear),
      db.select().from(financeEntries),
      db.select().from(contracts).where(eq(contracts.planYear, planYear)),
      db.select().from(contractFundingAllocations),
      db.select().from(contractPayments),
      db.select().from(contractPaymentAllocations),
      db.select().from(budgetAllocations).where(eq(budgetAllocations.planYear, planYear)),
    ]);

  const usedByBudget = new Map<string, number>();
  const usedByTarget = new Map<string, number>();
  const addUsage = (budgetKey: string, activityKey: string, amount: number) => {
    if (!amount) return;
    usedByBudget.set(budgetKey, (usedByBudget.get(budgetKey) ?? 0) + amount);
    const key = fundingTargetKey(budgetKey, activityKey);
    usedByTarget.set(key, (usedByTarget.get(key) ?? 0) + amount);
  };

  for (const entry of manualRows) {
    addUsage(entry.budgetKey, entry.activityKey, entry.amountMnt);
  }

  for (const contract of contractRows) {
    if (contract.id === excludeContractId) continue;
    const contractFunding = fundingRows.filter((item) => item.contractId === contract.id);
    if (contract.status !== "closed") {
      if (contractFunding.length) {
        for (const allocation of contractFunding) {
          addUsage(allocation.budgetKey, allocation.activityKey, allocation.amountMnt);
        }
      } else {
        addUsage(contract.budgetKey, contract.activityKey, contract.amountMnt);
      }
      continue;
    }

    const paidPaymentIds = new Set(
      paymentRows
        .filter((payment) => payment.contractId === contract.id && Boolean(payment.paid))
        .map((payment) => payment.id),
    );
    if (contractFunding.length) {
      const fundingById = new Map(contractFunding.map((item) => [item.id, item]));
      for (const allocation of paymentAllocationRows) {
        if (!paidPaymentIds.has(allocation.paymentId)) continue;
        const funding = fundingById.get(allocation.fundingAllocationId);
        if (funding) addUsage(funding.budgetKey, funding.activityKey, allocation.amountMnt);
      }
    } else {
      const paid = paymentRows
        .filter((payment) => paidPaymentIds.has(payment.id))
        .reduce((total, payment) => total + payment.amountMnt, 0);
      addUsage(contract.budgetKey, contract.activityKey, paid);
    }
  }

  if (payload.status === "closed") {
    const proposedByTarget = new Map<string, number>();
    for (const payment of payload.payments ?? []) {
      if (!payment.paid) continue;
      for (const allocation of normalizedPaymentAllocations(payment, proposedAllocations)) {
        const key = fundingTargetKey(
          allocation.budgetKey?.trim() ?? "",
          allocation.activityKey?.trim() ?? "",
        );
        proposedByTarget.set(key, (proposedByTarget.get(key) ?? 0) + Number(allocation.amountMnt));
      }
    }
    for (const allocation of proposedAllocations) {
      const budgetKey = allocation.budgetKey!.trim();
      const activityKey = allocation.activityKey!.trim();
      addUsage(
        budgetKey,
        activityKey,
        proposedByTarget.get(fundingTargetKey(budgetKey, activityKey)) ?? 0,
      );
    }
  } else {
    for (const allocation of proposedAllocations) {
      addUsage(
        allocation.budgetKey!.trim(),
        allocation.activityKey!.trim(),
        Number(allocation.amountMnt),
      );
    }
  }

  const warnings = new Set<string>();
  for (const allocation of proposedAllocations) {
    const budgetKey = allocation.budgetKey!.trim();
    const approved = approvedBudgets.get(budgetKey) ?? 0;
    const used = usedByBudget.get(budgetKey) ?? 0;
    if (approved <= 0) {
      warnings.add(
        "A selected budget line has no approved budget. Continuing will show its full used amount as a negative remaining balance.",
      );
    } else if (used > approved) {
      warnings.add(
        `This contract would exceed an approved budget by ${(used - approved).toLocaleString("en-US")} MNT. The remaining balance will be shown as negative.`,
      );
    }

    const targetKey = fundingTargetKey(budgetKey, allocation.activityKey!.trim());
    const targetBudget = activityBudgetRows.find(
      (item) => fundingTargetKey(item.budgetKey, item.activityKey) === targetKey,
    );
    if (targetBudget && (usedByTarget.get(targetKey) ?? 0) > targetBudget.amountMnt) {
      warnings.add(
        `Contract funding for a workplan item would exceed its ${targetBudget.amountMnt.toLocaleString("en-US")} MNT allocation. Its remaining balance will be shown as negative.`,
      );
    }
  }
  return Array.from(warnings).join(" ");
}

async function nestedContracts(planYear: number) {
  const db = getDb();
  const [contractRows, paymentRows, fundingRows, paymentAllocationRows] = await Promise.all([
    db
      .select()
      .from(contracts)
      .where(eq(contracts.planYear, planYear))
      .orderBy(desc(contracts.startDate), asc(contracts.contractNumber)),
    db
      .select()
      .from(contractPayments)
      .orderBy(asc(contractPayments.contractId), asc(contractPayments.sequence)),
    db.select().from(contractFundingAllocations),
    db.select().from(contractPaymentAllocations),
  ]);
  const ids = new Set(contractRows.map((contract) => contract.id));
  const relevantPayments = paymentRows.filter((payment) => ids.has(payment.contractId));
  return contractRows.map((contract) => {
    const savedAllocations = fundingRows.filter((item) => item.contractId === contract.id);
    const allocations = savedAllocations.length
      ? savedAllocations
      : [
          {
            id: `legacy:${contract.id}`,
            contractId: contract.id,
            budgetKey: contract.budgetKey,
            activityKey: contract.activityKey,
            amountMnt: contract.amountMnt,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
          },
        ];
    const payments = relevantPayments
      .filter((payment) => payment.contractId === contract.id)
      .map((payment) => {
        const saved = paymentAllocationRows.filter(
          (allocation) => allocation.paymentId === payment.id,
        );
        const paymentAllocations = saved.length
          ? saved.map((allocation) => {
              const funding = allocations.find(
                (item) => item.id === allocation.fundingAllocationId,
              );
              return {
                ...allocation,
                budgetKey: funding?.budgetKey ?? "",
                activityKey: funding?.activityKey ?? "",
              };
            })
          : allocations.length === 1
            ? [
                {
                  id: `legacy:${payment.id}`,
                  contractId: contract.id,
                  paymentId: payment.id,
                  fundingAllocationId: allocations[0].id,
                  budgetKey: allocations[0].budgetKey,
                  activityKey: allocations[0].activityKey,
                  amountMnt: payment.amountMnt,
                  createdAt: payment.updatedAt,
                  updatedAt: payment.updatedAt,
                },
              ]
            : [];
        return { ...payment, allocations: paymentAllocations };
      });
    return { ...contract, allocations, payments };
  });
}

function errorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : "";
  if (text.includes("UNIQUE") || text.includes("ux_contracts_year_number")) {
    return "That contract number already exists in this workplan year.";
  }
  if (text.includes("no such table")) {
    return "Contract management is being prepared. Please try again shortly.";
  }
  return "The contract could not be saved.";
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const year = Number(new URL(request.url).searchParams.get("year") ?? 2026);
    if (!Number.isInteger(year)) {
      return Response.json({ error: "Choose a valid workplan year." }, { status: 400 });
    }
    return Response.json({ contracts: await nestedContracts(year) });
  } catch (error) {
    console.error("Unable to load contracts", error);
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as ContractPayload;
    const validationError = await validateContract(payload);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    const planYear = Number(payload.planYear);
    const capacityWarning = await validateFundingCapacity(payload);
    if (capacityWarning && !payload.allowOverBudget) {
      return Response.json(
        {
          error: capacityWarning,
          warning: capacityWarning,
          requiresConfirmation: true,
        },
        { status: 409 },
      );
    }
    const normalizedAllocations = normalizedFundingAllocations(payload);
    const primaryAllocation = normalizedAllocations[0];
    const budgetKey = primaryAllocation.budgetKey!.trim();
    const activityKey = primaryAllocation.activityKey!.trim();

    const now = new Date().toISOString();
    const updatedBy = session.email;
    const id = crypto.randomUUID();
    const db = getDb();
    await db.insert(contracts).values({
      id,
      planYear,
      contractNumber: payload.contractNumber!.trim().slice(0, 200),
      status: payload.status!.trim(),
      budgetKey,
      activityKey,
      torName: payload.torName!.trim().slice(0, 2000),
      serviceProviderName: payload.serviceProviderName!.trim().slice(0, 500),
      serviceProviderType: payload.serviceProviderType!.trim(),
      startDate: payload.startDate!.trim(),
      endDate: payload.endDate!.trim(),
      amountMnt: Number(payload.amountMnt),
      currency: payload.currency === "USD" ? "USD" : "MNT",
      foreignAmountMinor: payload.currency === "USD" ? Number(payload.foreignAmountMinor) : 0,
      exchangeRateMnt: payload.currency === "USD" ? Number(payload.exchangeRateMnt) : 1,
      transferredFromYear: 0,
      createdAt: now,
      updatedAt: now,
      updatedBy,
    });
    const fundingRows = normalizedAllocations.map((allocation) => ({
      id: crypto.randomUUID(),
      contractId: id,
      budgetKey: allocation.budgetKey!.trim(),
      activityKey: allocation.activityKey!.trim(),
      amountMnt: Number(allocation.amountMnt),
      createdAt: now,
      updatedAt: now,
    }));
    const fundingByTarget = new Map(
      fundingRows.map((allocation) => [
        fundingTargetKey(allocation.budgetKey, allocation.activityKey),
        allocation,
      ]),
    );
    const paymentRows = payload.payments!.map((payment, index) => ({
        id: crypto.randomUUID(),
        contractId: id,
        sequence: index + 1,
        label: payment.label!.trim().slice(0, 200),
        dueDate: payment.dueDate!.trim(),
        deliverable: payment.deliverable!.trim().slice(0, 2000),
        percentage: Number(payment.percentage),
        amountMnt: Number(payment.amountMnt),
        foreignAmountMinor:
          payload.currency === "USD" ? Number(payment.foreignAmountMinor ?? 0) : 0,
        paid: payment.paid ? 1 : 0,
        paidAt: payment.paid ? payment.paidAt!.trim() : "",
        updatedAt: now,
      }));
    await db.insert(contractPayments).values(paymentRows);
    await db.insert(contractFundingAllocations).values(fundingRows);
    const paymentAllocationRows = paymentRows.flatMap((paymentRow, index) =>
      normalizedPaymentAllocations(payload.payments![index], normalizedAllocations).map(
        (allocation) => {
          const funding = fundingByTarget.get(
            fundingTargetKey(
              allocation.budgetKey!.trim(),
              allocation.activityKey!.trim(),
            ),
          )!;
          return {
            id: crypto.randomUUID(),
            contractId: id,
            paymentId: paymentRow.id,
            fundingAllocationId: funding.id,
            amountMnt: Number(allocation.amountMnt),
            createdAt: now,
            updatedAt: now,
          };
        },
      ),
    );
    await db.insert(contractPaymentAllocations).values(paymentAllocationRows);

    const [contract] = (await nestedContracts(planYear)).filter((item) => item.id === id);
    await writeAuditLog({
      entityType: "contract",
      entityKey: id,
      action: capacityWarning
        ? "created with over-budget confirmation"
        : "created",
      previousValue: null,
      newValue: snapshot("contract", {
        contract: { ...contract, payments: undefined, allocations: undefined },
        allocations: contract.allocations,
        payments: contract.payments,
      }),
      changedBy: updatedBy,
    });
    return Response.json({ contract }, { status: 201 });
  } catch (error) {
    console.error("Unable to create contract", error);
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as ContractPayload;
    const id = payload.id?.trim() ?? "";
    const validationError = await validateContract(payload);
    if (!id) return Response.json({ error: "Choose a valid contract." }, { status: 400 });
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    const planYear = Number(payload.planYear);
    const normalizedAllocations = normalizedFundingAllocations(payload);
    const primaryAllocation = normalizedAllocations[0];
    const budgetKey = primaryAllocation.budgetKey!.trim();
    const activityKey = primaryAllocation.activityKey!.trim();

    const db = getDb();
    const [existing] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id))
      .limit(1);
    if (!existing) return Response.json({ error: "Contract not found." }, { status: 404 });
    const existingPayments = await db
      .select()
      .from(contractPayments)
      .where(eq(contractPayments.contractId, id));
    const [existingFunding, existingPaymentAllocations] = await Promise.all([
      db
        .select()
        .from(contractFundingAllocations)
        .where(eq(contractFundingAllocations.contractId, id)),
      db
        .select()
        .from(contractPaymentAllocations)
        .where(eq(contractPaymentAllocations.contractId, id)),
    ]);
    if (
      existingPayments.some((payment) => Boolean(payment.paid)) &&
      (existing.currency !== (payload.currency === "USD" ? "USD" : "MNT") ||
        existing.exchangeRateMnt !==
          (payload.currency === "USD" ? Number(payload.exchangeRateMnt) : 1))
    ) {
      return Response.json(
        { error: "Currency and exchange rate are locked after a payment is marked paid." },
        { status: 400 },
      );
    }
    const currentPayments = new Map(existingPayments.map((payment) => [payment.id, payment]));
    const existingFundingById = new Map(existingFunding.map((item) => [item.id, item]));
    for (const previous of existingPayments.filter((payment) => Boolean(payment.paid))) {
      const incoming = payload.payments!.find((payment) => payment.id === previous.id);
      if (
        !incoming ||
        Number(incoming.amountMnt) !== previous.amountMnt ||
        Number(incoming.percentage) !== previous.percentage ||
        incoming.dueDate?.trim() !== previous.dueDate ||
        incoming.deliverable?.trim() !== previous.deliverable ||
        incoming.label?.trim() !== previous.label ||
        Number(incoming.foreignAmountMinor ?? 0) !== previous.foreignAmountMinor
      ) {
        return Response.json(
          { error: "Paid installments are locked. Mark one unpaid before changing or removing it." },
          { status: 400 },
        );
      }
      const previousSplits = existingPaymentAllocations
        .filter((allocation) => allocation.paymentId === previous.id)
        .map((allocation) => {
          const funding = existingFundingById.get(allocation.fundingAllocationId);
          return {
            key: funding
              ? fundingTargetKey(funding.budgetKey, funding.activityKey)
              : "",
            amountMnt: allocation.amountMnt,
          };
        })
        .filter((item) => item.key)
        .sort((a, b) => a.key.localeCompare(b.key));
      const incomingSplits = incoming
        ? normalizedPaymentAllocations(incoming, normalizedAllocations)
            .map((allocation) => ({
              key: fundingTargetKey(
                allocation.budgetKey?.trim() ?? "",
                allocation.activityKey?.trim() ?? "",
              ),
              amountMnt: Number(allocation.amountMnt),
            }))
            .sort((a, b) => a.key.localeCompare(b.key))
        : [];
      if (
        previousSplits.length &&
        JSON.stringify(previousSplits) !== JSON.stringify(incomingSplits)
      ) {
        return Response.json(
          { error: "Paid payment budget line splits are locked. Mark the payment unpaid before changing them." },
          { status: 400 },
        );
      }
    }
    const capacityWarning = await validateFundingCapacity(payload, id);
    if (capacityWarning && !payload.allowOverBudget) {
      return Response.json(
        {
          error: capacityWarning,
          warning: capacityWarning,
          requiresConfirmation: true,
        },
        { status: 409 },
      );
    }
    const now = new Date().toISOString();
    const updatedBy = session.email;

    await db
      .update(contracts)
      .set({
        planYear,
        contractNumber: payload.contractNumber!.trim().slice(0, 200),
        status: payload.status!.trim(),
        budgetKey,
        activityKey,
        torName: payload.torName!.trim().slice(0, 2000),
        serviceProviderName: payload.serviceProviderName!.trim().slice(0, 500),
        serviceProviderType: payload.serviceProviderType!.trim(),
        startDate: payload.startDate!.trim(),
        endDate: payload.endDate!.trim(),
        amountMnt: Number(payload.amountMnt),
        currency: payload.currency === "USD" ? "USD" : "MNT",
        foreignAmountMinor: payload.currency === "USD" ? Number(payload.foreignAmountMinor) : 0,
        exchangeRateMnt: payload.currency === "USD" ? Number(payload.exchangeRateMnt) : 1,
        updatedAt: now,
        updatedBy,
      })
      .where(eq(contracts.id, id));
    const existingFundingByTarget = new Map(
      existingFunding.map((allocation) => [
        fundingTargetKey(allocation.budgetKey, allocation.activityKey),
        allocation,
      ]),
    );
    const fundingRows = normalizedAllocations.map((allocation) => {
      const key = fundingTargetKey(
        allocation.budgetKey!.trim(),
        allocation.activityKey!.trim(),
      );
      const previous = existingFundingByTarget.get(key);
      return {
        id: previous?.id ?? crypto.randomUUID(),
        contractId: id,
        budgetKey: allocation.budgetKey!.trim(),
        activityKey: allocation.activityKey!.trim(),
        amountMnt: Number(allocation.amountMnt),
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
    });
    const fundingByTarget = new Map(
      fundingRows.map((allocation) => [
        fundingTargetKey(allocation.budgetKey, allocation.activityKey),
        allocation,
      ]),
    );
    const paymentRows = payload.payments!.map((payment, index) => {
        const previous = payment.id ? currentPayments.get(payment.id) : undefined;
        const paid = previous ? previous.paid : payment.paid ? 1 : 0;
        const paidAt = previous ? previous.paidAt : payment.paid ? payment.paidAt!.trim() : "";
        return {
          id: payment.id || crypto.randomUUID(),
          contractId: id,
          sequence: index + 1,
          label: payment.label!.trim().slice(0, 200),
          dueDate: payment.dueDate!.trim(),
          deliverable: payment.deliverable!.trim().slice(0, 2000),
          percentage: Number(payment.percentage),
          amountMnt: Number(payment.amountMnt),
          foreignAmountMinor:
            payload.currency === "USD" ? Number(payment.foreignAmountMinor ?? 0) : 0,
          paid,
          paidAt,
          updatedAt: now,
        };
      });
    await db
      .delete(contractPaymentAllocations)
      .where(eq(contractPaymentAllocations.contractId, id));
    await db
      .delete(contractFundingAllocations)
      .where(eq(contractFundingAllocations.contractId, id));
    await db.delete(contractPayments).where(eq(contractPayments.contractId, id));
    await db.insert(contractPayments).values(paymentRows);
    await db.insert(contractFundingAllocations).values(fundingRows);
    await db.insert(contractPaymentAllocations).values(
      paymentRows.flatMap((paymentRow, index) =>
        normalizedPaymentAllocations(payload.payments![index], normalizedAllocations).map(
          (allocation) => {
            const target = fundingByTarget.get(
              fundingTargetKey(
                allocation.budgetKey!.trim(),
                allocation.activityKey!.trim(),
              ),
            )!;
            return {
              id: crypto.randomUUID(),
              contractId: id,
              paymentId: paymentRow.id,
              fundingAllocationId: target.id,
              amountMnt: Number(allocation.amountMnt),
              createdAt: now,
              updatedAt: now,
            };
          },
        ),
      ),
    );

    const [contract] = (await nestedContracts(planYear)).filter((item) => item.id === id);
    await writeAuditLog({
      entityType: "contract",
      entityKey: id,
      action: capacityWarning
        ? "updated with over-budget confirmation"
        : "updated",
      previousValue: snapshot("contract", {
        contract: existing,
        allocations: existingFunding,
        payments: existingPayments,
        paymentAllocations: existingPaymentAllocations,
      }),
      newValue: snapshot("contract", {
        contract: { ...contract, payments: undefined, allocations: undefined },
        allocations: contract.allocations,
        payments: contract.payments,
      }),
      changedBy: updatedBy,
    });
    return Response.json({ contract });
  } catch (error) {
    console.error("Unable to update contract", error);
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as {
      action?: string;
      id?: string;
      paymentId?: string;
      paid?: boolean;
      paidAt?: string;
      allowOverBudget?: boolean;
    };
    const db = getDb();
    const now = new Date().toISOString();

    if (payload.action === "close_contract") {
      const id = payload.id?.trim() ?? "";
      if (!id) return Response.json({ error: "Choose a valid contract." }, { status: 400 });
      const updatedBy = session.email;
      const [before] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
      const beforePayments = before
        ? await db.select().from(contractPayments).where(eq(contractPayments.contractId, id))
        : [];
      const [updated] = await db
        .update(contracts)
        .set({ status: "closed", updatedAt: now, updatedBy })
        .where(eq(contracts.id, id))
        .returning();
      if (!updated) return Response.json({ error: "Contract not found." }, { status: 404 });
      const [contract] = (await nestedContracts(updated.planYear)).filter((item) => item.id === id);
      await writeAuditLog({
        entityType: "contract",
        entityKey: id,
        action: "closed",
        previousValue: snapshot("contract", { contract: before, payments: beforePayments }),
        newValue: snapshot("contract", {
          contract: { ...contract, payments: undefined },
          payments: contract.payments,
        }),
        changedBy: updatedBy,
      });
      return Response.json({ contract });
    }

    if (payload.action === "set_payment_paid") {
      const paymentId = payload.paymentId?.trim() ?? "";
      const paidAt = payload.paid ? payload.paidAt?.trim() ?? "" : "";
      if (!paymentId || (payload.paid && !validateDate(paidAt))) {
        return Response.json({ error: "Choose a valid payment and paid date." }, { status: 400 });
      }
      const [payment] = await db
        .select()
        .from(contractPayments)
        .where(eq(contractPayments.id, paymentId))
        .limit(1);
      if (!payment) return Response.json({ error: "Payment not found." }, { status: 404 });
      const [parent] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, payment.contractId))
        .limit(1);
      if (!parent) return Response.json({ error: "Contract not found." }, { status: 404 });
      if (parent.status === "closed") {
        return Response.json(
          { error: "Reopen the contract before changing payment status." },
          { status: 400 },
        );
      }
      let capacityWarning = "";
      if (payload.paid) {
        const [currentContract] = (await nestedContracts(parent.planYear)).filter(
          (item) => item.id === parent.id,
        );
        if (currentContract) {
          capacityWarning = await validateFundingCapacity(
            {
              ...currentContract,
              payments: currentContract.payments.map((item) =>
                item.id === payment.id
                  ? { ...item, paid: true, paidAt }
                  : { ...item, paid: Boolean(item.paid) },
              ),
            },
            parent.id,
          );
        }
        if (capacityWarning && !payload.allowOverBudget) {
          return Response.json(
            {
              error: capacityWarning,
              warning: capacityWarning,
              requiresConfirmation: true,
            },
            { status: 409 },
          );
        }
      }
      await db
        .update(contractPayments)
        .set({ paid: payload.paid ? 1 : 0, paidAt, updatedAt: now })
        .where(eq(contractPayments.id, paymentId));
      const [contract] = (await nestedContracts(parent.planYear)).filter(
        (item) => item.id === parent.id,
      );
      const beforePayments = contract.payments.map((item) =>
        item.id === payment.id ? payment : item,
      );
      await writeAuditLog({
        entityType: "contract",
        entityKey: parent.id,
        action: payload.paid
          ? capacityWarning
            ? "marked payment paid with over-budget confirmation"
            : "marked payment paid"
          : "marked payment unpaid",
        previousValue: snapshot("contract", { contract: parent, payments: beforePayments }),
        newValue: snapshot("contract", {
          contract: { ...contract, payments: undefined },
          payments: contract.payments,
        }),
        changedBy: session.email,
      });
      return Response.json({ contract });
    }

    return Response.json({ error: "Choose a valid contract action." }, { status: 400 });
  } catch (error) {
    console.error("Unable to update contract status", error);
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { id?: unknown };
    const id = String(payload.id ?? "").trim();
    if (!id) {
      return Response.json({ error: "Choose a valid contract." }, { status: 400 });
    }
    const db = getDb();
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    if (!contract) {
      return Response.json({ error: "Contract not found." }, { status: 404 });
    }
    const [payments, documents, funding, paymentFunding] = await Promise.all([
      db.select().from(contractPayments).where(eq(contractPayments.contractId, id)),
      db.select().from(paymentDocuments).where(eq(paymentDocuments.contractId, id)),
      db
        .select()
        .from(contractFundingAllocations)
        .where(eq(contractFundingAllocations.contractId, id)),
      db
        .select()
        .from(contractPaymentAllocations)
        .where(eq(contractPaymentAllocations.contractId, id)),
    ]);
    for (const document of documents) {
      await getBucket().delete(document.objectKey);
    }
    await db.delete(paymentDocuments).where(eq(paymentDocuments.contractId, id));
    await db
      .delete(contractPaymentAllocations)
      .where(eq(contractPaymentAllocations.contractId, id));
    await db
      .delete(contractFundingAllocations)
      .where(eq(contractFundingAllocations.contractId, id));
    await db.delete(contractPayments).where(eq(contractPayments.contractId, id));
    await db.delete(contracts).where(eq(contracts.id, id));
    await writeAuditLog({
      entityType: "contract",
      entityKey: id,
      action: "deleted",
      previousValue: snapshot("contract", {
        contract,
        allocations: funding,
        payments,
        paymentAllocations: paymentFunding,
      }),
      newValue: null,
      changedBy: session.email,
    });
    return Response.json({ deletedId: id });
  } catch (error) {
    console.error("Unable to delete contract", error);
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}
