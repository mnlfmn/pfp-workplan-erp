import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { budgetAllocations, workplanRecords } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";
import workplan from "@/lib/workplan-data.json";

const BASE_YEAR = 2026;

function allocationId(year: number, budgetKey: string, activityKey: string) {
  return `allocation:${year}:${budgetKey}:${activityKey}`;
}

async function validKeys(year: number) {
  const records = await getDb()
    .select()
    .from(workplanRecords)
    .where(eq(workplanRecords.planYear, year));
  const budgetKeys = new Set<string>();
  const activityKeys = new Set<string>();
  if (year === BASE_YEAR) {
    for (const line of workplan.budgetLines) budgetKeys.add(line.id);
    for (const activity of workplan.activities) {
      activityKeys.add(activity.id);
      for (const subactivity of activity.subactivities) activityKeys.add(subactivity.id);
    }
  }
  for (const record of records) {
    const target = record.recordType === "budget" ? budgetKeys : activityKeys;
    if (!target || !["activity", "subactivity", "budget"].includes(record.recordType)) {
      continue;
    }
    if (record.isDeleted) target.delete(record.recordKey);
    else target.add(record.recordKey);
  }
  return { budgetKeys, activityKeys };
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

async function allocationContext(year: number) {
  const records = await getDb()
    .select()
    .from(workplanRecords)
    .where(eq(workplanRecords.planYear, year));
  const budgetAmount = new Map<string, number>();
  const parentByActivity = new Map<string, string>();
  const mainActivityKeys = new Set<string>();
  if (year === BASE_YEAR) {
    for (const line of workplan.budgetLines) {
      budgetAmount.set(line.id, Number(line.budgetMntMillion) * 1_000_000);
    }
    for (const activity of workplan.activities) {
      mainActivityKeys.add(activity.id);
      for (const subactivity of activity.subactivities) {
        parentByActivity.set(subactivity.id, activity.id);
      }
    }
  }
  for (const record of records) {
    if (record.isDeleted) {
      budgetAmount.delete(record.recordKey);
      mainActivityKeys.delete(record.recordKey);
      parentByActivity.delete(record.recordKey);
      continue;
    }
    const payload = safePayload(record.payload);
    if (record.recordType === "budget") {
      budgetAmount.set(
        record.recordKey,
        Number(payload.budgetMntMillion ?? 0) * 1_000_000,
      );
    } else if (record.recordType === "activity") {
      mainActivityKeys.add(record.recordKey);
    } else if (record.recordType === "subactivity") {
      parentByActivity.set(record.recordKey, record.parentKey);
    }
  }
  return { budgetAmount, parentByActivity, mainActivityKeys };
}

function storageMessage(error: unknown) {
  const text = error instanceof Error ? error.message : "Unexpected error";
  if (text.includes("no such table") || text.includes("budget_allocations")) {
    return "Budget allocation is being prepared.";
  }
  return "Budget allocations are temporarily unavailable.";
}

export async function GET(request: Request) {
  const session = await requireAppSession(request);
  if (session instanceof Response) return session;
  const year = Number(new URL(request.url).searchParams.get("year") || BASE_YEAR);
  if (!Number.isInteger(year) || year < BASE_YEAR || year > 2100) {
    return Response.json({ error: "Choose a valid workplan year." }, { status: 400 });
  }
  try {
    const allocations = await getDb()
      .select()
      .from(budgetAllocations)
      .where(eq(budgetAllocations.planYear, year))
      .orderBy(asc(budgetAllocations.budgetKey), asc(budgetAllocations.activityKey));
    return Response.json({ allocations });
  } catch (error) {
    console.error("Unable to load budget allocations", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as {
      planYear?: number;
      budgetKey?: string;
      activityKey?: string;
      amountMnt?: number;
      note?: string;
    };
    const planYear = Number(payload.planYear);
    const budgetKey = payload.budgetKey?.trim() ?? "";
    const activityKey = payload.activityKey?.trim() ?? "";
    const amountMnt = Number(payload.amountMnt);
    if (
      !Number.isInteger(planYear) ||
      planYear < BASE_YEAR ||
      planYear > 2100 ||
      !budgetKey ||
      !activityKey ||
      !Number.isSafeInteger(amountMnt) ||
      amountMnt <= 0
    ) {
      return Response.json({ error: "Enter a valid budget allocation." }, { status: 400 });
    }
    const keys = await validKeys(planYear);
    if (!keys.budgetKeys.has(budgetKey) || !keys.activityKeys.has(activityKey)) {
      return Response.json(
        { error: "Choose an activity and budget line from this workplan year." },
        { status: 400 },
      );
    }
    const db = getDb();
    const context = await allocationContext(planYear);
    const approvedBudget = context.budgetAmount.get(budgetKey) ?? 0;
    if (approvedBudget <= 0) {
      return Response.json(
        { error: "Enter the approved budget for this budget line before allocating it." },
        { status: 400 },
      );
    }
    const existingAllocations = await db
      .select()
      .from(budgetAllocations)
      .where(eq(budgetAllocations.planYear, planYear));
    const mainActivityKey = context.parentByActivity.get(activityKey) ?? activityKey;
    if (context.parentByActivity.has(activityKey)) {
      const mainAllocation = existingAllocations.find(
        (item) =>
          item.budgetKey === budgetKey && item.activityKey === mainActivityKey,
      );
      if (!mainAllocation) {
        return Response.json(
          { error: "Allocate a budget to the main activity before allocating its sub-activities." },
          { status: 400 },
        );
      }
      const otherSubTotal = existingAllocations
        .filter(
          (item) =>
            item.budgetKey === budgetKey &&
            item.activityKey !== activityKey &&
            context.parentByActivity.get(item.activityKey) === mainActivityKey,
        )
        .reduce((total, item) => total + item.amountMnt, 0);
      if (otherSubTotal + amountMnt > mainAllocation.amountMnt) {
        return Response.json(
          {
            error: `Sub-activity allocations cannot exceed the main activity allocation of ${mainAllocation.amountMnt.toLocaleString("en-US")} MNT.`,
          },
          { status: 400 },
        );
      }
    } else if (context.mainActivityKeys.has(activityKey)) {
      const otherMainTotal = existingAllocations
        .filter(
          (item) =>
            item.budgetKey === budgetKey &&
            item.activityKey !== activityKey &&
            context.mainActivityKeys.has(item.activityKey),
        )
        .reduce((total, item) => total + item.amountMnt, 0);
      if (otherMainTotal + amountMnt > approvedBudget) {
        return Response.json(
          {
            error: `Main activity allocations cannot exceed the approved budget of ${approvedBudget.toLocaleString("en-US")} MNT.`,
          },
          { status: 400 },
        );
      }
      const currentSubTotal = existingAllocations
        .filter(
          (item) =>
            item.budgetKey === budgetKey &&
            context.parentByActivity.get(item.activityKey) === activityKey,
        )
        .reduce((total, item) => total + item.amountMnt, 0);
      if (currentSubTotal > amountMnt) {
        return Response.json(
          {
            error: `This main activity already has ${currentSubTotal.toLocaleString("en-US")} MNT allocated across sub-activities.`,
          },
          { status: 400 },
        );
      }
    }
    const now = new Date().toISOString();
    const values = {
      id: allocationId(planYear, budgetKey, activityKey),
      planYear,
      budgetKey,
      activityKey,
      amountMnt,
      note: (payload.note ?? "").trim().slice(0, 2000),
      updatedAt: now,
      updatedBy: session.email,
    };
    const [allocation] = await db
      .insert(budgetAllocations)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({
        target: [
          budgetAllocations.planYear,
          budgetAllocations.budgetKey,
          budgetAllocations.activityKey,
        ],
        set: values,
      })
      .returning();
    return Response.json({ allocation });
  } catch (error) {
    console.error("Unable to save budget allocation", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { id?: string };
    const id = payload.id?.trim() ?? "";
    if (!id) {
      return Response.json({ error: "Choose a budget allocation." }, { status: 400 });
    }
    await getDb().delete(budgetAllocations).where(eq(budgetAllocations.id, id));
    return Response.json({ deletedId: id });
  } catch (error) {
    console.error("Unable to remove budget allocation", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
