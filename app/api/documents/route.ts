import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { paymentDocuments } from "@/db/schema";
import { requireAdminSession, requireAppSession } from "@/lib/app-auth";
import { getBucket } from "@/lib/storage";

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || "document";
}

function storageMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("BUCKET") || message.includes("no such table")) {
    return "Payment document storage is being prepared.";
  }
  return "Payment documents are temporarily unavailable.";
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const params = new URL(request.url).searchParams;
    const id = params.get("id")?.trim() ?? "";
    if (id && params.get("download") === "1") {
      const [document] = await getDb()
        .select()
        .from(paymentDocuments)
        .where(eq(paymentDocuments.id, id))
        .limit(1);
      if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
      const object = await getBucket().get(document.objectKey);
      if (!object) return Response.json({ error: "Stored document not found." }, { status: 404 });
      return new Response(object.body, {
        headers: {
          "content-type": document.contentType || "application/octet-stream",
          "content-length": String(document.sizeBytes),
          "content-disposition": `attachment; filename="${safeFileName(document.fileName)}"`,
          "cache-control": "private, no-store",
        },
      });
    }
    const paymentId = params.get("paymentId")?.trim() ?? "";
    const contractId = params.get("contractId")?.trim() ?? "";
    if (!paymentId && !contractId) {
      return Response.json({ documents: [] });
    }
    const condition = paymentId
      ? eq(paymentDocuments.paymentId, paymentId)
      : eq(paymentDocuments.contractId, contractId);
    const documents = await getDb()
      .select()
      .from(paymentDocuments)
      .where(condition)
      .orderBy(asc(paymentDocuments.uploadedAt));
    return Response.json({ documents });
  } catch (error) {
    console.error("Unable to load payment documents", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { id?: unknown };
    const id = String(payload.id ?? "").trim();
    const [document] = await getDb()
      .select()
      .from(paymentDocuments)
      .where(eq(paymentDocuments.id, id))
      .limit(1);
    if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
    await getBucket().delete(document.objectKey);
    await getDb().delete(paymentDocuments).where(eq(paymentDocuments.id, id));
    return Response.json({ deletedId: id });
  } catch (error) {
    console.error("Unable to remove payment document", error);
    return Response.json({ error: storageMessage(error) }, { status: 503 });
  }
}
