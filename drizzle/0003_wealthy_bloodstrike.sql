ALTER TABLE `monthlyReports` ADD `flatbedWeightTons` decimal(14,3) DEFAULT '0.000' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyReports` ADD `craneWeightTons` decimal(14,3) DEFAULT '0.000' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyReports` ADD `craneFeePerTon` decimal(16,3) DEFAULT '0.000' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyReports` ADD `selfHaulWeightTons` decimal(14,3) DEFAULT '0.000' NOT NULL;