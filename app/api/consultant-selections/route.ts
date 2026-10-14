import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { consultantEvaluations } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";

const allowedStatuses = new Set(["draft", "evaluated", "completed"]);

function validYear(value: unknown) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2026 && year <= 2100 ? year : null;
}

function storageMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no such table") || message.includes("consultant_evaluations")) {
    return "Consultant selection storage is being prepared.";
  }
  return "Consultant selection information is temporarily unavailable.";
}

function safePayload(value: unknown) {
  const payload = value && typeof value === "object" ? value : {};
  const encoded = JSON.stringify(payload);
  if (encoded.length > 250_000) throw new Error("PAYLOAD_TOO_LARGE");
  return encoded;
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const year = validYear(new URL(request.url).searchParams.get("year"));
    if (!year) {
      return Response.json({ error: "Choose a valid workplan year." }, { status: 400 });
    }
    const evaluations = await getDb()
      .select()
      .from(consultantEvaluations)
      .where(eq(consultantEvaluations.planYear, year))
      .orderBy(desc(consultantEvaluations.updatedAt));
    return Response.json({ evaluations });
  } catch (error) {
    console.error("Unable to load consultant selections", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const body = (await request.json()) as Record<string, unknown>;
    const planYear = validYear(body.planYear);
    const id = String(body.id ?? "").trim();
    const activityKey = String(body.activityKey ?? "").trim().slice(0, 160);
    const title = String(body.title ?? "").trim().slice(0, 500);
    const status = String(body.status ?? "draft").trim();
    if (!planYear || !activityKey || !title || !allowedStatuses.has(status)) {
      return Response.json(
        { error: "Select an activity and complete the assignment name." },
        { status: 400 },
      );
    }
    const payload = safePayload(body.payload);
    const db = getDb();
    const now = new Date().toISOString();

    if (id) {
      const [existing] = await db
        .select()
        .from(consultantEvaluations)
        .where(eq(consultantEvaluations.id, id))
        .limit(1);
      if (!existing) {
        return Response.json({ error: "Evaluation not found." }, { status: 404 });
      }
      if (!session.isAdmin && existing.createdBy !== session.email) {
        return Response.json(
          { error: "Only the officer who created this evaluation can edit it." },
          { status: 403 },
        );
      }
      const [evaluation] = await db
        .update(consultantEvaluations)
        .set({
          planYear,
          activityKey,
          title,
          status,
          payload,
          updatedAt: now,
          updatedBy: session.email,
        })
        .where(eq(consultantEvaluations.id, id))
        .returning();
      return Response.json({ evaluation });
    }

    const [evaluation] = await db
      .insert(consultantEvaluations)
      .values({
        id: crypto.randomUUID(),
        planYear,
        activityKey,
        title,
        status,
        payload,
        createdAt: now,
        createdBy: session.email,
        updatedAt: now,
        updatedBy: session.email,
      })
      .returning();
    return Response.json({ evaluation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
      return Response.json({ error: "This evaluation is too large to save." }, { status: 413 });
    }
    console.error("Unable to save consultant selection", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const body = (await request.json()) as { id?: unknown };
    const id = String(body.id ?? "").trim();
    if (!id) return Response.json({ error: "Choose an evaluation." }, { status: 400 });
    const db = getDb();
    const [existing] = await db
      .select()
      .from(consultantEvaluations)
      .where(eq(consultantEvaluations.id, id))
      .limit(1);
    if (!existing) return Response.json({ error: "Evaluation not found." }, { status: 404 });
    if (!session.isAdmin && existing.createdBy !== session.email) {
      return Response.json(
        { error: "Only the officer who created this evaluation can delete it." },
        { status: 403 },
      );
    }
    await db.delete(consultantEvaluations).where(eq(consultantEvaluations.id, id));
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete consultant selection", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
