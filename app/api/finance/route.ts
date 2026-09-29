import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { financeEntries, workplanRecords } from "@/db/schema";
import workplan from "@/lib/workplan-data.json";

const validBudgetKeys = new Set(workplan.budgetLines.map((line) => line.id));
const validEntryTypes = new Set(["commitment", "expenditure"]);

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

function codesShareBudgetLine(activityCode: string, budgetCode: string) {
  const normalize = (value: string) =>
    value.replace(/\s/g, "").replace(/\.+$/, "");
  const activity = normalize(activityCode);
  const budget = normalize(budgetCode);
  return Boolean(
    activity &&
      budget &&
      (activity === budget ||
        activity.startsWith(`${budget}.`) ||
        budget.startsWith(`${activity}.`)),
  );
}

async function isValidBudgetKey(budgetKey: string) {
  if (validBudgetKeys.has(budgetKey)) return true;
  const rows = await getDb()
    .select({ key: workplanRecords.recordKey, deleted: workplanRecords.isDeleted })
    .from(workplanRecords)
    .where(
      and(
        eq(workplanRecords.recordType, "budget"),
        eq(workplanRecords.recordKey, budgetKey),
      ),
    )
    .limit(1);
  return Boolean(rows[0] && !rows[0].deleted);
}

async function isValidFinanceTarget(budgetKey: string, activityKey: string) {
  if (!activityKey) return false;
  let budgetCode =
    workplan.budgetLines.find((line) => line.id === budgetKey)?.code ?? "";
  let activityCode = "";

  for (const activity of workplan.activities) {
    if (activity.id === activityKey) activityCode = activity.code;
    if (activity.subactivities.some((item) => item.id === activityKey)) {
      activityCode = activity.code;
    }
  }

  const db = getDb();
  if (!budgetCode) {
    const [record] = await db
      .select()
      .from(workplanRecords)
      .where(
        and(
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

function message(error: unknown) {
  const text = error instanceof Error ? error.message : "Unexpected error";
  if (text.includes("no such table") || text.includes("finance_entries")) {
    return "Finance tracking is being prepared. Budget data remains available.";
  }
  return "Finance entries are temporarily unavailable.";
}

export async function GET() {
  try {
    const entries = await getDb()
      .select()
      .from(financeEntries)
      .orderBy(desc(financeEntries.entryDate), desc(financeEntries.id));
    return Response.json({ entries });
  } catch (error) {
    console.error("Unable to load finance entries", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      budgetKey?: string;
      activityKey?: string;
      entryType?: string;
      amountMnt?: number;
      entryDate?: string;
      description?: string;
      vendor?: string;
    };
    const budgetKey = payload.budgetKey?.trim() ?? "";
    const activityKey = payload.activityKey?.trim() ?? "";
    const entryType = payload.entryType?.trim() ?? "";
    const amountMnt = Number(payload.amountMnt);
    const entryDate = payload.entryDate?.trim() ?? "";

    if (!(await isValidBudgetKey(budgetKey))) {
      return Response.json({ error: "Choose a valid budget line." }, { status: 400 });
    }
    if (!(await isValidFinanceTarget(budgetKey, activityKey))) {
      return Response.json(
        { error: "Choose an activity that belongs to this budget line." },
        { status: 400 },
      );
    }
    if (!validEntryTypes.has(entryType)) {
      return Response.json({ error: "Choose commitment or expenditure." }, { status: 400 });
    }
    if (!Number.isSafeInteger(amountMnt) || amountMnt <= 0) {
      return Response.json({ error: "Enter an amount greater than zero." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return Response.json({ error: "Choose a valid entry date." }, { status: 400 });
    }

    const createdBy =
      request.headers.get("oai-authenticated-user-email") ??
      request.headers.get("oai-authenticated-user-id") ??
      "";
    const [entry] = await getDb()
      .insert(financeEntries)
      .values({
        budgetKey,
        activityKey,
        entryType,
        amountMnt,
        entryDate,
        description: (payload.description ?? "").trim().slice(0, 2000),
        vendor: (payload.vendor ?? "").trim().slice(0, 500),
        createdAt: new Date().toISOString(),
        createdBy,
      })
      .returning();

    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Unable to save finance entry", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}
