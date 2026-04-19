import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertProcessingEntry,
  InsertUser,
  InsertWorkerCatalog,
  MonthlyReport,
  processingEntries,
  monthlyReports,
  users,
  workerCatalog,
  type WeightUnit,
} from "../drizzle/schema";
import {
  computeMonthlyReportMetrics,
  normalizeNumber,
  roundToThree,
  type MonthlyReportCalculationInput,
  type ProcessingEntryInput,
} from "./costing";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function toDbDecimal(value: number): string {
  return roundToThree(normalizeNumber(value)).toFixed(3);
}

function formatMonthRange(year: number) {
  return {
    start: `${year}-01`,
    end: `${year + 1}-01`,
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listWorkerCatalog() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list worker catalog: database not available");
    return [];
  }

  return db
    .select()
    .from(workerCatalog)
    .where(eq(workerCatalog.isActive, 1))
    .orderBy(asc(workerCatalog.sortOrder), asc(workerCatalog.name));
}

export async function saveWorkerCatalogItem(input: {
  id?: number;
  name: string;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const values: InsertWorkerCatalog = {
    name: input.name.trim(),
    sortOrder: input.sortOrder ?? 0,
    isActive: 1,
  };

  if (input.id) {
    await db
      .update(workerCatalog)
      .set({
        name: values.name,
        sortOrder: values.sortOrder,
        isActive: 1,
      })
      .where(eq(workerCatalog.id, input.id));

    const updated = await db.select().from(workerCatalog).where(eq(workerCatalog.id, input.id)).limit(1);
    return updated[0] ?? null;
  }

  const result = await db.insert(workerCatalog).values(values);
  const inserted = await db
    .select()
    .from(workerCatalog)
    .where(eq(workerCatalog.id, Number(result[0].insertId)))
    .limit(1);

  return inserted[0] ?? null;
}

export async function deactivateWorkerCatalogItem(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(workerCatalog)
    .set({
      isActive: 0,
    })
    .where(eq(workerCatalog.id, id));
}

export type SaveMonthlyReportInput = {
  id?: number;
  monthKey: string;
  purchaseQuantity: number;
  purchaseUnit: WeightUnit;
  purchaseAmount: number;
  shipmentQuantity: number;
  shipmentUnit: WeightUnit;
  shipmentAmount: number;
  flatbedFreight: number;
  craneFreight: number;
  inHouseHeadcount: number;
  inHouseUnitCost: number;
  note?: string;
  processingEntries: ProcessingEntryInput[];
  actorUserId?: number | null;
};

export async function saveMonthlyReport(input: SaveMonthlyReportInput) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const metrics = computeMonthlyReportMetrics({
    purchaseQuantity: input.purchaseQuantity,
    purchaseUnit: input.purchaseUnit,
    purchaseAmount: input.purchaseAmount,
    shipmentQuantity: input.shipmentQuantity,
    shipmentUnit: input.shipmentUnit,
    shipmentAmount: input.shipmentAmount,
    flatbedFreight: input.flatbedFreight,
    craneFreight: input.craneFreight,
    selfHaulFreight: 0,
    inHouseHeadcount: input.inHouseHeadcount,
    inHouseUnitCost: input.inHouseUnitCost,
    processingEntries: input.processingEntries,
  });

  const sanitizedEntries = metrics.processingEntries
    .filter(entry => entry.workerId || entry.workerNameSnapshot || entry.processingWeightTons || entry.feeAmount)
    .slice(0, 4);

  await db.transaction(async tx => {
    let reportId = input.id;

    const baseValues = {
      monthKey: input.monthKey,
      purchaseQuantity: toDbDecimal(input.purchaseQuantity),
      purchaseUnit: input.purchaseUnit,
      purchaseWeightTons: toDbDecimal(metrics.purchaseWeightTons),
      purchaseAmount: toDbDecimal(input.purchaseAmount),
      shipmentQuantity: toDbDecimal(input.shipmentQuantity),
      shipmentUnit: input.shipmentUnit,
      shipmentWeightTons: toDbDecimal(metrics.shipmentWeightTons),
      shipmentAmount: toDbDecimal(input.shipmentAmount),
      flatbedFreight: toDbDecimal(input.flatbedFreight),
      craneFreight: toDbDecimal(input.craneFreight),
      selfHaulFreight: toDbDecimal(0),
      inHouseHeadcount: input.inHouseHeadcount,
      inHouseUnitCost: toDbDecimal(input.inHouseUnitCost),
      note: input.note?.trim() || null,
      updatedByUserId: input.actorUserId ?? null,
    };

    if (reportId) {
      await tx.update(monthlyReports).set(baseValues).where(eq(monthlyReports.id, reportId));
    } else {
      const existing = await tx
        .select({ id: monthlyReports.id })
        .from(monthlyReports)
        .where(eq(monthlyReports.monthKey, input.monthKey))
        .limit(1);

      if (existing[0]) {
        reportId = existing[0].id;
        await tx.update(monthlyReports).set(baseValues).where(eq(monthlyReports.id, reportId));
      } else {
        const inserted = await tx.insert(monthlyReports).values({
          ...baseValues,
          createdByUserId: input.actorUserId ?? null,
        });
        reportId = Number(inserted[0].insertId);
      }
    }

    if (!reportId) {
      throw new Error("Unable to resolve monthly report id");
    }

    await tx.delete(processingEntries).where(eq(processingEntries.reportId, reportId));

    if (sanitizedEntries.length > 0) {
      const entryValues: InsertProcessingEntry[] = sanitizedEntries.map((entry, index) => ({
        reportId,
        workerId: entry.workerId,
        workerNameSnapshot: entry.workerNameSnapshot || `加工組別 ${index + 1}`,
        processingWeightTons: toDbDecimal(entry.processingWeightTons),
        feeAmount: toDbDecimal(entry.feeAmount),
        sortOrder: index,
      }));

      await tx.insert(processingEntries).values(entryValues);
    }
  });

  return getMonthlyReportByMonthKey(input.monthKey);
}

function mapProcessingEntry(row: typeof processingEntries.$inferSelect) {
  return {
    id: row.id,
    reportId: row.reportId,
    workerId: row.workerId,
    workerNameSnapshot: row.workerNameSnapshot,
    processingWeightTons: normalizeNumber(row.processingWeightTons),
    feeAmount: normalizeNumber(row.feeAmount),
    sortOrder: row.sortOrder,
  };
}

function mapMonthlyReportRow(row: MonthlyReport) {
  return {
    id: row.id,
    monthKey: row.monthKey,
    purchaseQuantity: normalizeNumber(row.purchaseQuantity),
    purchaseUnit: row.purchaseUnit,
    purchaseWeightTons: normalizeNumber(row.purchaseWeightTons),
    purchaseAmount: normalizeNumber(row.purchaseAmount),
    shipmentQuantity: normalizeNumber(row.shipmentQuantity),
    shipmentUnit: row.shipmentUnit,
    shipmentWeightTons: normalizeNumber(row.shipmentWeightTons),
    shipmentAmount: normalizeNumber(row.shipmentAmount),
    flatbedFreight: normalizeNumber(row.flatbedFreight),
    craneFreight: normalizeNumber(row.craneFreight),
    selfHaulFreight: normalizeNumber(row.selfHaulFreight),
    inHouseHeadcount: row.inHouseHeadcount,
    inHouseUnitCost: normalizeNumber(row.inHouseUnitCost),
    note: row.note ?? "",
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function composeReportPayload(report: MonthlyReport, entries: typeof processingEntries.$inferSelect[]) {
  const base = mapMonthlyReportRow(report);
  const mappedEntries = entries.map(mapProcessingEntry).sort((a, b) => a.sortOrder - b.sortOrder);
  const metrics = computeMonthlyReportMetrics({
    purchaseQuantity: base.purchaseQuantity,
    purchaseUnit: base.purchaseUnit,
    purchaseAmount: base.purchaseAmount,
    shipmentQuantity: base.shipmentQuantity,
    shipmentUnit: base.shipmentUnit,
    shipmentAmount: base.shipmentAmount,
    flatbedFreight: base.flatbedFreight,
    craneFreight: base.craneFreight,
    selfHaulFreight: base.selfHaulFreight,
    inHouseHeadcount: base.inHouseHeadcount,
    inHouseUnitCost: base.inHouseUnitCost,
    processingEntries: mappedEntries,
  } satisfies MonthlyReportCalculationInput);

  return {
    ...base,
    processingEntries: metrics.processingEntries,
    metrics,
  };
}

export async function getMonthlyReportById(reportId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const reports = await db.select().from(monthlyReports).where(eq(monthlyReports.id, reportId)).limit(1);
  const report = reports[0];

  if (!report) {
    return null;
  }

  const entries = await db
    .select()
    .from(processingEntries)
    .where(eq(processingEntries.reportId, report.id))
    .orderBy(asc(processingEntries.sortOrder), asc(processingEntries.id));

  return composeReportPayload(report, entries);
}

export async function getMonthlyReportByMonthKey(monthKey: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const reports = await db
    .select()
    .from(monthlyReports)
    .where(eq(monthlyReports.monthKey, monthKey))
    .limit(1);
  const report = reports[0];

  if (!report) {
    return null;
  }

  return getMonthlyReportById(report.id);
}

export async function listMonthlyReports(year?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const reportRows = year
    ? await db
        .select()
        .from(monthlyReports)
        .where(
          and(
            gte(monthlyReports.monthKey, formatMonthRange(year).start),
            lt(monthlyReports.monthKey, formatMonthRange(year).end)
          )
        )
        .orderBy(desc(monthlyReports.monthKey))
    : await db.select().from(monthlyReports).orderBy(desc(monthlyReports.monthKey));

  if (reportRows.length === 0) {
    return [];
  }

  const ids = reportRows.map(report => report.id);
  const allEntries = await db
    .select()
    .from(processingEntries)
    .where(inArray(processingEntries.reportId, ids))
    .orderBy(asc(processingEntries.sortOrder), asc(processingEntries.id));

  const entryMap = new Map<number, typeof processingEntries.$inferSelect[]>();
  for (const entry of allEntries) {
    const reportEntries = entryMap.get(entry.reportId) ?? [];
    reportEntries.push(entry);
    entryMap.set(entry.reportId, reportEntries);
  }

  return reportRows.map(report => composeReportPayload(report, entryMap.get(report.id) ?? []));
}

export async function getAnnualSummary(year: number) {
  const reports = (await listMonthlyReports(year)).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  let previousNetProfit: number | null = null;

  const months = reports.map(report => {
    const netProfit = report.metrics.netProfit;
    const netProfitChangeAmount =
      previousNetProfit === null ? null : roundToThree(netProfit - previousNetProfit);
    const netProfitChangeRate =
      previousNetProfit === null || previousNetProfit === 0
        ? null
        : roundToThree((netProfitChangeAmount! / previousNetProfit) * 100);

    previousNetProfit = netProfit;

    return {
      reportId: report.id,
      monthKey: report.monthKey,
      netProfit,
      grossProfitPerTon: report.metrics.grossProfitPerTon,
      shipmentUnitPrice: report.metrics.shipmentUnitPrice,
      salesCost: report.metrics.salesCost,
      totalProcessingFee: report.metrics.totalProcessingFee,
      totalFreight: report.metrics.totalFreight,
      netProfitChangeAmount,
      netProfitChangeRate,
    };
  });

  const annualNetProfit = roundToThree(months.reduce((sum, month) => sum + month.netProfit, 0));

  return {
    year,
    annualNetProfit,
    months,
  };
}

export async function seedDefaultWorkersIfEmpty() {
  const db = await getDb();
  if (!db) {
    return;
  }

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(workerCatalog);
  const total = Number(countResult[0]?.count ?? 0);

  if (total > 0) {
    return;
  }

  await db.insert(workerCatalog).values([
    { name: "吳秋貴", sortOrder: 1, isActive: 1 },
    { name: "黃鬆翰", sortOrder: 2, isActive: 1 },
    { name: "古樂樂", sortOrder: 3, isActive: 1 },
    { name: "吳昇峰", sortOrder: 4, isActive: 1 },
  ]);
}
