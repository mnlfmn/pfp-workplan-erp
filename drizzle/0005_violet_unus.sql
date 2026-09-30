CREATE TABLE `contract_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`label` text NOT NULL,
	`due_date` text NOT NULL,
	`deliverable` text NOT NULL,
	`percentage` integer NOT NULL,
	`amount_mnt` integer NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	`paid_at` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_contract_payments_contract_sequence` ON `contract_payments` (`contract_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_contract_payments_contract` ON `contract_payments` (`contract_id`);--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_year` integer NOT NULL,
	`contract_number` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`budget_key` text NOT NULL,
	`activity_key` text NOT NULL,
	`tor_name` text NOT NULL,
	`service_provider_name` text NOT NULL,
	`service_provider_type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`amount_mnt` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_contracts_year_number` ON `contracts` (`plan_year`,`contract_number`);--> statement-breakpoint
CREATE INDEX `idx_contracts_year_budget` ON `contracts` (`plan_year`,`budget_key`);--> statement-breakpoint
CREATE INDEX `idx_contracts_year_activity` ON `contracts` (`plan_year`,`activity_key`);