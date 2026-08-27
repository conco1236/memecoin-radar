ALTER TABLE `alert_preferences` ADD `scheduleEnabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `alert_preferences` ADD `scheduleCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `alert_preferences` ADD `scheduleCron` varchar(32);--> statement-breakpoint
ALTER TABLE `alert_preferences` ADD `timezone` varchar(64) DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE `alert_preferences` ADD `lastDeliveredFingerprint` varchar(255);--> statement-breakpoint
ALTER TABLE `alert_preferences` ADD `lastDeliveredAt` timestamp;--> statement-breakpoint
CREATE INDEX `alert_preferences_task_uid_idx` ON `alert_preferences` (`scheduleCronTaskUid`);