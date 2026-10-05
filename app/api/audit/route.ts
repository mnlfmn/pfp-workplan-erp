import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  activityUpdates,
  auditLogs,
  contractPayments,
  contracts,
  financeEntries,
  teamMembers,
  workplanRecords,
} from "@/db/schema";
import { parseAuditSnapshot, snapshot, writeAuditLog } from "@/lib/audit-log";
import { requireAdminSession, requireAppSession } from "@/lib/app-auth";

const entityTypes = new Set(["activity", "finance", "contract", "team"]);

function auditError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no such table") || message.includes("audit_logs")) {
    return "Change history is being prepared. Please try again shortly.";
  }
  if (message.includes("UNIQUE")) {
    return "That earlier value conflicts with a current record and cannot be restored.";
  }
  return "Change history is temporarily unavailable.";
}

async function currentSnapshot(resource: string, data: unknown) {
  const db = getDb();
  const record = data as Record<string, unknown> | null;
  if (resource === "activity_update") {
    const key = String(record?.activityKey ?? "");
    const [row] = await db.select().from(activityUpdates).where(eq(activityUpdates.activityKey, key)).limit(1);
    return row ? snapshot("activity_update", row) : null;
  }
  if (resource === "workplan_record") {
    const id = String(record?.id ?? "");
    const [row] = await db.select().from(workplanRecords).where(eq(workplanRecords.id, id)).limit(1);
    return row ? snapshot("workplan_record", row) : null;
  }
  if (resource === "finance_entry") {
    const id = Number(record?.id);
    const [row] = await db.select().from(financeEntries).where(eq(financeEntries.id, id)).limit(1);
    return row ? snapshot("finance_entry", row) : null;
  }
  if (resource === "team_member") {
    const id = String(record?.id ?? "");
    const [row] = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    return row ? snapshot("team_member", row) : null;
  }
  if (resource === "contract") {
    const contractData = record?.contract as Record<string, unknown> | undefined;
    const id = String(contractData?.id ?? "");
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    if (!contract) return null;
    const payments = await db.select().from(contractPayments).where(eq(contractPayments.contractId, id));
    return snapshot("contract", { contract, payments });
  }
  return null;
}

async function restoreSnapshot(value: ReturnType<typeof parseAuditSnapshot>) {
  if (!value) return;
  const db = getDb();
  const data = value.data as Record<string, unknown> | null;
  if (value.resource === "activity_update") {
    if (!data) return;
    await db.insert(activityUpdates).values(data as typeof activityUpdates.$inferInsert).onConflictDoUpdate({
      target: activityUpdates.activityKey,
      set: data as typeof activityUpdates.$inferInsert,
    });
    return;
  }
  if (value.resource === "workplan_record") {
    if (!data) return;
    await db.insert(workplanRecords).values(data as typeof workplanRecords.$inferInsert).onConflictDoUpdate({
      target: workplanRecords.id,
      set: data as typeof workplanRecords.$inferInsert,
    });
    return;
  }
  if (value.resource === "finance_entry") {
    if (!data) return;
    await db.insert(financeEntries).values(data as typeof financeEntries.$inferInsert).onConflictDoUpdate({
      target: financeEntries.id,
      set: data as typeof financeEntries.$inferInsert,
    });
    return;
  }
  if (value.resource === "team_member") {
    if (!data) return;
    await db.insert(teamMembers).values(data as typeof teamMembers.$inferInsert).onConflictDoUpdate({
      target: teamMembers.id,
      set: data as typeof teamMembers.$inferInsert,
    });
    return;
  }
  if (value.resource === "contract") {
    const contract = data?.contract as typeof contracts.$inferInsert | undefined;
    const payments = (data?.payments ?? []) as Array<typeof contractPayments.$inferInsert>;
    if (!contract?.id) return;
    await db.insert(contracts).values(contract).onConflictDoUpdate({
      target: contracts.id,
      set: contract,
    });
    await db.delete(contractPayments).where(eq(contractPayments.contractId, contract.id));
    if (payments.length) await db.insert(contractPayments).values(payments);
  }
}

async function removeResource(value: ReturnType<typeof parseAuditSnapshot>) {
  if (!value) return;
  const db = getDb();
  const data = value.data as Record<string, unknown> | null;
  if (value.resource === "activity_update") {
    await db.delete(activityUpdates).where(eq(activityUpdates.activityKey, String(data?.activityKey ?? "")));
  } else if (value.resource === "workplan_record") {
    await db.delete(workplanRecords).where(eq(workplanRecords.id, String(data?.id ?? "")));
  } else if (value.resource === "finance_entry") {
    await db.delete(financeEntries).where(eq(financeEntries.id, Number(data?.id)));
  } else if (value.resource === "team_member") {
    await db.delete(teamMembers).where(eq(teamMembers.id, String(data?.id ?? "")));
  } else if (value.resource === "contract") {
    const contract = data?.contract as Record<string, unknown> | undefined;
    const id = String(contract?.id ?? "");
    await db.delete(contractPayments).where(eq(contractPayments.contractId, id));
    await db.delete(contracts).where(eq(contracts.id, id));
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const params = new URL(request.url).searchParams;
    const entityType = params.get("entityType")?.trim() ?? "";
    const entityKey = params.get("entityKey")?.trim() ?? "";
    if (!entityTypes.has(entityType) || !entityKey) {
      return Response.json({ error: "Choose a valid record." }, { status: 400 });
    }
    if (entityType === "team" && !session.isAdmin) {
      return Response.json({ error: "Administrator access is required." }, { status: 403 });
    }
    const rows = await getDb()
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityKey, entityKey)))
      .orderBy(desc(auditLogs.changedAt));
    return Response.json({
      history: rows.map((row) => ({
        ...row,
        previousValue: parseAuditSnapshot(row.previousValue),
        newValue: parseAuditSnapshot(row.newValue),
      })),
    });
  } catch (error) {
    console.error("Unable to load audit history", error);
    return Response.json({ error: auditError(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { id?: unknown };
    const id = String(payload.id ?? "").trim();
    const [entry] = await getDb().select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
    if (!entry) return Response.json({ error: "History entry not found." }, { status: 404 });
    const previous = parseAuditSnapshot(entry.previousValue);
    const next = parseAuditSnapshot(entry.newValue);
    const current = await currentSnapshot((previous ?? next)?.resource ?? "", (previous ?? next)?.data);
    if (previous) await restoreSnapshot(previous);
    else await removeResource(next);
    await writeAuditLog({
      entityType: entry.entityType as "activity" | "finance" | "contract" | "team",
      entityKey: entry.entityKey,
      action: "restored",
      previousValue: current,
      newValue: previous,
      changedBy: session.email,
    });
    return Response.json({ restored: true });
  } catch (error) {
    console.error("Unable to restore audit history", error);
    return Response.json({ error: auditError(error) }, { status: 503 });
  }
}
