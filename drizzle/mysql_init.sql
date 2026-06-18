-- MySQL bootstrap script generated from drizzle/schema.ts
-- This script is re-runnable by dropping and recreating tables.

CREATE DATABASE IF NOT EXISTS `yizhen`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `yizhen`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `processingEntries`;
DROP TABLE IF EXISTS `monthlyReports`;
DROP TABLE IF EXISTS `workerCatalog`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_openId_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `workerCatalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `sortOrder` int NOT NULL DEFAULT 0,
  `isActive` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `monthlyReports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monthKey` varchar(7) NOT NULL,
  `purchaseQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `purchaseUnit` enum('ton','kg') NOT NULL DEFAULT 'ton',
  `purchaseWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
  `purchaseAmount` decimal(16,3) NOT NULL DEFAULT '0.000',
  `shipmentQuantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `shipmentUnit` enum('ton','kg') NOT NULL DEFAULT 'ton',
  `shipmentWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
  `shipmentAmount` decimal(16,3) NOT NULL DEFAULT '0.000',
  `flatbedWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
  `flatbedFreight` decimal(16,3) NOT NULL DEFAULT '0.000',
  `craneWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
  `craneFeePerTon` decimal(16,3) NOT NULL DEFAULT '0.000',
  `craneFreight` decimal(16,3) NOT NULL DEFAULT '0.000',
  `selfHaulWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
  `selfHaulFreight` decimal(16,3) NOT NULL DEFAULT '0.000',
  `inHouseHeadcount` int NOT NULL DEFAULT 0,
  `inHouseUnitCost` decimal(16,3) NOT NULL DEFAULT '50000.000',
  `note` text,
  `createdByUserId` int DEFAULT NULL,
  `updatedByUserId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `monthlyReports_monthKey_unique` (`monthKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `processingEntries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reportId` int NOT NULL,
  `workerId` int DEFAULT NULL,
  `workerNameSnapshot` varchar(120) NOT NULL,
  `processingWeightTons` decimal(14,3) NOT NULL DEFAULT '0.000',
  `feeAmount` decimal(16,3) NOT NULL DEFAULT '0.000',
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `processingEntries_reportId_idx` (`reportId`),
  KEY `processingEntries_workerId_idx` (`workerId`),
  CONSTRAINT `processingEntries_reportId_monthlyReports_id_fk`
    FOREIGN KEY (`reportId`) REFERENCES `monthlyReports` (`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `processingEntries_workerId_workerCatalog_id_fk`
    FOREIGN KEY (`workerId`) REFERENCES `workerCatalog` (`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
