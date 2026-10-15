import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  quarterlyReportSubmissions,
  quarterlyUpdates,
  systemMetadata,
  teamMembers,
  workplanRecords,
} from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";
import { snapshot, writeAuditLog } from "@/lib/audit-log";
import workplan from "@/lib/workplan-data.json";

const quarters = new Set(["Q1", "Q2", "Q3", "Q4"]);
const baseStatuses = new Set([
  "completed",
  "in_progress",
  "delayed",
  "delayed_externally",
  "on_hold",
  "not_started",
  "not_reported",
]);

type SubmissionItem = {
  activityKey: string;
  code: string;
  title: string;
  note: string;
  status: string;
  progress: number;
};

async function isAllowedStatus(status: string) {
  if (baseStatuses.has(status)) return true;
  const [row] = await getDb()
    .select({ value: systemMetadata.value })
    .from(systemMetadata)
    .where(and(eq(systemMetadata.category, "status"), eq(systemMetadata.value, status)))
    .limit(1);
  return Boolean(row);
}

async function isMainActivity(activityKey: string, planYear: number) {
  const rows = await getDb()
    .select({ recordType: workplanRecords.recordType, isDeleted: workplanRecords.isDeleted })
    .from(workplanRecords)
    .where(
      and(
        eq(workplanRecords.planYear, planYear),
        eq(workplanRecords.recordKey, activityKey),
      ),
    );
  const saved = rows.find((row) => row.recordType === "activity");
  if (saved) return saved.isDeleted === 0;
  if (rows.some((row) => row.recordType === "subactivity")) return false;
  return planYear === 2026 && workplan.activities.some((activity) => activity.id === activityKey);
}

function storageMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no such table")) return "Quarterly reporting is being prepared.";
  return "Quarterly reporting is temporarily unavailable.";
}

function normalizeItems(value: unknown): SubmissionItem[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 250) return null;
  const items = value.map((item) => {
    const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      activityKey: String(source.activityKey ?? "").trim(),
      code: String(source.code ?? "").trim().slice(0, 120),
      title: String(source.title ?? "").trim().slice(0, 1000),
      note: String(source.note ?? "").trim().slice(0, 16_000),
      status: String(source.status ?? "").trim(),
      progress: Number(source.progress),
    };
  });
  if (
    items.some(
      (item) =>
        !item.activityKey ||
        item.activityKey.length > 220 ||
        !item.note ||
        !Number.isInteger(item.progress) ||
        item.progress < 0 ||
        item.progress > 100,
    )
  ) {
    return null;
  }
  return items;
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const params = new URL(request.url).searchParams;
    const planYear = Number(params.get("year"));
    const quarter = String(params.get("quarter") ?? "").trim();
    if (!Number.isInteger(planYear) || planYear < 2026 || planYear > 2100 || !quarters.has(quarter)) {
      return Response.json({ error: "Choose a valid reporting period." }, { status: 400 });
    }
    const submissions = await getDb()
      .select()
      .from(quarterlyReportSubmissions)
      .where(
        and(
          eq(quarterlyReportSubmissions.planYear, planYear),
          eq(quarterlyReportSubmissions.quarter, quarter),
        ),
      )
      .orderBy(desc(quarterlyReportSubmissions.submittedAt));
    if (session.isAdmin) return Response.json({ submissions });
    const supervised = await getDb()
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(eq(teamMembers.kpiReviewerId, session.memberId));
    const allowedMemberIds = new Set([
      session.memberId,
      ...supervised.map((member) => member.id),
    ]);
    return Response.json({
      submissions: submissions.filter((submission) =>
        allowedMemberIds.has(submission.memberId),
      ),
    });
  } catch (error) {
    console.error("Unable to load quarterly report submissions", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as {
      planYear?: unknown;
      quarter?: unknown;
      memberId?: unknown;
      memberName?: unknown;
      items?: unknown;
    };
    const planYear = Number(payload.planYear);
    const quarter = String(payload.quarter ?? "").trim();
    const memberId = String(payload.memberId ?? "").trim();
    const memberName = String(payload.memberName ?? "").trim();
    const items = normalizeItems(payload.items);
    if (!Number.isInteger(planYear) || planYear < 2026 || planYear > 2100 || !quarters.has(quarter)) {
      return Response.json({ error: "Choose a valid reporting period." }, { status: 400 });
    }
    if (!memberId || memberId !== session.memberId) {
      return Response.json({ error: "You can submit only your own quarterly report." }, { status: 403 });
    }
    if (!items) {
      return Response.json({ error: "Complete every required activity before submitting." }, { status: 400 });
    }
    for (const item of items) {
      if (!(await isMainActivity(item.activityKey, planYear)) || !(await isAllowedStatus(item.status))) {
        return Response.json({ error: "One or more reporting activities are invalid." }, { status: 400 });
      }
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const db = getDb();
    const [submission] = await db
      .insert(quarterlyReportSubmissions)
      .values({
        id,
        planYear,
        quarter,
        memberId,
        memberName: memberName || session.memberName,
        status: "submitted",
        activityCount: items.length,
        snapshot: JSON.stringify(items),
        reviewComment: "",
        submittedAt: now,
        submittedBy: session.email,
        returnedAt: "",
        returnedBy: "",
        updatedAt: now,
      })
      .returning();
    await db.insert(quarterlyUpdates).values(
      items.map((item) => ({
        id: crypto.randomUUID(),
        activityKey: item.activityKey,
        planYear,
        quarter,
        note: item.note,
        status: item.status,
        progress: item.progress,
        submittedAt: now,
        submittedBy: session.email,
      })),
    );
    await writeAuditLog({
      entityType: "quarterly_report",
      entityKey: id,
      action: "submitted quarterly report",
      previousValue: null,
      newValue: snapshot("quarterly_report_submission", submission),
      changedBy: session.email,
    });
    return Response.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Unable to submit quarterly report", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { id?: unknown; action?: unknown; reviewComment?: unknown };
    const id = String(payload.id ?? "").trim();
    const action = String(payload.action ?? "").trim();
    const reviewComment = String(payload.reviewComment ?? "").trim().slice(0, 4000);
    if (!id || action !== "return" || !reviewComment) {
      return Response.json({ error: "Add a return comment before sending the report back." }, { status: 400 });
    }
    const db = getDb();
    const [existing] = await db
      .select()
      .from(quarterlyReportSubmissions)
      .where(eq(quarterlyReportSubmissions.id, id))
      .limit(1);
    if (!existing) return Response.json({ error: "Quarterly submission not found." }, { status: 404 });
    let allowed = session.isAdmin;
    if (!allowed) {
      const [member] = await db
        .select({ reviewerId: teamMembers.kpiReviewerId })
        .from(teamMembers)
        .where(eq(teamMembers.id, existing.memberId))
        .limit(1);
      allowed = member?.reviewerId === session.memberId;
    }
    if (!allowed) {
      return Response.json({ error: "Supervisor or administrator access is required." }, { status: 403 });
    }
    const now = new Date().toISOString();
    const [submission] = await db
      .update(quarterlyReportSubmissions)
      .set({
        status: "returned",
        reviewComment,
        returnedAt: now,
        returnedBy: session.email,
        updatedAt: now,
      })
      .where(eq(quarterlyReportSubmissions.id, id))
      .returning();
    await writeAuditLog({
      entityType: "quarterly_report",
      entityKey: id,
      action: "returned quarterly report",
      previousValue: snapshot("quarterly_report_submission", existing),
      newValue: snapshot("quarterly_report_submission", submission),
      changedBy: session.email,
    });
    return Response.json({ submission });
  } catch (error) {
    console.error("Unable to return quarterly report", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
