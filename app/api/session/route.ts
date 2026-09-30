import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { teamMembers } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";

export async function GET(request: Request) {
  try {
    const session = await requireAppSession(request);
    if (session instanceof Response) return session;

    if (session.userId !== "local-preview-admin") {
      const now = new Date().toISOString();
      await getDb()
        .update(teamMembers)
        .set({
          inviteStatus: "active",
          lastSignedInAt: now,
          updatedAt: now,
          updatedBy: session.email,
        })
        .where(eq(teamMembers.id, session.memberId));
    }

    return Response.json({ session });
  } catch (error) {
    console.error("Unable to load the signed-in team member", error);
    return Response.json(
      { error: "Team access is temporarily unavailable." },
      { status: 503 },
    );
  }
}
