import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { staffKpiHistory, staffKpiReviews } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";

const periods = new Set(["Q1", "Q2", "Q3", "Q4", "Annual"]);
const workflowStatuses = new Set(["draft", "submitted", "reviewed", "approved"]);

function score(value: unknown, maximum = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, Math.round(number * 10) / 10));
}

function optionalScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return score(value);
}

function text(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

function activityKeys(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => text(item, 180)).filter(Boolean)),
  ).slice(0, 100);
}

function historyView(row: typeof staffKpiHistory.$inferSelect) {
  try {
    return { ...row, snapshot: JSON.parse(row.snapshot) as unknown };
  } catch {
    return { ...row, snapshot: null };
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year") || new Date().getFullYear());
    const requestedMemberId = text(url.searchParams.get("memberId"), 160);
    const memberId = session.isAdmin ? requestedMemberId : session.memberId;
    const reviewId = text(url.searchParams.get("reviewId"), 180);
    const db = getDb();

    if (reviewId) {
      const [review] = await db
        .select()
        .from(staffKpiReviews)
        .where(eq(staffKpiReviews.id, reviewId))
        .limit(1);
      if (!review || (!session.isAdmin && review.memberId !== session.memberId)) {
        return Response.json({ error: "KPI review not found." }, { status: 404 });
      }
      const history = await db
        .select()
        .from(staffKpiHistory)
        .where(eq(staffKpiHistory.reviewId, reviewId))
        .orderBy(desc(staffKpiHistory.changedAt));
      return Response.json({ history: history.map(historyView) });
    }

    const where = memberId
      ? and(
          eq(staffKpiReviews.planYear, year),
          eq(staffKpiReviews.memberId, memberId),
        )
      : eq(staffKpiReviews.planYear, year);
    const reviews = await db
      .select()
      .from(staffKpiReviews)
      .where(where)
      .orderBy(staffKpiReviews.memberId, staffKpiReviews.period);
    return Response.json({ reviews });
  } catch (error) {
    console.error("Unable to load staff KPI reviews", error);
    return Response.json(
      { error: "Staff KPI information is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as Record<string, unknown>;
    const memberId = text(payload.memberId, 160);
    const planYear = Number(payload.planYear);
    const period = text(payload.period, 20);
    const workflowStatus = text(payload.workflowStatus, 30) || "draft";

    if (!memberId || !Number.isInteger(planYear) || !periods.has(period)) {
      return Response.json({ error: "Choose a valid staff member, year and review period." }, { status: 400 });
    }
    if (!session.isAdmin && memberId !== session.memberId) {
      return Response.json({ error: "You can update only your own KPI review." }, { status: 403 });
    }
    if (!workflowStatuses.has(workflowStatus)) {
      return Response.json({ error: "Choose a valid workflow status." }, { status: 400 });
    }
    if (!session.isAdmin && !["draft", "submitted"].includes(workflowStatus)) {
      return Response.json({ error: "Only an administrator can review or approve a KPI." }, { status: 403 });
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(staffKpiReviews)
      .where(
        and(
          eq(staffKpiReviews.memberId, memberId),
          eq(staffKpiReviews.planYear, planYear),
          eq(staffKpiReviews.period, period),
        ),
      )
      .limit(1);
    const now = new Date().toISOString();
    const id = existing?.id ?? `kpi-${crypto.randomUUID()}`;
    const submitted = workflowStatus === "submitted" || workflowStatus === "reviewed" || workflowStatus === "approved";
    const reviewed = workflowStatus === "reviewed" || workflowStatus === "approved";
    const approved = workflowStatus === "approved";
    const values = {
      id,
      memberId,
      planYear,
      period,
      linkedActivityKeys: JSON.stringify(activityKeys(payload.linkedActivityKeys)),
      achievementNote: text(payload.achievementNote, 8000),
      selfPerformanceScore: score(payload.selfPerformanceScore),
      selfAttendanceScore: score(payload.selfAttendanceScore),
      selfDevelopmentScore: score(payload.selfDevelopmentScore),
      reviewPerformanceScore: session.isAdmin
        ? optionalScore(payload.reviewPerformanceScore)
        : existing?.reviewPerformanceScore ?? null,
      reviewAttendanceScore: session.isAdmin
        ? optionalScore(payload.reviewAttendanceScore)
        : existing?.reviewAttendanceScore ?? null,
      reviewDevelopmentScore: session.isAdmin
        ? optionalScore(payload.reviewDevelopmentScore)
        : existing?.reviewDevelopmentScore ?? null,
      cultureBonus: session.isAdmin
        ? score(payload.cultureBonus, 5)
        : existing?.cultureBonus ?? 0,
      reviewComment: session.isAdmin
        ? text(payload.reviewComment, 5000)
        : existing?.reviewComment ?? "",
      workflowStatus,
      submittedAt: submitted ? existing?.submittedAt || now : "",
      submittedBy: submitted ? existing?.submittedBy || session.email : "",
      reviewedAt: reviewed ? existing?.reviewedAt || now : "",
      reviewedBy: reviewed ? existing?.reviewedBy || session.email : "",
      approvedAt: approved ? existing?.approvedAt || now : "",
      approvedBy: approved ? existing?.approvedBy || session.email : "",
      createdAt: existing?.createdAt ?? now,
      createdBy: existing?.createdBy ?? session.email,
      updatedAt: now,
      updatedBy: session.email,
    };

    await db
      .insert(staffKpiReviews)
      .values(values)
      .onConflictDoUpdate({ target: staffKpiReviews.id, set: values });
    await db.insert(staffKpiHistory).values({
      id: `kpi-history-${crypto.randomUUID()}`,
      reviewId: id,
      snapshot: JSON.stringify(values),
      changedAt: now,
      changedBy: session.email,
    });
    const [review] = await db
      .select()
      .from(staffKpiReviews)
      .where(eq(staffKpiReviews.id, id))
      .limit(1);
    return Response.json({ review }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Unable to save staff KPI review", error);
    return Response.json(
      { error: "The KPI review could not be saved." },
      { status: 503 },
    );
  }
}
