CREATE TABLE `mel_indicators` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_year` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`definition` text DEFAULT '' NOT NULL,
	`unit` text NOT NULL,
	`level` text NOT NULL,
	`reporting_frequency` text NOT NULL,
	`data_source` text DEFAULT '' NOT NULL,
	`responsible_member_id` text DEFAULT '' NOT NULL,
	`goal` text DEFAULT '' NOT NULL,
	`activity_key` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`baseline_value` real,
	`baseline_year` integer,
	`annual_target` real,
	`q1_target` real,
	`q2_target` real,
	`q3_target` real,
	`q4_target` real,
	`end_target` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_mel_indicators_year_code` ON `mel_indicators` (`plan_year`,`code`);--> statement-breakpoint
CREATE INDEX `idx_mel_indicators_year` ON `mel_indicators` (`plan_year`);--> statement-breakpoint
CREATE INDEX `idx_mel_indicators_activity` ON `mel_indicators` (`activity_key`);--> statement-breakpoint
CREATE TABLE `mel_results` (
	`id` text PRIMARY KEY NOT NULL,
	`indicator_id` text NOT NULL,
	`plan_year` integer NOT NULL,
	`period` text NOT NULL,
	`actual_value` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`evidence_reference` text DEFAULT '' NOT NULL,
	`workflow_status` text DEFAULT 'draft' NOT NULL,
	`review_comment` text DEFAULT '' NOT NULL,
	`entered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`entered_by` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL,
	`submitted_at` text DEFAULT '' NOT NULL,
	`submitted_by` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`approved_at` text DEFAULT '' NOT NULL,
	`approved_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_mel_results_indicator_period` ON `mel_results` (`indicator_id`,`period`);--> statement-breakpoint
CREATE INDEX `idx_mel_results_year` ON `mel_results` (`plan_year`);--> statement-breakpoint
CREATE INDEX `idx_mel_results_indicator` ON `mel_results` (`indicator_id`);