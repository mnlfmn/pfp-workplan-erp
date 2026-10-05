import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  activityUpdates,
  auditLogs,
  backupSnapshots,
  budgetAllocations,
  contractPayments,
  contracts,
  financeEntries,
  paymentDocuments,
  quarterlyUpdates,
  teamMembers,
  workplanRecords,
  workplanYears,
} from "@/db/schema";
import { getBucket } from "@/lib/storage";

export type BackupPayload = {
  version: 1;
  createdAt: string;
  createdBy: string;
  tables: {
    activityUpdates: Array<typeof activityUpdates.$inferSelect>;
    quarterlyUpdates: Array<typeof quarterlyUpdates.$inferSelect>;
    financeEntries: Array<typeof financeEntries.$inferSelect>;
    teamMembers: Array<typeof teamMembers.$inferSelect>;
    workplanYears: Array<typeof workplanYears.$inferSelect>;
    workplanRecords: Array<typeof workplanRecords.$inferSelect>;
    budgetAllocations: Array<typeof budgetAllocations.$inferSelect>;
    contracts: Array<typeof contracts.$inferSelect>;
    contractPayments: Array<typeof contractPayments.$inferSelect>;
    paymentDocuments: Array<typeof paymentDocuments.$inferSelect>;
    auditLogs: Array<typeof auditLogs.$inferSelect>;
  };
};

export function backupTableCounts(payload: BackupPayload) {
  return Object.fromEntries(
    Object.entries(payload.tables).map(([name, rows]) => [name, rows.length]),
  );
}

function localDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export async function readBackupSnapshot(id: string) {
  const [metadata] = await getDb()
    .select()
    .from(backupSnapshots)
    .where(eq(backupSnapshots.id, id))
    .limit(1);
  if (!metadata) return null;
  const object = await getBucket().get(metadata.objectKey);
  if (!object) return null;
  return { metadata, payload: (await object.json()) as BackupPayload };
}

export async function createBackupSnapshot(
  createdBy: string,
  source: "manual" | "scheduled" = "manual",
) {
  const db = getDb();
  const createdAt = new Date().toISOString();

  if (source === "scheduled") {
    const existing = (await db.select().from(backupSnapshots)).find(
      (item) =>
        item.source === "scheduled" &&
        localDate(item.createdAt) === localDate(createdAt),
    );
    if (existing) {
      const stored = await readBackupSnapshot(existing.id);
      return {
        backup: existing,
        counts: stored ? backupTableCounts(stored.payload) : {},
        created: false,
      };
    }
  }

  const [
    activityRows,
    quarterlyRows,
    financeRows,
    teamRows,
    yearRows,
    workplanRows,
    allocationRows,
    contractRows,
    paymentRows,
    documentRows,
    auditRows,
  ] = await Promise.all([
    db.select().from(activityUpdates),
    db.select().from(quarterlyUpdates),
    db.select().from(financeEntries),
    db.select().from(teamMembers),
    db.select().from(workplanYears),
    db.select().from(workplanRecords),
    db.select().from(budgetAllocations),
    db.select().from(contracts),
    db.select().from(contractPayments),
    db.select().from(paymentDocuments),
    db.select().from(auditLogs),
  ]);
  const id = crypto.randomUUID();
  const payload: BackupPayload = {
    version: 1,
    createdAt,
    createdBy,
    tables: {
      activityUpdates: activityRows,
      quarterlyUpdates: quarterlyRows,
      financeEntries: financeRows,
      teamMembers: teamRows,
      workplanYears: yearRows,
      workplanRecords: workplanRows,
      budgetAllocations: allocationRows,
      contracts: contractRows,
      contractPayments: paymentRows,
      paymentDocuments: documentRows,
      auditLogs: auditRows,
    },
  };
  const recordCount = Object.values(payload.tables).reduce(
    (total, rows) => total + rows.length,
    0,
  );
  const objectKey = `backups/${createdAt.slice(0, 10)}/${id}.json`;
  await getBucket().put(objectKey, JSON.stringify(payload), {
    httpMetadata: { contentType: "application/json" },
  });
  const [backup] = await db
    .insert(backupSnapshots)
    .values({
      id,
      objectKey,
      createdAt,
      createdBy,
      source,
      recordCount,
    })
    .returning();

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const oldRows = (await db.select().from(backupSnapshots)).filter(
    (item) => item.createdAt < cutoff,
  );
  for (const old of oldRows) {
    await getBucket().delete(old.objectKey);
    await db.delete(backupSnapshots).where(eq(backupSnapshots.id, old.id));
  }

  return { backup, counts: backupTableCounts(payload), created: true };
}
