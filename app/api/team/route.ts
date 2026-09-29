import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activityUpdates, teamMembers, workplanRecords } from "@/db/schema";
import {
  defaultTeamMembers,
  type TeamMember,
} from "@/lib/team-members";
import workplan from "@/lib/workplan-data.json";

type TeamMemberRow = typeof teamMembers.$inferSelect;

function message(error: unknown) {
  const text = error instanceof Error ? error.message : "Unexpected error";
  if (text.includes("no such table") || text.includes("team_members")) {
    return "Team management is being prepared. The default roster remains available.";
  }
  return "Team information is temporarily unavailable.";
}

function parseAliases(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function rowToMember(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    group: row.group === "Workplan" ? "Workplan" : "PCU",
    aliases: parseAliases(row.aliases),
  };
}

function mergeMembers(rows: TeamMemberRow[]) {
  const overrides = new Map(rows.map((row) => [row.id, row]));
  const defaultIds = new Set(defaultTeamMembers.map((member) => member.id));
  const members = defaultTeamMembers.flatMap((member) => {
    const override = overrides.get(member.id);
    if (override?.isDeleted) return [];
    return [override ? rowToMember(override) : member];
  });
  for (const row of rows) {
    if (!defaultIds.has(row.id) && !row.isDeleted) members.push(rowToMember(row));
  }
  return members.sort(
    (a, b) =>
      a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
  );
}

function normalizePayload(payload: {
  name?: unknown;
  role?: unknown;
  group?: unknown;
  aliases?: unknown;
}) {
  const name = String(payload.name ?? "").trim();
  const role = String(payload.role ?? "").trim();
  const group = payload.group === "Workplan" ? "Workplan" : "PCU";
  const aliases = Array.isArray(payload.aliases)
    ? Array.from(
        new Set(
          payload.aliases
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      )
    : [];
  if (!name || name.length > 120) {
    return { error: "Enter a team member name of up to 120 characters." } as const;
  }
  if (role.length > 200) {
    return { error: "Keep the role under 200 characters." } as const;
  }
  if (aliases.length > 30 || aliases.some((alias) => alias.length > 100)) {
    return { error: "Keep aliases to 30 short names or fewer." } as const;
  }
  return { name, role, group, aliases } as const;
}

function authenticatedUser(request: Request) {
  return (
    request.headers.get("oai-authenticated-user-email") ??
    request.headers.get("oai-authenticated-user-id") ??
    ""
  );
}

function safePayload(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function matchesMember(value: string, member: TeamMember) {
  const normalized = value.trim().toLocaleLowerCase();
  if (!normalized) return false;
  return [member.name, ...member.aliases].some((alias) =>
    normalized.includes(alias.toLocaleLowerCase()),
  );
}

const statusWeight: Record<string, number> = {
  completed: 100,
  in_progress: 55,
  delayed: 35,
  on_hold: 20,
  not_started: 0,
  not_reported: 0,
};

export async function GET() {
  try {
    const rows = await getDb().select().from(teamMembers);
    return Response.json({ members: mergeMembers(rows) });
  } catch (error) {
    console.error("Unable to load team members", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const values = normalizePayload(payload);
    if ("error" in values) {
      return Response.json({ error: values.error }, { status: 400 });
    }
    const db = getDb();
    const current = mergeMembers(await db.select().from(teamMembers));
    if (
      current.some(
        (member) => member.name.toLocaleLowerCase() === values.name.toLocaleLowerCase(),
      )
    ) {
      return Response.json({ error: "A team member with this name already exists." }, { status: 409 });
    }
    const now = new Date().toISOString();
    const id = `member-${crypto.randomUUID()}`;
    const [row] = await db
      .insert(teamMembers)
      .values({
        id,
        name: values.name,
        role: values.role,
        group: values.group,
        aliases: JSON.stringify(values.aliases),
        isDeleted: 0,
        createdAt: now,
        updatedAt: now,
        updatedBy: authenticatedUser(request),
      })
      .returning();
    return Response.json({ member: rowToMember(row) }, { status: 201 });
  } catch (error) {
    console.error("Unable to add team member", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const id = String(payload.id ?? "").trim();
    if (!id || id.length > 100) {
      return Response.json({ error: "A valid team member is required." }, { status: 400 });
    }
    const values = normalizePayload(payload);
    if ("error" in values) {
      return Response.json({ error: values.error }, { status: 400 });
    }
    const db = getDb();
    const existingRows = await db.select().from(teamMembers);
    const current = mergeMembers(existingRows);
    if (!current.some((member) => member.id === id)) {
      return Response.json({ error: "Team member not found." }, { status: 404 });
    }
    if (
      current.some(
        (member) =>
          member.id !== id &&
          member.name.toLocaleLowerCase() === values.name.toLocaleLowerCase(),
      )
    ) {
      return Response.json({ error: "A team member with this name already exists." }, { status: 409 });
    }
    const existing = existingRows.find((row) => row.id === id);
    const now = new Date().toISOString();
    const stored = {
      id,
      name: values.name,
      role: values.role,
      group: values.group,
      aliases: JSON.stringify(values.aliases),
      isDeleted: 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      updatedBy: authenticatedUser(request),
    };
    await db
      .insert(teamMembers)
      .values(stored)
      .onConflictDoUpdate({ target: teamMembers.id, set: stored });
    const [row] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);
    return Response.json({ member: rowToMember(row) });
  } catch (error) {
    console.error("Unable to update team member", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as { id?: unknown };
    const id = String(payload.id ?? "").trim();
    const db = getDb();
    const rows = await db.select().from(teamMembers);
    const current = mergeMembers(rows);
    const member = current.find((item) => item.id === id);
    if (!member) {
      return Response.json({ error: "Team member not found." }, { status: 404 });
    }
    const existing = rows.find((row) => row.id === id);
    const now = new Date().toISOString();
    const stored = {
      id,
      name: member.name,
      role: member.role,
      group: member.group,
      aliases: JSON.stringify(member.aliases),
      isDeleted: 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      updatedBy: authenticatedUser(request),
    };
    await db
      .insert(teamMembers)
      .values(stored)
      .onConflictDoUpdate({ target: teamMembers.id, set: stored });

    const [savedUpdates, planRecords] = await Promise.all([
      db.select().from(activityUpdates),
      db.select().from(workplanRecords),
    ]);
    const updateMap = new Map(savedUpdates.map((item) => [item.activityKey, item]));
    const candidates = new Map<
      string,
      { owner: string; status: string; progress: number }
    >();

    for (const activity of workplan.activities) {
      candidates.set(activity.id, {
        owner: activity.technicalLead || activity.lead || "",
        status: activity.status,
        progress: activity.progress,
      });
      for (const subactivity of activity.subactivities) {
        candidates.set(subactivity.id, {
          owner: subactivity.owner || "",
          status: subactivity.status,
          progress: statusWeight[subactivity.status] ?? 0,
        });
      }
    }

    for (const record of planRecords) {
      if (
        record.isDeleted ||
        !["activity", "subactivity"].includes(record.recordType)
      ) {
        continue;
      }
      const data = safePayload(record.payload);
      const current = candidates.get(record.recordKey);
      const status = String(data.status ?? current?.status ?? "not_reported");
      candidates.set(record.recordKey, {
        owner:
          record.recordType === "activity"
            ? String(data.technicalLead ?? data.lead ?? current?.owner ?? "")
            : String(data.owner ?? current?.owner ?? ""),
        status: status in statusWeight ? status : "not_reported",
        progress: Number(data.progress ?? current?.progress ?? statusWeight[status] ?? 0),
      });
    }

    const clearedUpdates: Array<typeof activityUpdates.$inferSelect> = [];
    const candidateKeys = new Set([
      ...candidates.keys(),
      ...savedUpdates.map((item) => item.activityKey),
    ]);
    for (const activityKey of candidateKeys) {
      const existingUpdate = updateMap.get(activityKey);
      const candidate = candidates.get(activityKey);
      const effectiveOwner = existingUpdate
        ? existingUpdate.owner
        : candidate?.owner ?? "";
      if (!matchesMember(effectiveOwner, member)) continue;
      const values = {
        activityKey,
        status: existingUpdate?.status ?? candidate?.status ?? "not_reported",
        progress: Math.max(
          0,
          Math.min(100, Math.round(existingUpdate?.progress ?? candidate?.progress ?? 0)),
        ),
        note: existingUpdate?.note ?? "",
        supportNeeded: existingUpdate?.supportNeeded ?? "",
        owner: "",
        updatedAt: now,
        updatedBy: authenticatedUser(request),
      };
      const [cleared] = await db
        .insert(activityUpdates)
        .values(values)
        .onConflictDoUpdate({
          target: activityUpdates.activityKey,
          set: values,
        })
        .returning();
      clearedUpdates.push(cleared);
    }

    return Response.json({ deletedId: id, clearedUpdates });
  } catch (error) {
    console.error("Unable to remove team member", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}
