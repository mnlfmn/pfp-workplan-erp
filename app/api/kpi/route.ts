import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { staffKpiHistory, staffKpiReviews, teamMembers } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";

const periods = new Set(["Q1", "Q2", "Q3", "Q4", "Annual"]);
const workflowStatuses = new Set(["draft", "submitted", "reviewed", "approved"]);
const competencyKeys = new Set([
  "productive-time",
  "technical-quality",
  "teamwork",
  "partner-relations",
  "independence",
  "initiative",
]);

function score(value: unknown, maximum = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, Math.round(number * 10) / 10));
}

function optionalScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return score(value);
}

function optionalBoundedScore(value: unknown, maximum = 100) {
  if (value === null || value === undefined || value === "") return null;
  return score(value, maximum);
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

function object(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function assessmentDetails(value: unknown) {
  const input = object(value);
  const activityScores = Array.isArray(input.activityScores)
    ? input.activityScores.slice(0, 100).map((item) => {
        const row = object(item);
        return {
          activityKey: text(row.activityKey, 180),
          selfScore: optionalBoundedScore(row.selfScore),
        };
      }).filter((item) => item.activityKey)
    : [];
  const additionalWorks = Array.isArray(input.additionalWorks)
    ? input.additionalWorks.slice(0, 50).map((item) => {
        const row = object(item);
        return {
          id: text(row.id, 180) || `additional-${crypto.randomUUID()}`,
          title: text(row.title, 500),
          outcome: text(row.outcome, 3000),
          completionDate: text(row.completionDate, 20),
          selfScore: optionalBoundedScore(row.selfScore),
        };
      }).filter((item) => item.title || item.outcome)
    : [];
  const competencies = Array.isArray(input.competencies)
    ? input.competencies.slice(0, competencyKeys.size).map((item) => {
        const row = object(item);
        return {
          key: text(row.key, 80),
          note: text(row.note, 2000),
          selfScore: optionalBoundedScore(row.selfScore),
        };
      }).filter((item) => competencyKeys.has(item.key))
    : [];
  const development = object(input.development);
  const culture = object(input.culture);
  return {
    activityScores,
    additionalWorks,
    competencies,
    development: {
      note: text(development.note, 3000),
      selfScore: optionalBoundedScore(development.selfScore),
    },
    culture: {
      note: text(culture.note, 3000),
      selfScore: optionalBoundedScore(culture.selfScore, 5),
    },
    staffComment: text(input.staffComment, 5000),
  };
}

function historyView(row: typeof staffKpiHistory.$inferSelect) {
  try {
    return { ...row, snapshot: JSON.parse(row.snapshot) as unknown };
  } catch {
    return { ...row, snapshot: null };
  }
}

async function kpiAccess(memberId: string, actorMemberId: string) {
  const [member] = await getDb()
    .select({
      reviewerId: teamMembers.kpiReviewerId,
      approverId: teamMembers.kpiApproverId,
      isDeleted: teamMembers.isDeleted,
    })
    .from(teamMembers)
    .where(eq(teamMembers.id, memberId))
    .limit(1);
  return {
    isSelf: memberId === actorMemberId,
    isReviewer: Boolean(member && !member.isDeleted && member.reviewerId === actorMemberId),
    isApprover: Boolean(member && !member.isDeleted && member.approverId === actorMemberId),
  };
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year") || new Date().getFullYear());
    const requestedMemberId = text(url.searchParams.get("memberId"), 160);
    const memberId = requestedMemberId || (session.isAdmin ? "" : session.memberId);
    const reviewId = text(url.searchParams.get("reviewId"), 180);
    const db = getDb();

    if (reviewId) {
      const [review] = await db
        .select()
        .from(staffKpiReviews)
        .where(eq(staffKpiReviews.id, reviewId))
        .limit(1);
      const access = review
        ? await kpiAccess(review.memberId, session.memberId)
        : { isSelf: false, isReviewer: false, isApprover: false };
      if (
        !review ||
        (!session.isAdmin && !access.isSelf && !access.isReviewer && !access.isApprover)
      ) {
        return Response.json({ error: "KPI review not found." }, { status: 404 });
      }
      const history = await db
        .select()
        .from(staffKpiHistory)
        .where(eq(staffKpiHistory.reviewId, reviewId))
        .orderBy(desc(staffKpiHistory.changedAt));
      return Response.json({ history: history.map(historyView) });
    }

    if (memberId && !session.isAdmin) {
      const access = await kpiAccess(memberId, session.memberId);
      if (!access.isSelf && !access.isReviewer && !access.isApprover) {
        return Response.json({ error: "You do not have access to this KPI review." }, { status: 403 });
      }
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
    if (!workflowStatuses.has(workflowStatus)) {
      return Response.json({ error: "Choose a valid workflow status." }, { status: 400 });
    }

    const db = getDb();
    const access = await kpiAccess(memberId, session.memberId);
    if (
      !session.isAdmin &&
      !access.isSelf &&
      !access.isReviewer &&
      !access.isApprover
    ) {
      return Response.json({ error: "You are not assigned to this KPI review." }, { status: 403 });
    }
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
    if (!existing && !session.isAdmin && !access.isSelf) {
      return Response.json(
        { error: "The staff member must create and submit this KPI before it can be reviewed." },
        { status: 400 },
      );
    }
    if (!session.isAdmin) {
      if (access.isSelf) {
        if (!["draft", "submitted"].includes(workflowStatus)) {
          return Response.json({ error: "Staff can save a KPI as draft or submitted." }, { status: 403 });
        }
        if (existing && ["reviewed", "approved"].includes(existing.workflowStatus)) {
          return Response.json({ error: "This KPI has already been reviewed and can no longer be edited by the staff member." }, { status: 403 });
        }
      } else if (access.isReviewer && !["submitted", "reviewed"].includes(workflowStatus)) {
        return Response.json({ error: "The assigned reviewer can mark this KPI as reviewed." }, { status: 403 });
      } else if (access.isApprover && !["reviewed", "approved"].includes(workflowStatus)) {
        return Response.json({ error: "The assigned approver can approve a reviewed KPI." }, { status: 403 });
      }
    }
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
      linkedActivityKeys:
        session.isAdmin || access.isSelf
          ? JSON.stringify(activityKeys(payload.linkedActivityKeys))
          : existing?.linkedActivityKeys ?? "[]",
      assessmentDetails:
        session.isAdmin || access.isSelf
          ? JSON.stringify(assessmentDetails(payload.assessmentDetails))
          : existing?.assessmentDetails ?? "{}",
      achievementNote:
        session.isAdmin || access.isSelf
          ? text(payload.achievementNote, 8000)
          : existing?.achievementNote ?? "",
      selfPerformanceScore:
        session.isAdmin || access.isSelf
          ? score(payload.selfPerformanceScore)
          : existing?.selfPerformanceScore ?? 0,
      selfAttendanceScore:
        session.isAdmin || access.isSelf
          ? score(payload.selfAttendanceScore)
          : existing?.selfAttendanceScore ?? 0,
      selfDevelopmentScore:
        session.isAdmin || access.isSelf
          ? score(payload.selfDevelopmentScore)
          : existing?.selfDevelopmentScore ?? 0,
      reviewPerformanceScore: session.isAdmin || access.isReviewer
        ? optionalScore(payload.reviewPerformanceScore)
        : existing?.reviewPerformanceScore ?? null,
      reviewAttendanceScore: session.isAdmin || access.isReviewer
        ? optionalScore(payload.reviewAttendanceScore)
        : existing?.reviewAttendanceScore ?? null,
      reviewDevelopmentScore: session.isAdmin || access.isReviewer
        ? optionalScore(payload.reviewDevelopmentScore)
        : existing?.reviewDevelopmentScore ?? null,
      cultureBonus: session.isAdmin || access.isReviewer
        ? score(payload.cultureBonus, 5)
        : existing?.cultureBonus ?? 0,
      reviewComment: session.isAdmin || access.isReviewer
        ? text(payload.reviewComment, 5000)
        : existing?.reviewComment ?? "",
      approvalComment: session.isAdmin || access.isApprover
        ? text(payload.approvalComment, 5000)
        : existing?.approvalComment ?? "",
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
