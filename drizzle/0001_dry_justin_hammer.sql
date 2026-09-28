CREATE TABLE `finance_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_key` text NOT NULL,
	`entry_type` text NOT NULL,
	`amount_mnt` integer NOT NULL,
	`entry_date` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`vendor` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text DEFAULT '' NOT NULL
);
