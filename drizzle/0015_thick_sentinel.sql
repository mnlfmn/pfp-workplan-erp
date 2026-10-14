CREATE TABLE `consultant_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_year` integer NOT NULL,
	`activity_key` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_consultant_evaluations_year` ON `consultant_evaluations` (`plan_year`);--> statement-breakpoint
CREATE INDEX `idx_consultant_evaluations_activity` ON `consultant_evaluations` (`activity_key`);--> statement-breakpoint
CREATE INDEX `idx_consultant_evaluations_status` ON `consultant_evaluations` (`status`);