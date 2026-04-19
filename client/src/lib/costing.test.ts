import { describe, expect, it } from "vitest";
import {
  computeMonthlyMetrics,
  createEmptyMonthlyReport,
  createEmptyProcessingEntries,
  formatMonthLabel,
} from "./costing";

describe("client costing helpers", () => {
  it("creates four empty processing rows by default", () => {
    const rows = createEmptyProcessingEntries();
    expect(rows).toHaveLength(4);
    expect(rows.every(row => row.workerId === null)).toBe(true);
  });

  it("creates a default monthly report with editable in-house cost", () => {
    const report = createEmptyMonthlyReport("2026-04");
    expect(report.monthKey).toBe("2026-04");
    expect(report.inHouseUnitCost).toBe(50000);
    expect(report.processingEntries).toHaveLength(4);
  });

  it("computes live metrics for the monthly report form", () => {
    const metrics = computeMonthlyMetrics({
      monthKey: "2026-04",
      purchaseQuantity: 8000,
      purchaseUnit: "kg",
      purchaseAmount: 160000,
      shipmentQuantity: 10,
      shipmentUnit: "ton",
      shipmentAmount: 300000,
      flatbedFreight: 12000,
      craneFreight: 8000,
      inHouseHeadcount: 1,
      inHouseUnitCost: 40000,
      note: "",
      processingEntries: [
        {
          workerId: 1,
          workerNameSnapshot: "吳秋貴",
          processingWeightTons: 2,
          feeAmount: 20000,
          sortOrder: 0,
        },
        {
          workerId: 2,
          workerNameSnapshot: "黃鬆翰",
          processingWeightTons: 1.5,
          feeAmount: 12000,
          sortOrder: 1,
        },
        {
          workerId: null,
          workerNameSnapshot: "",
          processingWeightTons: 0,
          feeAmount: 0,
          sortOrder: 2,
        },
        {
          workerId: null,
          workerNameSnapshot: "",
          processingWeightTons: 0,
          feeAmount: 0,
          sortOrder: 3,
        },
      ],
    });

    expect(metrics.purchaseWeightTons).toBe(8);
    expect(metrics.shipmentWeightTons).toBe(10);
    expect(metrics.processingSubtotal).toBe(32000);
    expect(metrics.inHouseProcessingFee).toBe(40000);
    expect(metrics.totalProcessingFee).toBe(72000);
    expect(metrics.totalFreight).toBe(20000);
    expect(metrics.salesCost).toBe(92000);
    expect(metrics.shipmentUnitPrice).toBe(4800);
    expect(metrics.grossProfitPerTon).toBe(-15200);
    expect(metrics.netProfit).toBe(-152000);
  });

  it("formats month labels for display", () => {
    expect(formatMonthLabel("2026-04")).toBe("2026 年 04 月");
  });
});
