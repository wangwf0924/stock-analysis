CREATE TABLE `invite_code_uses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviteCodeId` int NOT NULL,
	`usedBy` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_code_uses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`note` varchar(255),
	`maxUses` int NOT NULL DEFAULT 1,
	`usedCount` int NOT NULL DEFAULT 0,
	`isDisabled` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `phone_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`nickname` varchar(64) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`inviteCode` varchar(32),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phone_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `phone_users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
