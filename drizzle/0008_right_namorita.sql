CREATE TABLE `backup_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`record_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_backup_snapshots_created_at` ON `backup_snapshots` (`created_at`);--> statement-breakpoint
CREATE TABLE `payment_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`uploaded_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_payment_documents_contract` ON `payment_documents` (`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_documents_payment` ON `payment_documents` (`payment_id`);--> statement-breakpoint
CREATE TABLE `quarterly_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_key` text NOT NULL,
	`plan_year` integer NOT NULL,
	`quarter` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`submitted_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quarterly_updates_activity_year` ON `quarterly_updates` (`activity_key`,`plan_year`);--> statement-breakpoint
CREATE INDEX `idx_quarterly_updates_submitted_at` ON `quarterly_updates` (`submitted_at`);--> statement-breakpoint
ALTER TABLE `contract_payments` ADD `foreign_amount_minor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `currency` text DEFAULT 'MNT' NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `foreign_amount_minor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `exchange_rate_mnt` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `transferred_from_year` integer DEFAULT 0 NOT NULL;