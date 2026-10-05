import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditEntityType = "activity" | "finance" | "contract" | "team";

export type AuditSnapshot = {
  resource: "activity_update" | "workplan_record" | "finance_entry" | "contract" | "team_member";
  data: unknown;
};

export function snapshot(resource: AuditSnapshot["resource"], data: unknown) {
  return { resource, data } satisfies AuditSnapshot;
}

export function parseAuditSnapshot(value: string): AuditSnapshot | null {
  try {
    const parsed = JSON.parse(value) as Partial<AuditSnapshot> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.resource) return null;
    return parsed as AuditSnapshot;
  } catch {
    return null;
  }
}

export async function writeAuditLog(input: {
  entityType: AuditEntityType;
  entityKey: string;
  action: string;
  previousValue: AuditSnapshot | null;
  newValue: AuditSnapshot | null;
  changedBy: string;
}) {
  const changedAt = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    entityType: input.entityType,
    entityKey: input.entityKey,
    action: input.action,
    previousValue: JSON.stringify(input.previousValue),
    newValue: JSON.stringify(input.newValue),
    changedAt,
    changedBy: input.changedBy,
  };
  await getDb().insert(auditLogs).values(row);
  return row;
}
