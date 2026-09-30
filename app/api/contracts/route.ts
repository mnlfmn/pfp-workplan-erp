import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contractPayments, contracts, workplanRecords } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";
import workplan from "@/lib/workplan-data.json";

const validStatuses = new Set(["draft", "active", "completed", "closed"]);
const validProviderTypes = new Set([
  "Individual consultant",
  "Consulting firm",
  "Supplier",
  "Contractor",
  "NGO / CSO",
  "Government entity",
  "Other",
]);

type PaymentPayload = {
  id?: string;
  label?: string;
  dueDate?: string;
  deliverable?: string;
  percentage?: number;
  amountMnt?: number;
  paid?: boolean;
  paidAt?: string;
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
  payments?: PaymentPayload[];
};

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
  if (planYear === 2026) {
    budgetCode = workplan.budgetLines.find((line) => line.id === budgetKey)?.code ?? "";
    for (const activity of workplan.activities) {
      if (activity.id === activityKey) activityCode = activity.code;
      if (activity.subactivities.some((item) => item.id === activityKey)) {
        activityCode = activity.code;
      }
    }
  }

  const db = getDb();
  if (!budgetCode) {
    const [record] = await db
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
    budgetCode = String(record ? safePayload(record.payload).code ?? "" : "");
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
    } else if (record?.recordType === "subactivity" && record.parentKey) {
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
      activityCode = String(parent ? safePayload(parent.payload).code ?? "" : "");
    }
  }

  return codesShareBudgetLine(activityCode, budgetCode);
}

function validateDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateContract(payload: ContractPayload) {
  const planYear = Number(payload.planYear);
  const amountMnt = Number(payload.amountMnt);
  const status = payload.status?.trim() ?? "";
  const startDate = payload.startDate?.trim() ?? "";
  const endDate = payload.endDate?.trim() ?? "";
  const payments = payload.payments ?? [];

  if (!Number.isInteger(planYear) || planYear < 2000 || planYear > 2100) {
    return "Choose a valid workplan year.";
  }
  if (!payload.contractNumber?.trim()) return "Enter the contract number.";
  if (!validStatuses.has(status)) return "Choose a valid contract status.";
  if (!payload.budgetKey?.trim() || !payload.activityKey?.trim()) {
    return "Choose a workplan activity or sub-activity.";
  }
  if (!payload.torName?.trim()) return "Enter the Terms of Reference name.";
  if (!payload.serviceProviderName?.trim()) return "Enter the service provider name.";
  if (!validProviderTypes.has(payload.serviceProviderType?.trim() ?? "")) {
    return "Choose a valid service provider type.";
  }
  if (!validateDate(startDate) || !validateDate(endDate) || endDate < startDate) {
    return "Choose valid contract dates; the end date must be after the start date.";
  }
  if (!Number.isSafeInteger(amountMnt) || amountMnt <= 0) {
    return "Enter a whole tugrik contract amount greater than zero.";
  }
  if (!payments.length) return "Add at least one payment installment.";

  let amountTotal = 0;
  let percentageTotal = 0;
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
  }
  if (amountTotal !== amountMnt) {
    return "Payment amounts must add up exactly to the total contract amount.";
  }
  if (percentageTotal !== 100) {
    return "Payment percentages must add up to 100%.";
  }
  return "";
}

async function nestedContracts(planYear: number) {
  const db = getDb();
  const [contractRows, paymentRows] = await Promise.all([
    db
      .select()
      .from(contracts)
      .where(eq(contracts.planYear, planYear))
      .orderBy(desc(contracts.startDate), asc(contracts.contractNumber)),
    db
      .select()
      .from(contractPayments)
      .orderBy(asc(contractPayments.contractId), asc(contractPayments.sequence)),
  ]);
  const ids = new Set(contractRows.map((contract) => contract.id));
  const relevantPayments = paymentRows.filter((payment) => ids.has(payment.contractId));
  return contractRows.map((contract) => ({
    ...contract,
    payments: relevantPayments.filter((payment) => payment.contractId === contract.id),
  }));
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
    const validationError = validateContract(payload);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    const planYear = Number(payload.planYear);
    const budgetKey = payload.budgetKey!.trim();
    const activityKey = payload.activityKey!.trim();
    if (!(await validateTarget(planYear, budgetKey, activityKey))) {
      return Response.json(
        { error: "Choose an activity that belongs to the selected budget line." },
        { status: 400 },
      );
    }

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
      createdAt: now,
      updatedAt: now,
      updatedBy,
    });
    await db.insert(contractPayments).values(
      payload.payments!.map((payment, index) => ({
        id: crypto.randomUUID(),
        contractId: id,
        sequence: index + 1,
        label: payment.label!.trim().slice(0, 200),
        dueDate: payment.dueDate!.trim(),
        deliverable: payment.deliverable!.trim().slice(0, 2000),
        percentage: Number(payment.percentage),
        amountMnt: Number(payment.amountMnt),
        paid: payment.paid ? 1 : 0,
        paidAt: payment.paid ? payment.paidAt!.trim() : "",
        updatedAt: now,
      })),
    );

    const [contract] = (await nestedContracts(planYear)).filter((item) => item.id === id);
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
    const validationError = validateContract(payload);
    if (!id) return Response.json({ error: "Choose a valid contract." }, { status: 400 });
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    const planYear = Number(payload.planYear);
    const budgetKey = payload.budgetKey!.trim();
    const activityKey = payload.activityKey!.trim();
    if (!(await validateTarget(planYear, budgetKey, activityKey))) {
      return Response.json(
        { error: "Choose an activity that belongs to the selected budget line." },
        { status: 400 },
      );
    }

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
    const currentPayments = new Map(existingPayments.map((payment) => [payment.id, payment]));
    for (const previous of existingPayments.filter((payment) => Boolean(payment.paid))) {
      const incoming = payload.payments!.find((payment) => payment.id === previous.id);
      if (
        !incoming ||
        Number(incoming.amountMnt) !== previous.amountMnt ||
        Number(incoming.percentage) !== previous.percentage ||
        incoming.dueDate?.trim() !== previous.dueDate ||
        incoming.deliverable?.trim() !== previous.deliverable ||
        incoming.label?.trim() !== previous.label
      ) {
        return Response.json(
          { error: "Paid installments are locked. Mark one unpaid before changing or removing it." },
          { status: 400 },
        );
      }
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
        updatedAt: now,
        updatedBy,
      })
      .where(eq(contracts.id, id));
    await db.delete(contractPayments).where(eq(contractPayments.contractId, id));
    await db.insert(contractPayments).values(
      payload.payments!.map((payment, index) => {
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
          paid,
          paidAt,
          updatedAt: now,
        };
      }),
    );

    const [contract] = (await nestedContracts(planYear)).filter((item) => item.id === id);
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
    };
    const db = getDb();
    const now = new Date().toISOString();

    if (payload.action === "close_contract") {
      const id = payload.id?.trim() ?? "";
      if (!id) return Response.json({ error: "Choose a valid contract." }, { status: 400 });
      const updatedBy = session.email;
      const [updated] = await db
        .update(contracts)
        .set({ status: "closed", updatedAt: now, updatedBy })
        .where(eq(contracts.id, id))
        .returning();
      if (!updated) return Response.json({ error: "Contract not found." }, { status: 404 });
      const [contract] = (await nestedContracts(updated.planYear)).filter((item) => item.id === id);
      return Response.json({ contract });
    }

    if (payload.action === "set_payment_paid") {
      const paymentId = payload.paymentId?.trim() ?? "";
      const paidAt = payload.paid ? payload.paidAt?.trim() || now.slice(0, 10) : "";
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
      await db
        .update(contractPayments)
        .set({ paid: payload.paid ? 1 : 0, paidAt, updatedAt: now })
        .where(eq(contractPayments.id, paymentId));
      const [contract] = (await nestedContracts(parent.planYear)).filter(
        (item) => item.id === parent.id,
      );
      return Response.json({ contract });
    }

    return Response.json({ error: "Choose a valid contract action." }, { status: 400 });
  } catch (error) {
    console.error("Unable to update contract status", error);
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}
