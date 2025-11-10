CREATE TABLE `card_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bin` varchar(20) NOT NULL,
	`month` varchar(10) NOT NULL,
	`year` varchar(10) NOT NULL,
	`cvv` varchar(10) NOT NULL,
	`quantity` int NOT NULL,
	`isFavorite` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `card_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `card_history` ADD CONSTRAINT `card_history_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;