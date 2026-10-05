CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_key` text NOT NULL,
	`action` text NOT NULL,
	`previous_value` text DEFAULT 'null' NOT NULL,
	`new_value` text DEFAULT 'null' NOT NULL,
	`changed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`changed_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_entity` ON `audit_logs` (`entity_type`,`entity_key`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_changed_at` ON `audit_logs` (`changed_at`);