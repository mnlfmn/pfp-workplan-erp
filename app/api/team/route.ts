import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/db";
import {
  activityUpdates,
  systemMetadata,
  teamMembers,
  workplanRecords,
} from "@/db/schema";
import {
  defaultTeamMembers,
  type TeamMember,
} from "@/lib/team-members";
import {
  requireAdminSession,
  requireAppSession,
  type AppSession,
} from "@/lib/app-auth";
import workplan from "@/lib/workplan-data.json";
import { snapshot, writeAuditLog } from "@/lib/audit-log";
import { defaultMetadata } from "@/lib/system-metadata";

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
    group: row.group || "PCU",
    aliases: parseAliases(row.aliases),
    email: row.email,
    accessRole: row.accessRole === "admin" ? "admin" : "member",
    inviteStatus:
      row.inviteStatus === "active"
        ? "active"
        : row.inviteStatus === "invited"
          ? "invited"
          : "not_invited",
    inviteSentAt: row.inviteSentAt,
    lastSignedInAt: row.lastSignedInAt,
    kpiReviewerId: row.kpiReviewerId,
    kpiApproverId: row.kpiApproverId,
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
  email?: unknown;
  accessRole?: unknown;
  kpiReviewerId?: unknown;
  kpiApproverId?: unknown;
}) {
  const name = String(payload.name ?? "").trim();
  const role = String(payload.role ?? "").trim();
  const group = String(payload.group ?? "").trim();
  const aliases = Array.isArray(payload.aliases)
    ? Array.from(
        new Set(
          payload.aliases
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      )
    : [];
  const email = String(payload.email ?? "").trim().toLocaleLowerCase();
  const accessRole = payload.accessRole === "admin" ? "admin" : "member";
  const kpiReviewerId = String(payload.kpiReviewerId ?? "").trim();
  const kpiApproverId = String(payload.kpiApproverId ?? "").trim();
  if (!name || name.length > 120) {
    return { error: "Enter a team member name of up to 120 characters." } as const;
  }
  if (role.length > 200) {
    return { error: "Keep the role under 200 characters." } as const;
  }
  if (!group || group.length > 100) {
    return { error: "Choose a valid member type." } as const;
  }
  if (aliases.length > 30 || aliases.some((alias) => alias.length > 100)) {
    return { error: "Keep aliases to 30 short names or fewer." } as const;
  }
  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return { error: "Enter a valid email address." } as const;
  }
  if (kpiReviewerId.length > 160 || kpiApproverId.length > 160) {
    return { error: "Choose valid Supervisor and MNLF CEO assignments." } as const;
  }
  if (kpiReviewerId && kpiReviewerId === kpiApproverId) {
    return { error: "Choose different people for KPI review and approval." } as const;
  }
  return {
    name,
    role,
    group,
    aliases,
    email,
    accessRole,
    kpiReviewerId,
    kpiApproverId,
  } as const;
}

function validateKpiAssignments(
  memberId: string,
  reviewerId: string,
  approverId: string,
  members: TeamMember[],
) {
  if (reviewerId === memberId || approverId === memberId) {
    return "A team member cannot be their own Supervisor or MNLF CEO approver.";
  }
  const activeIds = new Set(members.map((member) => member.id));
  if (reviewerId && !activeIds.has(reviewerId)) {
    return "Choose an active team member as Supervisor.";
  }
  if (approverId && !activeIds.has(approverId)) {
    return "Choose an active team member as MNLF CEO.";
  }
  return "";
}

async function validMemberType(value: string) {
  const saved = await getDb()
    .select({ value: systemMetadata.value })
    .from(systemMetadata)
    .where(eq(systemMetadata.category, "member_type"));
  const allowed = saved.length
    ? saved.map((item) => item.value)
    : defaultMetadata.member_type.map((item) => item.value);
  return allowed.includes(value);
}

function memberForSession(member: TeamMember, session: AppSession) {
  if (session.isAdmin || session.memberId === member.id) return member;
  return {
    ...member,
    email: "",
    accessRole: "member" as const,
    inviteStatus: member.email ? ("invited" as const) : ("not_invited" as const),
    inviteSentAt: "",
    lastSignedInAt: "",
  };
}

async function remainingAdminCount(excludingId = "") {
  const where = excludingId
    ? and(
        eq(teamMembers.isDeleted, 0),
        eq(teamMembers.accessRole, "admin"),
        ne(teamMembers.id, excludingId),
      )
    : and(eq(teamMembers.isDeleted, 0), eq(teamMembers.accessRole, "admin"));
  const rows = await getDb()
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(where);
  return rows.length;
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

function removeMemberFromOwners(value: string, member: TeamMember) {
  const owners = value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  if (owners.length > 1) {
    return owners
      .filter((owner) => !matchesMember(owner, member))
      .slice(0, 3)
      .join(" | ");
  }
  return matchesMember(value, member) ? "" : value;
}

const statusWeight: Record<string, number> = {
  completed: 100,
  in_progress: 55,
  delayed: 35,
  on_hold: 20,
  not_started: 0,
  not_reported: 0,
};

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;
    const rows = await getDb().select().from(teamMembers);
    return Response.json({
      members: mergeMembers(rows).map((member) => memberForSession(member, session)),
    });
  } catch (error) {
    console.error("Unable to load team members", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as Record<string, unknown>;
    const values = normalizePayload(payload);
    if ("error" in values) {
      return Response.json({ error: values.error }, { status: 400 });
    }
    if (!(await validMemberType(values.group))) {
      return Response.json({ error: "Choose a valid member type." }, { status: 400 });
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
    if (
      values.email &&
      current.some((member) => member.email === values.email)
    ) {
      return Response.json({ error: "That email is already assigned to another team member." }, { status: 409 });
    }
    const now = new Date().toISOString();
    const id = `member-${crypto.randomUUID()}`;
    const assignmentError = validateKpiAssignments(
      id,
      values.kpiReviewerId,
      values.kpiApproverId,
      current,
    );
    if (assignmentError) {
      return Response.json({ error: assignmentError }, { status: 400 });
    }
    const [row] = await db
      .insert(teamMembers)
      .values({
        id,
        name: values.name,
        role: values.role,
        group: values.group,
        aliases: JSON.stringify(values.aliases),
        email: values.email,
        accessRole: values.accessRole,
        inviteStatus: "not_invited",
        inviteSentAt: "",
        lastSignedInAt: "",
        kpiReviewerId: values.kpiReviewerId,
        kpiApproverId: values.kpiApproverId,
        isDeleted: 0,
        createdAt: now,
        updatedAt: now,
        updatedBy: session.email,
      })
      .returning();
    await writeAuditLog({
      entityType: "team",
      entityKey: row.id,
      action: "created",
      previousValue: null,
      newValue: snapshot("team_member", row),
      changedBy: session.email,
    });
    return Response.json({ member: rowToMember(row) }, { status: 201 });
  } catch (error) {
    console.error("Unable to add team member", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as Record<string, unknown>;
    const id = String(payload.id ?? "").trim();
    if (!id || id.length > 100) {
      return Response.json({ error: "A valid team member is required." }, { status: 400 });
    }
    const values = normalizePayload(payload);
    if ("error" in values) {
      return Response.json({ error: values.error }, { status: 400 });
    }
    if (!(await validMemberType(values.group))) {
      return Response.json({ error: "Choose a valid member type." }, { status: 400 });
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
    if (
      values.email &&
      current.some(
        (member) => member.id !== id && member.email === values.email,
      )
    ) {
      return Response.json({ error: "That email is already assigned to another team member." }, { status: 409 });
    }
    const existing = existingRows.find((row) => row.id === id);
    const currentMember = current.find((member) => member.id === id)!;
    const assignmentError = validateKpiAssignments(
      id,
      values.kpiReviewerId,
      values.kpiApproverId,
      current,
    );
    if (assignmentError) {
      return Response.json({ error: assignmentError }, { status: 400 });
    }
    if (
      existing?.accessRole === "admin" &&
      values.accessRole !== "admin" &&
      (await remainingAdminCount(id)) === 0
    ) {
      return Response.json(
        { error: "Assign another administrator before removing the last admin role." },
        { status: 400 },
      );
    }
    const now = new Date().toISOString();
    const emailChanged = (existing?.email ?? "") !== values.email;
    const stored = {
      id,
      name: values.name,
      role: values.role,
      group: values.group,
      aliases: JSON.stringify(values.aliases),
      email: values.email,
      accessRole: values.accessRole,
      inviteStatus: emailChanged
        ? "not_invited"
        : existing?.inviteStatus ?? "not_invited",
      inviteSentAt: emailChanged ? "" : existing?.inviteSentAt ?? "",
      lastSignedInAt: emailChanged ? "" : existing?.lastSignedInAt ?? "",
      kpiReviewerId: values.kpiReviewerId,
      kpiApproverId: values.kpiApproverId,
      isDeleted: 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      updatedBy: session.email,
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
    const previousRow = existing ?? {
      id: currentMember.id,
      name: currentMember.name,
      role: currentMember.role,
      group: currentMember.group,
      aliases: JSON.stringify(currentMember.aliases),
      email: currentMember.email,
      accessRole: currentMember.accessRole,
      inviteStatus: currentMember.inviteStatus,
      inviteSentAt: currentMember.inviteSentAt,
      lastSignedInAt: currentMember.lastSignedInAt,
      kpiReviewerId: currentMember.kpiReviewerId,
      kpiApproverId: currentMember.kpiApproverId,
      isDeleted: 0,
      createdAt: now,
      updatedAt: now,
      updatedBy: "",
    };
    await writeAuditLog({
      entityType: "team",
      entityKey: id,
      action: "updated",
      previousValue: snapshot("team_member", previousRow),
      newValue: snapshot("team_member", row),
      changedBy: session.email,
    });
    return Response.json({ member: rowToMember(row) });
  } catch (error) {
    console.error("Unable to update team member", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
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
    if (
      existing?.accessRole === "admin" &&
      (await remainingAdminCount(id)) === 0
    ) {
      return Response.json(
        { error: "Assign another administrator before removing the last admin." },
        { status: 400 },
      );
    }
    const now = new Date().toISOString();
    const stored = {
      id,
      name: member.name,
      role: member.role,
      group: member.group,
      aliases: JSON.stringify(member.aliases),
      email: existing?.email ?? member.email,
      accessRole: existing?.accessRole ?? member.accessRole,
      inviteStatus: existing?.inviteStatus ?? member.inviteStatus,
      inviteSentAt: existing?.inviteSentAt ?? member.inviteSentAt,
      lastSignedInAt: existing?.lastSignedInAt ?? member.lastSignedInAt,
      kpiReviewerId: existing?.kpiReviewerId ?? member.kpiReviewerId,
      kpiApproverId: existing?.kpiApproverId ?? member.kpiApproverId,
      isDeleted: 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      updatedBy: session.email,
    };
    await db
      .insert(teamMembers)
      .values(stored)
      .onConflictDoUpdate({ target: teamMembers.id, set: stored });

    const previousMemberRow = existing ?? {
      ...stored,
      isDeleted: 0,
      updatedBy: "",
    };
    await writeAuditLog({
      entityType: "team",
      entityKey: id,
      action: "removed",
      previousValue: snapshot("team_member", previousMemberRow),
      newValue: snapshot("team_member", stored),
      changedBy: session.email,
    });

    for (const row of rows) {
      const clearsReviewer = row.kpiReviewerId === id;
      const clearsApprover = row.kpiApproverId === id;
      if (!clearsReviewer && !clearsApprover) continue;
      await db
        .update(teamMembers)
        .set({
          kpiReviewerId: clearsReviewer ? "" : row.kpiReviewerId,
          kpiApproverId: clearsApprover ? "" : row.kpiApproverId,
          updatedAt: now,
          updatedBy: session.email,
        })
        .where(eq(teamMembers.id, row.id));
    }

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
        owner: removeMemberFromOwners(effectiveOwner, member),
        updatedAt: now,
        updatedBy: session.email,
      };
      const previousUpdate = existingUpdate ?? {
        activityKey,
        status: candidate?.status ?? "not_reported",
        progress: Math.max(0, Math.min(100, Math.round(candidate?.progress ?? 0))),
        note: "",
        supportNeeded: "",
        owner: effectiveOwner,
        updatedAt: now,
        updatedBy: "",
      };
      const [cleared] = await db
        .insert(activityUpdates)
        .values(values)
        .onConflictDoUpdate({
          target: activityUpdates.activityKey,
          set: values,
        })
        .returning();
      await writeAuditLog({
        entityType: "activity",
        entityKey: activityKey,
        action: "removed team member assignment",
        previousValue: snapshot("activity_update", previousUpdate),
        newValue: snapshot("activity_update", cleared),
        changedBy: session.email,
      });
      clearedUpdates.push(cleared);
    }

    return Response.json({ deletedId: id, clearedUpdates });
  } catch (error) {
    console.error("Unable to remove team member", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdminSession(request);
    if (session instanceof Response) return session;
    const payload = (await request.json()) as { id?: unknown };
    const id = String(payload.id ?? "").trim();
    const [member] = await getDb()
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.isDeleted, 0)))
      .limit(1);
    if (!member) {
      return Response.json({ error: "Team member not found." }, { status: 404 });
    }
    if (!member.email) {
      return Response.json(
        { error: "Add an email address before preparing an invitation." },
        { status: 400 },
      );
    }
    const now = new Date().toISOString();
    await getDb()
      .update(teamMembers)
      .set({
        inviteStatus: "invited",
        inviteSentAt: now,
        updatedAt: now,
        updatedBy: session.email,
      })
      .where(eq(teamMembers.id, id));
    const [saved] = await getDb()
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);
    await writeAuditLog({
      entityType: "team",
      entityKey: id,
      action: "prepared invitation",
      previousValue: snapshot("team_member", member),
      newValue: snapshot("team_member", saved),
      changedBy: session.email,
    });
    return Response.json({ member: rowToMember(saved) });
  } catch (error) {
    console.error("Unable to prepare team invitation", error);
    return Response.json({ error: message(error) }, { status: 503 });
  }
}
