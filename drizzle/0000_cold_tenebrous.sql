CREATE TABLE `training_completions` (
	`user_sub` text NOT NULL,
	`course_id` text NOT NULL,
	`user_email` text NOT NULL,
	`score` integer NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`user_sub`, `course_id`)
);
--> statement-breakpoint
CREATE TABLE `training_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`duration` integer NOT NULL,
	`lessons` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portal_users` (
	`sub` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`last_seen_at` integer NOT NULL
);
