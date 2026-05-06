import { describe, expect, it } from "vitest";

import { computeMonthlyMetrics, createEmptyMonthlyReport } from "@/lib/costing";
import {
  getMonthlyReportPrintFormulas,
  getMonthlyReportPrintFreightFields,
  getMonthlyReportPrintSignatures,
  getMonthlyReportPrintSummaryCards,
} from "@/lib/monthlyReportPrint";

describe("MonthlyReportPage print helpers", () => {
  const form = {
    ...createEmptyMonthlyReport("2026-01"),
    purchaseQuantity: 5848770,
    purchaseUnit: "kg" as const,
    purchaseAmount: 94968000,
    shipmentQuantity: 6343626,
    shipmentUnit: "kg" as const,
    shipmentAmount: 120885332,
    flatbedFreight: 28882,
    craneFreight: 0,
    note: "",
    processingEntries: [
      { workerId: 1, workerNameSnapshot: "吳秋貴", processingWeightTons: 2988.65, feeAmount: 1298375, sortOrder: 0 },
      { workerId: 2, workerNameSnapshot: "黃鬆翰", processingWeightTons: 796.79, feeAmount: 400849, sortOrder: 1 },
      { workerId: 3, workerNameSnapshot: "古樂樂", processingWeightTons: 1355.5, feeAmount: 690488, sortOrder: 2 },
      { workerId: 4, workerNameSnapshot: "吳昇峰", processingWeightTons: 1002.21, feeAmount: 450000, sortOrder: 3 },
    ],
  };

  const metrics = computeMonthlyMetrics(form);

  it("produces four summary cards with net profit highlighted at the end", () => {
    const cards = getMonthlyReportPrintSummaryCards(metrics);

    expect(cards).toHaveLength(4);
    expect(cards.at(-1)).toMatchObject({ label: "本月利潤", tone: "dark" });
    expect(cards.map(card => card.label)).toEqual(["銷貨成本", "出貨每噸均價", "毛利", "本月利潤"]);
  });

  it("keeps freight fields compact and centered around the two key values", () => {
    const fields = getMonthlyReportPrintFreightFields(form, metrics);

    expect(fields).toEqual([
      { label: "板車運", value: "$28,882.00" },
      { label: "總運費", value: "$28,882.00" },
    ]);
  });

  it("builds print formulas from the current report values", () => {
    const formulas = getMonthlyReportPrintFormulas(form, metrics);

    expect(formulas).toHaveLength(2);
    expect(formulas[0]?.label).toBe("出貨每噸均價");
    expect(formulas[0]?.expression).toContain("$120,885,332.00");
    expect(formulas[1]?.result).toContain("元/噸");
  });

  it("returns the standard three signature slots", () => {
    expect(getMonthlyReportPrintSignatures()).toEqual(["製表", "核對", "主管"]);
  });
});
