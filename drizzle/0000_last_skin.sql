CREATE TABLE `activity_updates` (
	`activity_key` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`support_needed` text DEFAULT '' NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL
);
