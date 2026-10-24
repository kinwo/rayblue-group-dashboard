CREATE TABLE `agencies` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL,
	`suburb` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_name_unique` ON `agencies` (`name`);--> statement-breakpoint
CREATE TABLE `dataset_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`as_of` integer NOT NULL,
	`seed` integer NOT NULL,
	`generated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` integer PRIMARY KEY NOT NULL,
	`agency_id` integer NOT NULL,
	`sub_number` text,
	`street_number` text NOT NULL,
	`street` text NOT NULL,
	`suburb` text NOT NULL,
	`postcode` text NOT NULL,
	`state` text NOT NULL,
	`property_type` text NOT NULL,
	`beds` integer NOT NULL,
	`baths` integer NOT NULL,
	`rent_per_week` integer NOT NULL,
	`property_manager` text NOT NULL,
	`status` text NOT NULL,
	`listed_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listings_agency_id_listed_date_idx` ON `listings` (`agency_id`,`listed_date`);--> statement-breakpoint
CREATE INDEX `listings_listed_date_idx` ON `listings` (`listed_date`);