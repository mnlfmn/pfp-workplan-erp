import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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
  activityKey: text("activity_key").notNull().default(""),
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

export const workplanYears = sqliteTable("workplan_years", {
  year: integer("year").primaryKey(),
  title: text("title").notNull().default(""),
  status: text("status").notNull().default("draft"),
  reportingDate: text("reporting_date").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by").notNull().default(""),
});

export const workplanRecords = sqliteTable(
  "workplan_records",
  {
    id: text("id").primaryKey(),
    planYear: integer("plan_year").notNull(),
    recordType: text("record_type").notNull(),
    recordKey: text("record_key").notNull(),
    parentKey: text("parent_key").notNull().default(""),
    payload: text("payload").notNull().default("{}"),
    isDeleted: integer("is_deleted").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (table) => [
    uniqueIndex("ux_workplan_records_year_type_key").on(
      table.planYear,
      table.recordType,
      table.recordKey,
    ),
    index("idx_workplan_records_year_type").on(
      table.planYear,
      table.recordType,
    ),
  ],
);

export const budgetAllocations = sqliteTable(
  "budget_allocations",
  {
    id: text("id").primaryKey(),
    planYear: integer("plan_year").notNull(),
    budgetKey: text("budget_key").notNull(),
    activityKey: text("activity_key").notNull(),
    amountMnt: integer("amount_mnt").notNull(),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (table) => [
    uniqueIndex("ux_budget_allocations_year_budget_activity").on(
      table.planYear,
      table.budgetKey,
      table.activityKey,
    ),
    index("idx_budget_allocations_year_budget").on(
      table.planYear,
      table.budgetKey,
    ),
    index("idx_budget_allocations_year_activity").on(
      table.planYear,
      table.activityKey,
    ),
  ],
);
