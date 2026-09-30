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

export const teamMembers = sqliteTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull().default(""),
    group: text("group_name").notNull().default("PCU"),
    aliases: text("aliases").notNull().default("[]"),
    email: text("email").notNull().default(""),
    accessRole: text("access_role").notNull().default("member"),
    inviteStatus: text("invite_status").notNull().default("not_invited"),
    inviteSentAt: text("invite_sent_at").notNull().default(""),
    lastSignedInAt: text("last_signed_in_at").notNull().default(""),
    isDeleted: integer("is_deleted").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (table) => [
    uniqueIndex("ux_team_members_email")
      .on(table.email)
      .where(sql`${table.email} <> ''`),
  ],
);

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

export const contracts = sqliteTable(
  "contracts",
  {
    id: text("id").primaryKey(),
    planYear: integer("plan_year").notNull(),
    contractNumber: text("contract_number").notNull(),
    status: text("status").notNull().default("active"),
    budgetKey: text("budget_key").notNull(),
    activityKey: text("activity_key").notNull(),
    torName: text("tor_name").notNull(),
    serviceProviderName: text("service_provider_name").notNull(),
    serviceProviderType: text("service_provider_type").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    amountMnt: integer("amount_mnt").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (table) => [
    uniqueIndex("ux_contracts_year_number").on(
      table.planYear,
      table.contractNumber,
    ),
    index("idx_contracts_year_budget").on(table.planYear, table.budgetKey),
    index("idx_contracts_year_activity").on(table.planYear, table.activityKey),
  ],
);

export const contractPayments = sqliteTable(
  "contract_payments",
  {
    id: text("id").primaryKey(),
    contractId: text("contract_id").notNull(),
    sequence: integer("sequence").notNull(),
    label: text("label").notNull(),
    dueDate: text("due_date").notNull(),
    deliverable: text("deliverable").notNull(),
    percentage: integer("percentage").notNull(),
    amountMnt: integer("amount_mnt").notNull(),
    paid: integer("paid").notNull().default(0),
    paidAt: text("paid_at").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("ux_contract_payments_contract_sequence").on(
      table.contractId,
      table.sequence,
    ),
    index("idx_contract_payments_contract").on(table.contractId),
  ],
);
