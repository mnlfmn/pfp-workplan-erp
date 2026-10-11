CREATE TABLE `staff_kpi_history` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`changed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`changed_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_staff_kpi_history_review` ON `staff_kpi_history` (`review_id`);--> statement-breakpoint
CREATE INDEX `idx_staff_kpi_history_changed_at` ON `staff_kpi_history` (`changed_at`);--> statement-breakpoint
CREATE TABLE `staff_kpi_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`plan_year` integer NOT NULL,
	`period` text NOT NULL,
	`linked_activity_keys` text DEFAULT '[]' NOT NULL,
	`achievement_note` text DEFAULT '' NOT NULL,
	`self_performance_score` real DEFAULT 0 NOT NULL,
	`self_attendance_score` real DEFAULT 0 NOT NULL,
	`self_development_score` real DEFAULT 0 NOT NULL,
	`review_performance_score` real,
	`review_attendance_score` real,
	`review_development_score` real,
	`culture_bonus` real DEFAULT 0 NOT NULL,
	`review_comment` text DEFAULT '' NOT NULL,
	`workflow_status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` text DEFAULT '' NOT NULL,
	`submitted_by` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`approved_at` text DEFAULT '' NOT NULL,
	`approved_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_staff_kpi_member_year_period` ON `staff_kpi_reviews` (`member_id`,`plan_year`,`period`);--> statement-breakpoint
CREATE INDEX `idx_staff_kpi_year` ON `staff_kpi_reviews` (`plan_year`);--> statement-breakpoint
CREATE INDEX `idx_staff_kpi_member` ON `staff_kpi_reviews` (`member_id`);