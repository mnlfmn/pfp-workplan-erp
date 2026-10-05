import { desc } from "drizzle-orm";

import { getDb } from "@/db";
import { backupSnapshots } from "@/db/schema";
import { requireAdminSession } from "@/lib/app-auth";
import { createBackupSnapshot } from "@/lib/backups";

type McpRequest = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

function rpcResult(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return Response.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status },
  );
}

const tools = [
  {
    name: "create_daily_backup",
    title: "Create daily ERP backup",
    description:
      "Create today's deduplicated PFP ERP data backup. This is restricted to administrators and retains daily snapshots for 30 days.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_backup_status",
    title: "Check ERP backup status",
    description:
      "Return the latest PFP ERP backup date and record count. This is restricted to administrators.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
] as const;

export async function POST(request: Request) {
  let message: McpRequest;
  try {
    message = (await request.json()) as McpRequest;
  } catch {
    return rpcError(null, -32700, "Parse error", 400);
  }

  const method = String(message.method ?? "");
  if (method === "initialize") {
    const params =
      message.params && typeof message.params === "object"
        ? (message.params as Record<string, unknown>)
        : {};
    return rpcResult(message.id, {
      protocolVersion: String(params.protocolVersion ?? "2025-03-26"),
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "PFP ERP System", version: "1.0.0" },
    });
  }
  if (method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }
  if (method === "tools/list") {
    return rpcResult(message.id, { tools });
  }
  if (method !== "tools/call") {
    return rpcError(message.id, -32601, "Method not found");
  }

  const session = await requireAdminSession(request);
  if (session instanceof Response) return session;
  const params =
    message.params && typeof message.params === "object"
      ? (message.params as Record<string, unknown>)
      : {};
  const name = String(params.name ?? "");

  try {
    if (name === "create_daily_backup") {
      const result = await createBackupSnapshot(session.email, "scheduled");
      const text = result.created
        ? `Daily backup created with ${result.backup.recordCount} records.`
        : `Today's daily backup already exists with ${result.backup.recordCount} records.`;
      return rpcResult(message.id, {
        content: [{ type: "text", text }],
        structuredContent: {
          backup: result.backup,
          counts: result.counts,
          created: result.created,
        },
      });
    }
    if (name === "get_backup_status") {
      const [latest] = await getDb()
        .select()
        .from(backupSnapshots)
        .orderBy(desc(backupSnapshots.createdAt))
        .limit(1);
      return rpcResult(message.id, {
        content: [
          {
            type: "text",
            text: latest
              ? `Latest backup: ${latest.createdAt}; ${latest.recordCount} records; source ${latest.source}.`
              : "No backups have been created yet.",
          },
        ],
        structuredContent: { latest: latest ?? null },
      });
    }
    return rpcError(message.id, -32602, "Unknown tool");
  } catch (error) {
    console.error("MCP backup tool failed", error);
    return rpcResult(message.id, {
      content: [{ type: "text", text: "The backup operation failed." }],
      isError: true,
    });
  }
}
