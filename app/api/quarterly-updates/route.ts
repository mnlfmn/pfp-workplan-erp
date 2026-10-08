import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { quarterlyUpdates, systemMetadata } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";

const quarters = new Set(["Q1", "Q2", "Q3", "Q4"]);
const statuses = new Set([
  "completed",
  "in_progress",
  "delayed",
  "delayed_externally",
  "on_hold",
  "not_started",
  "not_reported",
]);

async function isAllowedStatus(status: string) {
  if (statuses.has(status)) return true;
  const rows = await getDb()
    .select({ value: systemMetadata.value })
    .from(systemMetadata)
    .where(
      and(
        eq(systemMetadata.category, "status"),
        eq(systemMetadata.value, status),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

function storageMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no such table")) {
    return "Quarterly update history is being prepared.";
  }
  return "Quarterly update history is temporarily unavailable.";
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const params = new URL(request.url).searchParams;
    const year = Number(params.get("year"));
    const activityKey = params.get("activityKey")?.trim() ?? "";
    if (!Number.isInteger(year) || year < 2026 || year > 2100) {
      return Response.json({ error: "Choose a valid workplan year." }, { status: 400 });
    }
    const condition = activityKey
      ? and(
          eq(quarterlyUpdates.planYear, year),
          eq(quarterlyUpdates.activityKey, activityKey),
        )
      : eq(quarterlyUpdates.planYear, year);
    const history = await getDb()
      .select()
      .from(quarterlyUpdates)
      .where(condition)
      .orderBy(desc(quarterlyUpdates.submittedAt));
    return Response.json({ history });
  } catch (error) {
    console.error("Unable to load quarterly history", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as {
      activityKey?: unknown;
      planYear?: unknown;
      quarter?: unknown;
      note?: unknown;
      status?: unknown;
      progress?: unknown;
    };
    const activityKey = String(payload.activityKey ?? "").trim();
    const planYear = Number(payload.planYear);
    const quarter = String(payload.quarter ?? "").trim();
    const note = String(payload.note ?? "").trim();
    const status = String(payload.status ?? "").trim();
    const progress = Number(payload.progress);
    if (!activityKey || activityKey.length > 220) {
      return Response.json({ error: "Choose a valid activity." }, { status: 400 });
    }
    if (!Number.isInteger(planYear) || planYear < 2026 || planYear > 2100) {
      return Response.json({ error: "Choose a valid workplan year." }, { status: 400 });
    }
    if (!quarters.has(quarter)) {
      return Response.json({ error: "Choose a valid quarter." }, { status: 400 });
    }
    if (!note) {
      return Response.json({ error: "Enter a quarterly progress note." }, { status: 400 });
    }
    if (!(await isAllowedStatus(status)) || !Number.isInteger(progress) || progress < 0 || progress > 100) {
      return Response.json({ error: "Enter a valid status and progress." }, { status: 400 });
    }
    const [entry] = await getDb()
      .insert(quarterlyUpdates)
      .values({
        id: crypto.randomUUID(),
        activityKey,
        planYear,
        quarter,
        note: note.slice(0, 16_000),
        status,
        progress,
        submittedAt: new Date().toISOString(),
        submittedBy: session.email,
      })
      .returning();
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Unable to save quarterly history", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
