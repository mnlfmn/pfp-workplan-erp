CREATE TABLE `contract_funding_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`budget_key` text NOT NULL,
	`activity_key` text NOT NULL,
	`amount_mnt` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_contract_funding_target` ON `contract_funding_allocations` (`contract_id`,`budget_key`,`activity_key`);--> statement-breakpoint
CREATE INDEX `idx_contract_funding_contract` ON `contract_funding_allocations` (`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_contract_funding_budget` ON `contract_funding_allocations` (`budget_key`);--> statement-breakpoint
CREATE INDEX `idx_contract_funding_activity` ON `contract_funding_allocations` (`activity_key`);--> statement-breakpoint
CREATE TABLE `contract_payment_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`funding_allocation_id` text NOT NULL,
	`amount_mnt` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_contract_payment_funding` ON `contract_payment_allocations` (`payment_id`,`funding_allocation_id`);--> statement-breakpoint
CREATE INDEX `idx_contract_payment_alloc_contract` ON `contract_payment_allocations` (`contract_id`);--> statement-breakpoint
CREATE INDEX `idx_contract_payment_alloc_payment` ON `contract_payment_allocations` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_contract_payment_alloc_funding` ON `contract_payment_allocations` (`funding_allocation_id`);