CREATE TABLE `demo_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`role` text DEFAULT 'guest' NOT NULL,
	`user_id` text DEFAULT 'student-1' NOT NULL,
	`name` text DEFAULT 'Данияр' NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`workspace`) REFERENCES `demo_workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_workspace_idx` ON `demo_sessions` (`workspace`);--> statement-breakpoint
CREATE TABLE `demo_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`expires` integer NOT NULL
);
