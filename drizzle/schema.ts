import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

const purchaseUnitEnum = mysqlEnum("purchaseUnit", ["ton", "kg"]);
const shipmentUnitEnum = mysqlEnum("shipmentUnit", ["ton", "kg"]);

export const workerCatalog = mysqlTable("workerCatalog", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const monthlyReports = mysqlTable(
  "monthlyReports",
  {
    id: int("id").autoincrement().primaryKey(),
    monthKey: varchar("monthKey", { length: 7 }).notNull(),
    purchaseQuantity: decimal("purchaseQuantity", { precision: 14, scale: 3 }).notNull().default("0.000"),
    purchaseUnit: purchaseUnitEnum.default("ton").notNull(),
    purchaseWeightTons: decimal("purchaseWeightTons", { precision: 14, scale: 3 }).notNull().default("0.000"),
    purchaseAmount: decimal("purchaseAmount", { precision: 16, scale: 3 }).notNull().default("0.000"),
    shipmentQuantity: decimal("shipmentQuantity", { precision: 14, scale: 3 }).notNull().default("0.000"),
    shipmentUnit: shipmentUnitEnum.default("ton").notNull(),
    shipmentWeightTons: decimal("shipmentWeightTons", { precision: 14, scale: 3 }).notNull().default("0.000"),
    shipmentAmount: decimal("shipmentAmount", { precision: 16, scale: 3 }).notNull().default("0.000"),
    flatbedWeightTons: decimal("flatbedWeightTons", { precision: 14, scale: 3 }).notNull().default("0.000"),
    flatbedFreight: decimal("flatbedFreight", { precision: 16, scale: 3 }).notNull().default("0.000"),
    craneWeightTons: decimal("craneWeightTons", { precision: 14, scale: 3 }).notNull().default("0.000"),
    craneFeePerTon: decimal("craneFeePerTon", { precision: 16, scale: 3 }).notNull().default("0.000"),
    craneFreight: decimal("craneFreight", { precision: 16, scale: 3 }).notNull().default("0.000"),
    selfHaulWeightTons: decimal("selfHaulWeightTons", { precision: 14, scale: 3 }).notNull().default("0.000"),
    selfHaulFreight: decimal("selfHaulFreight", { precision: 16, scale: 3 }).notNull().default("0.000"),
    inHouseHeadcount: int("inHouseHeadcount").notNull().default(0),
    inHouseUnitCost: decimal("inHouseUnitCost", { precision: 16, scale: 3 }).notNull().default("50000.000"),
    note: text("note"),
    createdByUserId: int("createdByUserId"),
    updatedByUserId: int("updatedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    monthKeyUnique: uniqueIndex("monthlyReports_monthKey_unique").on(table.monthKey),
  })
);

export const processingEntries = mysqlTable("processingEntries", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId")
    .notNull()
    .references(() => monthlyReports.id),
  workerId: int("workerId").references(() => workerCatalog.id),
  workerNameSnapshot: varchar("workerNameSnapshot", { length: 120 }).notNull(),
  processingWeightTons: decimal("processingWeightTons", { precision: 14, scale: 3 }).notNull().default("0.000"),
  feeAmount: decimal("feeAmount", { precision: 16, scale: 3 }).notNull().default("0.000"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type WorkerCatalog = typeof workerCatalog.$inferSelect;
export type InsertWorkerCatalog = typeof workerCatalog.$inferInsert;
export type MonthlyReport = typeof monthlyReports.$inferSelect;
export type InsertMonthlyReport = typeof monthlyReports.$inferInsert;
export type ProcessingEntry = typeof processingEntries.$inferSelect;
export type InsertProcessingEntry = typeof processingEntries.$inferInsert;
export type WeightUnit = "ton" | "kg";
