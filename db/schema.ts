import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const activityUpdates = sqliteTable("activity_updates", {
  activityKey: text("activity_key").primaryKey(),
  status: text("status").notNull(),
  progress: integer("progress").notNull().default(0),
  note: text("note").notNull().default(""),
  supportNeeded: text("support_needed").notNull().default(""),
  owner: text("owner").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull().default(""),
});
