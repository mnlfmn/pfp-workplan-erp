import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
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

export const quarterlyUpdates = sqliteTable(
  "quarterly_updates",
  {
    id: text("id").primaryKey(),
    activityKey: text("activity_key").notNull(),
    planYear: integer("plan_year").notNull(),
    quarter: text("quarter").notNull(),
    note: text("note").notNull().default(""),
    status: text("status").notNull(),
    progress: integer("progress").notNull().default(0),
    submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    submittedBy: text("submitted_by").notNull().default(""),
  },
  (table) => [
    index("idx_quarterly_updates_activity_year").on(
      table.activityKey,
      table.planYear,
    ),
    index("idx_quarterly_updates_submitted_at").on(table.submittedAt),
  ],
);

export const melIndicators = sqliteTable(
  "mel_indicators",
  {
    id: text("id").primaryKey(),
    planYear: integer("plan_year").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    definition: text("definition").notNull().default(""),
    unit: text("unit").notNull(),
    level: text("level").notNull(),
    reportingFrequency: text("reporting_frequency").notNull(),
    dataSource: text("data_source").notNull().default(""),
    responsibleMemberId: text("responsible_member_id").notNull().default(""),
    goal: text("goal").notNull().default(""),
    activityKey: text("activity_key").notNull().default(""),
    active: integer("active").notNull().default(1),
    baselineValue: real("baseline_value"),
    baselineYear: integer("baseline_year"),
    annualTarget: real("annual_target"),
    q1Target: real("q1_target"),
    q2Target: real("q2_target"),
    q3Target: real("q3_target"),
    q4Target: real("q4_target"),
    endTarget: real("end_target"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: text("created_by").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (table) => [
    uniqueIndex("ux_mel_indicators_year_code").on(table.planYear, table.code),
    index("idx_mel_indicators_year").on(table.planYear),
    index("idx_mel_indicators_activity").on(table.activityKey),
  ],
);

export const melResults = sqliteTable(
  "mel_results",
  {
    id: text("id").primaryKey(),
    indicatorId: text("indicator_id").notNull(),
    planYear: integer("plan_year").notNull(),
    period: text("period").notNull(),
    actualValue: real("actual_value").notNull(),
    note: text("note").notNull().default(""),
    evidenceReference: text("evidence_reference").notNull().default(""),
    workflowStatus: text("workflow_status").notNull().default("draft"),
    reviewComment: text("review_comment").notNull().default(""),
    enteredAt: text("entered_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    enteredBy: text("entered_by").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default(""),
    submittedAt: text("submitted_at").notNull().default(""),
    submittedBy: text("submitted_by").notNull().default(""),
    reviewedAt: text("reviewed_at").notNull().default(""),
    reviewedBy: text("reviewed_by").notNull().default(""),
    approvedAt: text("approved_at").notNull().default(""),
    approvedBy: text("approved_by").notNull().default(""),
  },
  (table) => [
    uniqueIndex("ux_mel_results_indicator_period").on(
      table.indicatorId,
      table.period,
    ),
    index("idx_mel_results_year").on(table.planYear),
    index("idx_mel_results_indicator").on(table.indicatorId),
  ],
);

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
    kpiReviewerId: text("kpi_reviewer_id").notNull().default(""),
    kpiApproverId: text("kpi_approver_id").notNull().default(""),
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

export const staffKpiReviews = sqliteTable(
  "staff_kpi_reviews",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id").notNull(),
    planYear: integer("plan_year").notNull(),
    period: text("period").notNull(),
    linkedActivityKeys: text("linked_activity_keys").notNull().default("[]"),
    achievementNote: text("achievement_note").notNull().default(""),
    selfPerformanceScore: real("self_performance_score").notNull().default(0),
    selfAttendanceScore: real("self_attendance_score").notNull().default(0),
    selfDevelopmentScore: real("self_development_score").notNull().default(0),
    reviewPerformanceScore: real("review_performance_score"),
    reviewAttendanceScore: real("review_attendance_score"),
    reviewDevelopmentScore: real("review_development_score"),
    cultureBonus: real("culture_bonus").notNull().default(0),
    reviewComment: text("review_comment").notNull().default(""),
    workflowStatus: text("workflow_status").notNull().default("draft"),
    submittedAt: text("submitted_at").notNull().default(""),
    submittedBy: text("submitted_by").notNull().default(""),
    reviewedAt: text("reviewed_at").notNull().default(""),
    reviewedBy: text("reviewed_by").notNull().default(""),
    approvedAt: text("approved_at").notNull().default(""),
    approvedBy: text("approved_by").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: text("created_by").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (table) => [
    uniqueIndex("ux_staff_kpi_member_year_period").on(
      table.memberId,
      table.planYear,
      table.period,
    ),
    index("idx_staff_kpi_year").on(table.planYear),
    index("idx_staff_kpi_member").on(table.memberId),
  ],
);

export const staffKpiHistory = sqliteTable(
  "staff_kpi_history",
  {
    id: text("id").primaryKey(),
    reviewId: text("review_id").notNull(),
    snapshot: text("snapshot").notNull(),
    changedAt: text("changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    changedBy: text("changed_by").notNull().default(""),
  },
  (table) => [
    index("idx_staff_kpi_history_review").on(table.reviewId),
    index("idx_staff_kpi_history_changed_at").on(table.changedAt),
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

export const systemMetadata = sqliteTable(
  "system_metadata",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    value: text("value").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (table) => [
    uniqueIndex("ux_system_metadata_category_value").on(
      table.category,
      table.value,
    ),
    index("idx_system_metadata_category_order").on(
      table.category,
      table.sortOrder,
    ),
  ],
);

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
    currency: text("currency").notNull().default("MNT"),
    foreignAmountMinor: integer("foreign_amount_minor").notNull().default(0),
    exchangeRateMnt: integer("exchange_rate_mnt").notNull().default(1),
    transferredFromYear: integer("transferred_from_year").notNull().default(0),
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
    foreignAmountMinor: integer("foreign_amount_minor").notNull().default(0),
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

export const paymentDocuments = sqliteTable(
  "payment_documents",
  {
    id: text("id").primaryKey(),
    contractId: text("contract_id").notNull(),
    paymentId: text("payment_id").notNull(),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedAt: text("uploaded_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    uploadedBy: text("uploaded_by").notNull().default(""),
  },
  (table) => [
    index("idx_payment_documents_contract").on(table.contractId),
    index("idx_payment_documents_payment").on(table.paymentId),
  ],
);

export const backupSnapshots = sqliteTable(
  "backup_snapshots",
  {
    id: text("id").primaryKey(),
    objectKey: text("object_key").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdBy: text("created_by").notNull().default(""),
    source: text("source").notNull().default("manual"),
    recordCount: integer("record_count").notNull().default(0),
  },
  (table) => [index("idx_backup_snapshots_created_at").on(table.createdAt)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityKey: text("entity_key").notNull(),
    action: text("action").notNull(),
    previousValue: text("previous_value").notNull().default("null"),
    newValue: text("new_value").notNull().default("null"),
    changedAt: text("changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    changedBy: text("changed_by").notNull().default(""),
  },
  (table) => [
    index("idx_audit_logs_entity").on(table.entityType, table.entityKey),
    index("idx_audit_logs_changed_at").on(table.changedAt),
  ],
);
