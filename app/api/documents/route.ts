import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { contractPayments, paymentDocuments } from "@/db/schema";
import { requireAdminSession, requireAppSession } from "@/lib/app-auth";
import { getBucket } from "@/lib/storage";

const maxBytes = 20 * 1024 * 1024;
const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "xlsx"]);

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

export async function POST(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const form = await request.formData();
    const contractId = String(form.get("contractId") ?? "").trim();
    const paymentId = String(form.get("paymentId") ?? "").trim();
    const file = form.get("file");
    if (!contractId || !paymentId || !(file instanceof File)) {
      return Response.json({ error: "Choose a payment and document." }, { status: 400 });
    }
    if (!file.size || file.size > maxBytes) {
      return Response.json({ error: "The document must be smaller than 20 MB." }, { status: 400 });
    }
    const extension = file.name.split(".").pop()?.toLocaleLowerCase() ?? "";
    if (!allowedExtensions.has(extension)) {
      return Response.json({ error: "Upload a PDF, JPG, PNG, or XLSX file." }, { status: 400 });
    }
    const [payment] = await getDb()
      .select()
      .from(contractPayments)
      .where(
        and(
          eq(contractPayments.id, paymentId),
          eq(contractPayments.contractId, contractId),
        ),
      )
      .limit(1);
    if (!payment) {
      return Response.json({ error: "The selected contract payment was not found." }, { status: 404 });
    }
    const id = crypto.randomUUID();
    const fileName = safeFileName(file.name);
    const objectKey = `payments/${contractId}/${paymentId}/${id}-${fileName}`;
    await getBucket().put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { uploadedBy: session.email, fileName },
    });
    const [document] = await getDb()
      .insert(paymentDocuments)
      .values({
        id,
        contractId,
        paymentId,
        objectKey,
        fileName,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: session.email,
      })
      .returning();
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Unable to upload payment document", error);
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
