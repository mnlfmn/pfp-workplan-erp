CREATE TABLE `budget_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_year` integer NOT NULL,
	`budget_key` text NOT NULL,
	`activity_key` text NOT NULL,
	`amount_mnt` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_budget_allocations_year_budget_activity` ON `budget_allocations` (`plan_year`,`budget_key`,`activity_key`);--> statement-breakpoint
CREATE INDEX `idx_budget_allocations_year_budget` ON `budget_allocations` (`plan_year`,`budget_key`);--> statement-breakpoint
CREATE INDEX `idx_budget_allocations_year_activity` ON `budget_allocations` (`plan_year`,`activity_key`);--> statement-breakpoint
CREATE TABLE `workplan_records` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_year` integer NOT NULL,
	`record_type` text NOT NULL,
	`record_key` text NOT NULL,
	`parent_key` text DEFAULT '' NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_workplan_records_year_type_key` ON `workplan_records` (`plan_year`,`record_type`,`record_key`);--> statement-breakpoint
CREATE INDEX `idx_workplan_records_year_type` ON `workplan_records` (`plan_year`,`record_type`);--> statement-breakpoint
CREATE TABLE `workplan_years` (
	`year` integer PRIMARY KEY NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reporting_date` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
