import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { systemMetadata } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";
import {
  defaultMetadata,
  metadataCategories,
  type MetadataCategory,
  type MetadataOption,
} from "@/lib/system-metadata";

function isCategory(value: string): value is MetadataCategory {
  return metadataCategories.includes(value as MetadataCategory);
}

function normalizeRows(rows: Array<typeof systemMetadata.$inferSelect>) {
  return Object.fromEntries(
    metadataCategories.map((category) => {
      const saved = rows
        .filter((row) => row.category === category)
        .map((row) => ({
          id: row.id,
          category,
          value: row.value,
          label: row.label,
          sortOrder: row.sortOrder,
        }));
      return [category, saved.length ? saved : defaultMetadata[category]];
    }),
  ) as Record<MetadataCategory, MetadataOption[]>;
}

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const rows = await getDb()
      .select()
      .from(systemMetadata)
      .orderBy(asc(systemMetadata.category), asc(systemMetadata.sortOrder));
    return Response.json({ metadata: normalizeRows(rows) });
  } catch (error) {
    console.error("Unable to load metadata", error);
    return Response.json({ metadata: defaultMetadata, warning: "Saved metadata is temporarily unavailable." });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    if (!session.isAdmin) {
      return Response.json({ error: "Administrator access is required." }, { status: 403 });
    }
    const payload = (await request.json()) as {
      category?: string;
      options?: Array<{ value?: string; label?: string }>;
    };
    const category = String(payload.category ?? "");
    if (!isCategory(category)) {
      return Response.json({ error: "Choose a valid metadata category." }, { status: 400 });
    }
    const incoming = Array.isArray(payload.options) ? payload.options : [];
    if (!incoming.length || incoming.length > 40) {
      return Response.json({ error: "Keep at least one and no more than 40 options." }, { status: 400 });
    }
    const unique = new Map<string, string>();
    for (const item of incoming) {
      const value = String(item.value ?? "").trim().slice(0, 100);
      const label = String(item.label ?? "").trim().slice(0, 160);
      if (!value || !label || unique.has(value)) {
        return Response.json({ error: "Each option needs a unique value and a label." }, { status: 400 });
      }
      unique.set(value, label);
    }
    const now = new Date().toISOString();
    const db = getDb();
    await db.delete(systemMetadata).where(eq(systemMetadata.category, category));
    await db.insert(systemMetadata).values(
      [...unique.entries()].map(([value, label], sortOrder) => ({
        id: `${category}:${value}`,
        category,
        value,
        label,
        sortOrder,
        updatedAt: now,
        updatedBy: session.email,
      })),
    );
    const rows = await db
      .select()
      .from(systemMetadata)
      .orderBy(asc(systemMetadata.category), asc(systemMetadata.sortOrder));
    return Response.json({ metadata: normalizeRows(rows) });
  } catch (error) {
    console.error("Unable to save metadata", error);
    return Response.json({ error: "Metadata could not be saved." }, { status: 503 });
  }
}
