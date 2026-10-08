CREATE TABLE `system_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_system_metadata_category_value` ON `system_metadata` (`category`,`value`);--> statement-breakpoint
CREATE INDEX `idx_system_metadata_category_order` ON `system_metadata` (`category`,`sort_order`);