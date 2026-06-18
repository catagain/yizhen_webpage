SET NOCOUNT ON;
GO

/*
  SQL Server bootstrap script generated from drizzle/schema.ts.
  Safe to run repeatedly.
*/

IF DB_ID(N'yizhen') IS NULL
BEGIN
    CREATE DATABASE [yizhen];
END
GO

USE [yizhen];
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_users PRIMARY KEY,
        openId NVARCHAR(64) NOT NULL,
        name NVARCHAR(MAX) NULL,
        email NVARCHAR(320) NULL,
        loginMethod NVARCHAR(64) NULL,
        role NVARCHAR(16) NOT NULL CONSTRAINT DF_users_role DEFAULT ('user'),
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_users_createdAt DEFAULT (SYSDATETIME()),
        updatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_users_updatedAt DEFAULT (SYSDATETIME()),
        lastSignedIn DATETIME2(0) NOT NULL CONSTRAINT DF_users_lastSignedIn DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_users_openId UNIQUE (openId),
        CONSTRAINT CK_users_role CHECK (role IN ('user', 'admin'))
    );
END
GO

IF OBJECT_ID(N'dbo.workerCatalog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.workerCatalog (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_workerCatalog PRIMARY KEY,
        name NVARCHAR(120) NOT NULL,
        sortOrder INT NOT NULL CONSTRAINT DF_workerCatalog_sortOrder DEFAULT (0),
        isActive INT NOT NULL CONSTRAINT DF_workerCatalog_isActive DEFAULT (1),
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_workerCatalog_createdAt DEFAULT (SYSDATETIME()),
        updatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_workerCatalog_updatedAt DEFAULT (SYSDATETIME())
    );
END
GO

IF OBJECT_ID(N'dbo.monthlyReports', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.monthlyReports (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_monthlyReports PRIMARY KEY,
        monthKey NVARCHAR(7) NOT NULL,
        purchaseQuantity DECIMAL(14,3) NOT NULL CONSTRAINT DF_monthlyReports_purchaseQuantity DEFAULT (0.000),
        purchaseUnit NVARCHAR(8) NOT NULL CONSTRAINT DF_monthlyReports_purchaseUnit DEFAULT ('ton'),
        purchaseWeightTons DECIMAL(14,3) NOT NULL CONSTRAINT DF_monthlyReports_purchaseWeightTons DEFAULT (0.000),
        purchaseAmount DECIMAL(16,3) NOT NULL CONSTRAINT DF_monthlyReports_purchaseAmount DEFAULT (0.000),
        shipmentQuantity DECIMAL(14,3) NOT NULL CONSTRAINT DF_monthlyReports_shipmentQuantity DEFAULT (0.000),
        shipmentUnit NVARCHAR(8) NOT NULL CONSTRAINT DF_monthlyReports_shipmentUnit DEFAULT ('ton'),
        shipmentWeightTons DECIMAL(14,3) NOT NULL CONSTRAINT DF_monthlyReports_shipmentWeightTons DEFAULT (0.000),
        shipmentAmount DECIMAL(16,3) NOT NULL CONSTRAINT DF_monthlyReports_shipmentAmount DEFAULT (0.000),
        flatbedWeightTons DECIMAL(14,3) NOT NULL CONSTRAINT DF_monthlyReports_flatbedWeightTons DEFAULT (0.000),
        flatbedFreight DECIMAL(16,3) NOT NULL CONSTRAINT DF_monthlyReports_flatbedFreight DEFAULT (0.000),
        craneWeightTons DECIMAL(14,3) NOT NULL CONSTRAINT DF_monthlyReports_craneWeightTons DEFAULT (0.000),
        craneFeePerTon DECIMAL(16,3) NOT NULL CONSTRAINT DF_monthlyReports_craneFeePerTon DEFAULT (0.000),
        craneFreight DECIMAL(16,3) NOT NULL CONSTRAINT DF_monthlyReports_craneFreight DEFAULT (0.000),
        selfHaulWeightTons DECIMAL(14,3) NOT NULL CONSTRAINT DF_monthlyReports_selfHaulWeightTons DEFAULT (0.000),
        selfHaulFreight DECIMAL(16,3) NOT NULL CONSTRAINT DF_monthlyReports_selfHaulFreight DEFAULT (0.000),
        inHouseHeadcount INT NOT NULL CONSTRAINT DF_monthlyReports_inHouseHeadcount DEFAULT (0),
        inHouseUnitCost DECIMAL(16,3) NOT NULL CONSTRAINT DF_monthlyReports_inHouseUnitCost DEFAULT (50000.000),
        note NVARCHAR(MAX) NULL,
        createdByUserId INT NULL,
        updatedByUserId INT NULL,
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_monthlyReports_createdAt DEFAULT (SYSDATETIME()),
        updatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_monthlyReports_updatedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT UQ_monthlyReports_monthKey UNIQUE (monthKey),
        CONSTRAINT CK_monthlyReports_purchaseUnit CHECK (purchaseUnit IN ('ton', 'kg')),
        CONSTRAINT CK_monthlyReports_shipmentUnit CHECK (shipmentUnit IN ('ton', 'kg'))
    );
END
GO

IF OBJECT_ID(N'dbo.processingEntries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.processingEntries (
        id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_processingEntries PRIMARY KEY,
        reportId INT NOT NULL,
        workerId INT NULL,
        workerNameSnapshot NVARCHAR(120) NOT NULL,
        processingWeightTons DECIMAL(14,3) NOT NULL CONSTRAINT DF_processingEntries_processingWeightTons DEFAULT (0.000),
        feeAmount DECIMAL(16,3) NOT NULL CONSTRAINT DF_processingEntries_feeAmount DEFAULT (0.000),
        sortOrder INT NOT NULL CONSTRAINT DF_processingEntries_sortOrder DEFAULT (0),
        createdAt DATETIME2(0) NOT NULL CONSTRAINT DF_processingEntries_createdAt DEFAULT (SYSDATETIME()),
        updatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_processingEntries_updatedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT FK_processingEntries_reportId_monthlyReports_id
            FOREIGN KEY (reportId) REFERENCES dbo.monthlyReports(id),
        CONSTRAINT FK_processingEntries_workerId_workerCatalog_id
            FOREIGN KEY (workerId) REFERENCES dbo.workerCatalog(id)
    );
END
GO

CREATE OR ALTER TRIGGER dbo.TR_users_set_updatedAt
ON dbo.users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE u
    SET updatedAt = SYSDATETIME()
    FROM dbo.users AS u
    INNER JOIN inserted AS i ON i.id = u.id;
END
GO

CREATE OR ALTER TRIGGER dbo.TR_workerCatalog_set_updatedAt
ON dbo.workerCatalog
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE w
    SET updatedAt = SYSDATETIME()
    FROM dbo.workerCatalog AS w
    INNER JOIN inserted AS i ON i.id = w.id;
END
GO

CREATE OR ALTER TRIGGER dbo.TR_monthlyReports_set_updatedAt
ON dbo.monthlyReports
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE m
    SET updatedAt = SYSDATETIME()
    FROM dbo.monthlyReports AS m
    INNER JOIN inserted AS i ON i.id = m.id;
END
GO

CREATE OR ALTER TRIGGER dbo.TR_processingEntries_set_updatedAt
ON dbo.processingEntries
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    UPDATE p
    SET updatedAt = SYSDATETIME()
    FROM dbo.processingEntries AS p
    INNER JOIN inserted AS i ON i.id = p.id;
END
GO
