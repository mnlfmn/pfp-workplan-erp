ALTER TABLE `team_members` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `access_role` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `invite_status` text DEFAULT 'not_invited' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `invite_sent_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `last_signed_in_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_team_members_email` ON `team_members` (`email`) WHERE "team_members"."email" <> '';--> statement-breakpoint
PRAGMA optimize;
