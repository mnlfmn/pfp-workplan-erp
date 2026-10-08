import { desc } from "drizzle-orm";

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
  systemMetadata,
  teamMembers,
  workplanRecords,
  workplanYears,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/app-auth";
import {
  backupTableCounts,
  createBackupSnapshot,
  readBackupSnapshot,
} from "@/lib/backups";

function storageMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("BUCKET") || message.includes("no such table")) {
    return "Backup storage is being prepared.";
  }
  return "Backups are temporarily unavailable.";
}

export async function GET(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const backups = await getDb()
      .select()
      .from(backupSnapshots)
      .orderBy(desc(backupSnapshots.createdAt));
    return Response.json({ backups });
  } catch (error) {
    console.error("Unable to list backups", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const input = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      id?: unknown;
      confirmId?: unknown;
      source?: unknown;
    };
    const action = String(input.action ?? "create");
    if (action === "create") {
      const result = await createBackupSnapshot(
        session.email,
        input.source === "scheduled" ? "scheduled" : "manual",
      );
      return Response.json(result, { status: result.created ? 201 : 200 });
    }

    const id = String(input.id ?? "").trim();
    const backup = await readBackupSnapshot(id);
    if (!backup) return Response.json({ error: "Backup not found." }, { status: 404 });
    if (action === "preview") {
      return Response.json({
        backup: backup.metadata,
        counts: backupTableCounts(backup.payload),
      });
    }
    if (action !== "restore" || String(input.confirmId ?? "") !== id) {
      return Response.json({ error: "Preview and confirm the selected backup before restoring." }, { status: 400 });
    }

    const db = getDb();
    await db.delete(auditLogs);
    await db.delete(paymentDocuments);
    await db.delete(contractPayments);
    await db.delete(contracts);
    await db.delete(budgetAllocations);
    await db.delete(workplanRecords);
    await db.delete(workplanYears);
    await db.delete(financeEntries);
    await db.delete(quarterlyUpdates);
    await db.delete(activityUpdates);
    await db.delete(systemMetadata);
    await db.delete(teamMembers);
    const tables = backup.payload.tables;
    for (let index = 0; index < tables.teamMembers.length; index += 20) {
      await db.insert(teamMembers).values(tables.teamMembers.slice(index, index + 20));
    }
    for (let index = 0; index < tables.workplanYears.length; index += 20) {
      await db.insert(workplanYears).values(tables.workplanYears.slice(index, index + 20));
    }
    for (let index = 0; index < tables.workplanRecords.length; index += 20) {
      await db.insert(workplanRecords).values(tables.workplanRecords.slice(index, index + 20));
    }
    for (let index = 0; index < tables.activityUpdates.length; index += 20) {
      await db.insert(activityUpdates).values(tables.activityUpdates.slice(index, index + 20));
    }
    for (let index = 0; index < tables.quarterlyUpdates.length; index += 20) {
      await db.insert(quarterlyUpdates).values(tables.quarterlyUpdates.slice(index, index + 20));
    }
    for (let index = 0; index < tables.financeEntries.length; index += 20) {
      await db.insert(financeEntries).values(tables.financeEntries.slice(index, index + 20));
    }
    for (let index = 0; index < tables.budgetAllocations.length; index += 20) {
      await db.insert(budgetAllocations).values(tables.budgetAllocations.slice(index, index + 20));
    }
    for (let index = 0; index < tables.contracts.length; index += 20) {
      await db.insert(contracts).values(tables.contracts.slice(index, index + 20));
    }
    for (let index = 0; index < tables.contractPayments.length; index += 20) {
      await db.insert(contractPayments).values(tables.contractPayments.slice(index, index + 20));
    }
    for (let index = 0; index < tables.paymentDocuments.length; index += 20) {
      await db.insert(paymentDocuments).values(tables.paymentDocuments.slice(index, index + 20));
    }
    for (let index = 0; index < tables.auditLogs.length; index += 20) {
      await db.insert(auditLogs).values(tables.auditLogs.slice(index, index + 20));
    }
    const metadataRows = tables.systemMetadata ?? [];
    for (let index = 0; index < metadataRows.length; index += 20) {
      await db.insert(systemMetadata).values(metadataRows.slice(index, index + 20));
    }
    return Response.json({
      restored: true,
      backup: backup.metadata,
      counts: backupTableCounts(backup.payload),
    });
  } catch (error) {
    console.error("Unable to create or restore backup", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
