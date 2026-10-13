import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { financeEntries, teamMembers, workplanRecords } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";
import { snapshot, writeAuditLog } from "@/lib/audit-log";
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
  let mainActivityKey = activityKey;

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

  const db = getDb();
  const [budgetRecord] = await db
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
            eq(workplanRecords.recordType, "activity"),
            eq(workplanRecords.recordKey, record.parentKey),
            eq(workplanRecords.isDeleted, 0),
          ),
        )
        .limit(1);
      activityCode = String(parent ? safePayload(parent.payload).code ?? "" : "");
    }
  }

  if (Array.isArray(budgetPayload.linkedActivityKeys)) {
    return budgetPayload.linkedActivityKeys.some(
      (key) => typeof key === "string" && key === mainActivityKey,
    );
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

async function addCreatorNames<
  T extends { createdBy: string },
>(entries: T[]) {
  const members = await getDb()
    .select({ name: teamMembers.name, email: teamMembers.email })
    .from(teamMembers)
    .where(eq(teamMembers.isDeleted, 0));
  const namesByEmail = new Map(
    members
      .filter((member) => member.email)
      .map((member) => [member.email.toLocaleLowerCase(), member.name]),
  );
  return entries.map((entry) => ({
    ...entry,
    createdByName:
      namesByEmail.get(entry.createdBy.toLocaleLowerCase()) || entry.createdBy,
  }));
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const entries = await getDb()
      .select()
      .from(financeEntries)
      .orderBy(desc(financeEntries.entryDate), desc(financeEntries.id));
    return Response.json({ entries: await addCreatorNames(entries) });
  } catch (error) {
    console.error("Unable to load finance entries", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as {
      budgetKey?: string;
      activityKey?: string;
      entryType?: string;
      amountMnt?: number;
      entryDate?: string;
      description?: string;
      vendor?: string;
      overBudgetConfirmed?: boolean;
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

    const createdBy = session.email;
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

    await writeAuditLog({
      entityType: "finance",
      entityKey: String(entry.id),
      action: payload.overBudgetConfirmed
        ? "created with over-budget confirmation"
        : "created",
      previousValue: null,
      newValue: snapshot("finance_entry", entry),
      changedBy: session.email,
    });

    return Response.json(
      { entry: (await addCreatorNames([entry]))[0] },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to save finance entry", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as {
      id?: number;
      budgetKey?: string;
      activityKey?: string;
      entryType?: string;
      amountMnt?: number;
      entryDate?: string;
      description?: string;
      vendor?: string;
      overBudgetConfirmed?: boolean;
    };
    const id = Number(payload.id);
    const budgetKey = payload.budgetKey?.trim() ?? "";
    const activityKey = payload.activityKey?.trim() ?? "";
    const entryType = payload.entryType?.trim() ?? "";
    const amountMnt = Number(payload.amountMnt);
    const entryDate = payload.entryDate?.trim() ?? "";

    if (!Number.isSafeInteger(id) || id <= 0) {
      return Response.json({ error: "Choose a valid finance entry." }, { status: 400 });
    }
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

    const db = getDb();
    const [existing] = await db
      .select()
      .from(financeEntries)
      .where(eq(financeEntries.id, id))
      .limit(1);
    if (!existing) {
      return Response.json({ error: "Finance entry not found." }, { status: 404 });
    }
    const [entry] = await db
      .update(financeEntries)
      .set({
        budgetKey,
        activityKey,
        entryType,
        amountMnt,
        entryDate,
        description: (payload.description ?? "").trim().slice(0, 2000),
        vendor: (payload.vendor ?? "").trim().slice(0, 500),
      })
      .where(eq(financeEntries.id, id))
      .returning();

    await writeAuditLog({
      entityType: "finance",
      entityKey: String(entry.id),
      action: payload.overBudgetConfirmed
        ? "updated with over-budget confirmation"
        : "updated",
      previousValue: snapshot("finance_entry", existing),
      newValue: snapshot("finance_entry", entry),
      changedBy: session.email,
    });
    return Response.json({ entry: (await addCreatorNames([entry]))[0] });
  } catch (error) {
    console.error("Unable to update finance entry", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { id?: number };
    const id = Number(payload.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return Response.json({ error: "Choose a valid finance entry." }, { status: 400 });
    }
    const db = getDb();
    const [existing] = await db
      .select()
      .from(financeEntries)
      .where(eq(financeEntries.id, id))
      .limit(1);
    if (!existing) {
      return Response.json({ error: "Finance entry not found." }, { status: 404 });
    }
    const [deleted] = await db
      .delete(financeEntries)
      .where(eq(financeEntries.id, id))
      .returning({ id: financeEntries.id });
    await writeAuditLog({
      entityType: "finance",
      entityKey: String(deleted.id),
      action: "removed",
      previousValue: snapshot("finance_entry", existing),
      newValue: null,
      changedBy: session.email,
    });
    return Response.json({ deletedId: deleted.id });
  } catch (error) {
    console.error("Unable to remove finance entry", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}
