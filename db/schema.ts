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

export const financeEntries = sqliteTable("finance_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetKey: text("budget_key").notNull(),
  entryType: text("entry_type").notNull(),
  amountMnt: integer("amount_mnt").notNull(),
  entryDate: text("entry_date").notNull(),
  description: text("description").notNull().default(""),
  vendor: text("vendor").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by").notNull().default(""),
});

export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  group: text("group_name").notNull().default("PCU"),
  aliases: text("aliases").notNull().default("[]"),
  isDeleted: integer("is_deleted").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull().default(""),
});
