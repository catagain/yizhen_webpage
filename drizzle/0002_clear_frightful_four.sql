ALTER TABLE `monthlyReports` RENAME COLUMN `weightUnit` TO `purchaseUnit`;--> statement-breakpoint
ALTER TABLE `monthlyReports` ADD `shipmentUnit` enum('ton','kg') DEFAULT 'ton' NOT NULL;