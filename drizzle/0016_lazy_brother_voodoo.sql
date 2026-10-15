CREATE TABLE `quarterly_report_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_year` integer NOT NULL,
	`quarter` text NOT NULL,
	`member_id` text NOT NULL,
	`member_name` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`activity_count` integer DEFAULT 0 NOT NULL,
	`snapshot` text DEFAULT '[]' NOT NULL,
	`review_comment` text DEFAULT '' NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`submitted_by` text DEFAULT '' NOT NULL,
	`returned_at` text DEFAULT '' NOT NULL,
	`returned_by` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quarterly_reports_period` ON `quarterly_report_submissions` (`plan_year`,`quarter`);--> statement-breakpoint
CREATE INDEX `idx_quarterly_reports_member` ON `quarterly_report_submissions` (`member_id`,`plan_year`);--> statement-breakpoint
CREATE INDEX `idx_quarterly_reports_submitted_at` ON `quarterly_report_submissions` (`submitted_at`);