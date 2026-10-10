import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { melIndicators, melResults } from "@/db/schema";
import { requireAdminSession, requireAppSession } from "@/lib/app-auth";

const levels = new Set(["output", "outcome", "impact"]);
const frequencies = new Set(["quarterly", "annual"]);
const periods = new Set(["Q1", "Q2", "Q3", "Q4", "Annual"]);
const actions = new Set(["save", "submit", "review", "approve", "return"]);

function storageMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no such table") || message.includes("mel_")) {
    return "MEL indicator storage is being prepared.";
  }
  if (message.includes("UNIQUE")) {
    return "That indicator code or reporting period already exists.";
  }
  return "MEL indicator information is temporarily unavailable.";
}

function validYear(value: unknown) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2026 && year <= 2100 ? year : null;
}

function optionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const year = validYear(new URL(request.url).searchParams.get("year"));
    if (!year) {
      return Response.json({ error: "Choose a valid workplan year." }, { status: 400 });
    }
    const db = getDb();
    const [indicators, results] = await Promise.all([
      db
        .select()
        .from(melIndicators)
        .where(eq(melIndicators.planYear, year))
        .orderBy(asc(melIndicators.code)),
      db
        .select()
        .from(melResults)
        .where(eq(melResults.planYear, year))
        .orderBy(desc(melResults.updatedAt)),
    ]);
    return Response.json({ indicators, results });
  } catch (error) {
    console.error("Unable to load MEL indicators", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as Record<string, unknown>;
    const entity = String(payload.entity ?? "");
    const db = getDb();
    const now = new Date().toISOString();

    if (entity === "indicator") {
      if (!session.isAdmin) {
        return Response.json({ error: "Administrator access is required." }, { status: 403 });
      }
      const planYear = validYear(payload.planYear);
      const id = String(payload.id ?? "").trim();
      const code = String(payload.code ?? "").trim().slice(0, 60);
      const name = String(payload.name ?? "").trim().slice(0, 500);
      const definition = String(payload.definition ?? "").trim().slice(0, 4_000);
      const unit = String(payload.unit ?? "").trim().slice(0, 100);
      const level = String(payload.level ?? "").trim();
      const reportingFrequency = String(payload.reportingFrequency ?? "").trim();
      if (!planYear || !code || !name || !unit || !levels.has(level) || !frequencies.has(reportingFrequency)) {
        return Response.json({ error: "Complete the required indicator fields." }, { status: 400 });
      }
      const values = {
        planYear,
        code,
        name,
        definition,
        unit,
        level,
        reportingFrequency,
        dataSource: String(payload.dataSource ?? "").trim().slice(0, 500),
        responsibleMemberId: String(payload.responsibleMemberId ?? "").trim().slice(0, 120),
        goal: String(payload.goal ?? "").trim().slice(0, 120),
        activityKey: String(payload.activityKey ?? "").trim().slice(0, 220),
        active: payload.active === false ? 0 : 1,
        baselineValue: optionalNumber(payload.baselineValue),
        baselineYear: optionalNumber(payload.baselineYear),
        annualTarget: optionalNumber(payload.annualTarget),
        q1Target: optionalNumber(payload.q1Target),
        q2Target: optionalNumber(payload.q2Target),
        q3Target: optionalNumber(payload.q3Target),
        q4Target: optionalNumber(payload.q4Target),
        endTarget: optionalNumber(payload.endTarget),
        updatedAt: now,
        updatedBy: session.email,
      };
      if (id) {
        const [existing] = await db.select().from(melIndicators).where(eq(melIndicators.id, id)).limit(1);
        if (!existing) return Response.json({ error: "Indicator not found." }, { status: 404 });
        const [indicator] = await db.update(melIndicators).set(values).where(eq(melIndicators.id, id)).returning();
        return Response.json({ indicator });
      }
      const [indicator] = await db
        .insert(melIndicators)
        .values({
          id: crypto.randomUUID(),
          ...values,
          createdAt: now,
          createdBy: session.email,
        })
        .returning();
      return Response.json({ indicator }, { status: 201 });
    }

    if (entity !== "result") {
      return Response.json({ error: "Choose a valid MEL record." }, { status: 400 });
    }

    const indicatorId = String(payload.indicatorId ?? "").trim();
    const period = String(payload.period ?? "").trim();
    const action = String(payload.action ?? "save").trim();
    const actualValue = Number(payload.actualValue);
    if (!indicatorId || !periods.has(period) || !actions.has(action) || !Number.isFinite(actualValue)) {
      return Response.json({ error: "Enter a valid reporting period and actual result." }, { status: 400 });
    }
    const [indicator] = await db.select().from(melIndicators).where(eq(melIndicators.id, indicatorId)).limit(1);
    if (!indicator) return Response.json({ error: "Indicator not found." }, { status: 404 });
    if (action === "review" || action === "approve" || action === "return") {
      if (!session.isAdmin) {
        return Response.json({ error: "Administrator access is required." }, { status: 403 });
      }
    }
    const [existing] = await db
      .select()
      .from(melResults)
      .where(and(eq(melResults.indicatorId, indicatorId), eq(melResults.period, period)))
      .limit(1);
    if (existing?.workflowStatus === "approved" && !session.isAdmin) {
      return Response.json({ error: "Only an administrator can revise an approved result." }, { status: 403 });
    }

    let workflowStatus = existing?.workflowStatus ?? "draft";
    if (action === "save") workflowStatus = "draft";
    if (action === "submit") workflowStatus = "submitted";
    if (action === "review") workflowStatus = "reviewed";
    if (action === "approve") workflowStatus = "approved";
    if (action === "return") workflowStatus = "draft";
    const reviewComment = String(payload.reviewComment ?? "").trim().slice(0, 2_000);
    const transitionValues = {
      submittedAt: action === "submit" ? now : existing?.submittedAt ?? "",
      submittedBy: action === "submit" ? session.email : existing?.submittedBy ?? "",
      reviewedAt: action === "review" ? now : existing?.reviewedAt ?? "",
      reviewedBy: action === "review" ? session.email : existing?.reviewedBy ?? "",
      approvedAt: action === "approve" ? now : existing?.approvedAt ?? "",
      approvedBy: action === "approve" ? session.email : existing?.approvedBy ?? "",
    };
    const values = {
      indicatorId,
      planYear: indicator.planYear,
      period,
      actualValue,
      note: String(payload.note ?? "").trim().slice(0, 8_000),
      evidenceReference: String(payload.evidenceReference ?? "").trim().slice(0, 2_000),
      workflowStatus,
      reviewComment,
      updatedAt: now,
      updatedBy: session.email,
      ...transitionValues,
    };
    if (existing) {
      const [result] = await db.update(melResults).set(values).where(eq(melResults.id, existing.id)).returning();
      return Response.json({ result });
    }
    const [result] = await db
      .insert(melResults)
      .values({
        id: crypto.randomUUID(),
        ...values,
        enteredAt: now,
        enteredBy: session.email,
      })
      .returning();
    return Response.json({ result }, { status: 201 });
  } catch (error) {
    console.error("Unable to save MEL record", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { entity?: unknown; id?: unknown };
    const entity = String(payload.entity ?? "");
    const id = String(payload.id ?? "").trim();
    if (!id || !["indicator", "result"].includes(entity)) {
      return Response.json({ error: "Choose a valid MEL record." }, { status: 400 });
    }
    const db = getDb();
    if (entity === "indicator") {
      await db.delete(melResults).where(eq(melResults.indicatorId, id));
      await db.delete(melIndicators).where(eq(melIndicators.id, id));
    } else {
      await db.delete(melResults).where(eq(melResults.id, id));
    }
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete MEL record", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
