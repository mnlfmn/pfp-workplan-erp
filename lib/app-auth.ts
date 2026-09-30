import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { teamMembers } from "@/db/schema";
import { defaultTeamMembers } from "@/lib/team-members";

export type AppSession = {
  userId: string;
  email: string;
  displayName: string;
  memberId: string;
  memberName: string;
  accessRole: "admin" | "member";
  isAdmin: boolean;
};

export type AuthIdentity = {
  userId: string;
  email: string;
  displayName: string;
};

const INITIAL_ADMIN_MEMBER_ID = "ochirkhuyag-j";

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase();
}

function initialAdminEmail() {
  const runtimeEnv = env as unknown as { PFP_INITIAL_ADMIN_EMAIL?: string };
  return normalizeEmail(runtimeEnv.PFP_INITIAL_ADMIN_EMAIL ?? "");
}

function isLocalUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

function displayNameFromRequest(request: Request, email: string) {
  const rawName =
    request.headers.get("oai-authenticated-user-full-name")?.trim() ?? "";
  if (!rawName) return email;
  if (
    request.headers.get("oai-authenticated-user-full-name-encoding") !==
    "percent-encoded-utf-8"
  ) {
    return email;
  }
  try {
    return decodeURIComponent(rawName);
  } catch {
    return email;
  }
}

export function identityFromRequest(request: Request): AuthIdentity | null {
  const userId = request.headers.get("oai-authenticated-user-id")?.trim() ?? "";
  const email = normalizeEmail(
    request.headers.get("oai-authenticated-user-email") ?? "",
  );
  if (userId && email) {
    return {
      userId,
      email,
      displayName: displayNameFromRequest(request, email),
    };
  }
  if (isLocalUrl(request.url)) {
    return {
      userId: "local-preview-admin",
      email: "local-preview@pfp.test",
      displayName: "Local preview admin",
    };
  }
  return null;
}

export async function getAppSessionForIdentity(
  identity: AuthIdentity,
  options: { localPreview?: boolean } = {},
): Promise<AppSession | null> {
  if (options.localPreview || identity.userId === "local-preview-admin") {
    return {
      ...identity,
      memberId: INITIAL_ADMIN_MEMBER_ID,
      memberName: "Ochirkhuyag.J",
      accessRole: "admin",
      isAdmin: true,
    };
  }

  const email = normalizeEmail(identity.email);
  const db = getDb();
  let [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.isDeleted, 0),
        sql`lower(${teamMembers.email}) = ${email}`,
      ),
    )
    .limit(1);

  if (!member && email && email === initialAdminEmail()) {
    const defaults = defaultTeamMembers.find(
      (item) => item.id === INITIAL_ADMIN_MEMBER_ID,
    );
    const now = new Date().toISOString();
    const [existing] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, INITIAL_ADMIN_MEMBER_ID))
      .limit(1);
    const values = {
      id: INITIAL_ADMIN_MEMBER_ID,
      name: existing?.name ?? defaults?.name ?? "Ochirkhuyag.J",
      role:
        existing?.role ?? defaults?.role ?? "PA Management senior officer",
      group: existing?.group ?? defaults?.group ?? "PCU",
      aliases:
        existing?.aliases ?? JSON.stringify(defaults?.aliases ?? ["Ochirkhuyag"]),
      email,
      accessRole: "admin",
      inviteStatus: "active",
      inviteSentAt: existing?.inviteSentAt ?? "",
      lastSignedInAt: now,
      isDeleted: 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      updatedBy: email,
    };
    await db
      .insert(teamMembers)
      .values(values)
      .onConflictDoUpdate({ target: teamMembers.id, set: values });
    [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, INITIAL_ADMIN_MEMBER_ID))
      .limit(1);
  }

  if (!member) return null;
  const accessRole = member.accessRole === "admin" ? "admin" : "member";
  return {
    ...identity,
    email,
    memberId: member.id,
    memberName: member.name,
    accessRole,
    isAdmin: accessRole === "admin",
  };
}

export async function getAppSessionForRequest(request: Request) {
  const identity = identityFromRequest(request);
  if (!identity) return null;
  return getAppSessionForIdentity(identity, {
    localPreview: identity.userId === "local-preview-admin",
  });
}

export async function requireAppSession(request: Request) {
  const identity = identityFromRequest(request);
  if (!identity) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const session = await getAppSessionForIdentity(identity, {
    localPreview: identity.userId === "local-preview-admin",
  });
  if (!session) {
    return Response.json(
      { error: "This email has not been invited to the PFP workplan." },
      { status: 403 },
    );
  }
  return session;
}

export async function requireAdminSession(request: Request) {
  const session = await requireAppSession(request);
  if (session instanceof Response) return session;
  if (!session.isAdmin) {
    return Response.json(
      { error: "Administrator access is required." },
      { status: 403 },
    );
  }
  return session;
}
