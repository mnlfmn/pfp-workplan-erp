import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activityUpdates, workplanRecords } from "@/db/schema";
import workplan from "@/lib/workplan-data.json";

const allowedStatuses = new Set([
  "completed",
  "in_progress",
  "delayed",
  "on_hold",
  "not_started",
  "not_reported",
]);

const validActivityKeys = new Set(
  workplan.activities.flatMap((activity) => [
    activity.id,
    ...activity.subactivities.map((subactivity) => subactivity.id),
  ]),
);

async function isValidActivityKey(activityKey: string) {
  if (validActivityKeys.has(activityKey)) return true;
  const rows = await getDb()
    .select({
      type: workplanRecords.recordType,
      deleted: workplanRecords.isDeleted,
    })
    .from(workplanRecords)
    .where(
      and(
        eq(workplanRecords.recordKey, activityKey),
        eq(workplanRecords.isDeleted, 0),
      ),
    )
    .limit(1);
  return Boolean(
    rows[0] &&
      !rows[0].deleted &&
      ["activity", "subactivity"].includes(rows[0].type),
  );
}

function message(error: unknown) {
  const text = error instanceof Error ? error.message : "Unexpected error";
  if (text.includes("no such table") || text.includes("activity_updates")) {
    return "Saved updates are being prepared. The source workplan remains available.";
  }
  return "Saved updates are temporarily unavailable.";
}

export async function GET() {
  try {
    const rows = await getDb().select().from(activityUpdates);
    return Response.json({ updates: rows });
  } catch (error) {
    console.error("Unable to load workplan updates", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as {
      activityKey?: string;
      status?: string;
      progress?: number;
      note?: string;
      supportNeeded?: string;
      owner?: string;
    };
    const activityKey = payload.activityKey?.trim() ?? "";
    const status = payload.status?.trim() ?? "";
    const progress = Number(payload.progress);

    if (
      !activityKey ||
      activityKey.length > 160 ||
      !(await isValidActivityKey(activityKey))
    ) {
      return Response.json({ error: "A valid activity key is required." }, { status: 400 });
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ error: "Choose a valid status." }, { status: 400 });
    }
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      return Response.json({ error: "Progress must be a whole number from 0 to 100." }, { status: 400 });
    }

    const updatedBy =
      request.headers.get("oai-authenticated-user-email") ??
      request.headers.get("oai-authenticated-user-id") ??
      "";
    const values = {
      activityKey,
      status,
      progress,
      note: (payload.note ?? "").trim().slice(0, 4000),
      supportNeeded: (payload.supportNeeded ?? "").trim().slice(0, 4000),
      owner: (payload.owner ?? "").trim().slice(0, 500),
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    const db = getDb();
    await db
      .insert(activityUpdates)
      .values(values)
      .onConflictDoUpdate({
        target: activityUpdates.activityKey,
        set: values,
      });
    const [update] = await db
      .select()
      .from(activityUpdates)
      .where(eq(activityUpdates.activityKey, activityKey))
      .limit(1);

    return Response.json({ update });
  } catch (error) {
    console.error("Unable to save workplan update", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}
