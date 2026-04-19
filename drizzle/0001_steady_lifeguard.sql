CREATE TABLE `monthlyReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`purchaseQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`weightUnit` enum('ton','kg') NOT NULL DEFAULT 'ton',
	`purchaseWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
	`purchaseAmount` decimal(16,3) NOT NULL DEFAULT '0.000',
	`shipmentQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
	`shipmentWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
	`shipmentAmount` decimal(16,3) NOT NULL DEFAULT '0.000',
	`flatbedFreight` decimal(16,3) NOT NULL DEFAULT '0.000',
	`craneFreight` decimal(16,3) NOT NULL DEFAULT '0.000',
	`selfHaulFreight` decimal(16,3) NOT NULL DEFAULT '0.000',
	`inHouseHeadcount` int NOT NULL DEFAULT 0,
	`inHouseUnitCost` decimal(16,3) NOT NULL DEFAULT '50000.000',
	`note` text,
	`createdByUserId` int,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthlyReports_monthKey_unique` UNIQUE(`monthKey`)
);
--> statement-breakpoint
CREATE TABLE `processingEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`workerId` int,
	`workerNameSnapshot` varchar(120) NOT NULL,
	`processingWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
	`feeAmount` decimal(16,3) NOT NULL DEFAULT '0.000',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processingEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workerCatalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workerCatalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `processingEntries` ADD CONSTRAINT `processingEntries_reportId_monthlyReports_id_fk` FOREIGN KEY (`reportId`) REFERENCES `monthlyReports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `processingEntries` ADD CONSTRAINT `processingEntries_workerId_workerCatalog_id_fk` FOREIGN KEY (`workerId`) REFERENCES `workerCatalog`(`id`) ON DELETE no action ON UPDATE no action;