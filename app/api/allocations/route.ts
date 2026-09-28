import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { budgetAllocations, workplanRecords } from "@/db/schema";
import workplan from "@/lib/workplan-data.json";

const BASE_YEAR = 2026;

function userFrom(request: Request) {
  return (
    request.headers.get("oai-authenticated-user-email") ??
    request.headers.get("oai-authenticated-user-id") ??
    ""
  );
}

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

function storageMessage(error: unknown) {
  const text = error instanceof Error ? error.message : "Unexpected error";
  if (text.includes("no such table") || text.includes("budget_allocations")) {
    return "Budget allocation is being prepared.";
  }
  return "Budget allocations are temporarily unavailable.";
}

export async function GET(request: Request) {
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
    const now = new Date().toISOString();
    const values = {
      id: allocationId(planYear, budgetKey, activityKey),
      planYear,
      budgetKey,
      activityKey,
      amountMnt,
      note: (payload.note ?? "").trim().slice(0, 2000),
      updatedAt: now,
      updatedBy: userFrom(request),
    };
    const [allocation] = await getDb()
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
