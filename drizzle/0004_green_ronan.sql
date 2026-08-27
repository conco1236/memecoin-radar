CREATE TABLE `source_health` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(32) NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`status` enum('healthy','stale','down') NOT NULL,
	`httpStatus` int,
	`latencyMs` int NOT NULL,
	`recordCount` int NOT NULL,
	`dataAgeSeconds` int NOT NULL,
	`lastCheckedAt` timestamp NOT NULL,
	`lastSuccessAt` timestamp,
	`errorMessage` text,
	`alertFingerprint` varchar(255),
	`lastAlertedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `source_health_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_health_source_unique` UNIQUE(`source`)
);
