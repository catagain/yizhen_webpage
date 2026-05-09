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
    purchaseQuantity: 1200,
    purchaseAmount: 9600000,
    shipmentQuantity: 1000,
    shipmentAmount: 15200000,
    flatbedWeightTons: 180,
    flatbedFreight: 320000,
    craneWeightTons: 260,
    craneFeePerTon: 1200,
    selfHaulWeightTons: 40,
    note: "春節前提前出貨",
    processingEntries: [
      {
        workerId: 1,
        workerNameSnapshot: "王大明",
        processingWeightTons: 120,
        feeAmount: 360000,
        sortOrder: 0,
      },
      {
        workerId: 2,
        workerNameSnapshot: "李小華",
        processingWeightTons: 80,
        feeAmount: 180000,
        sortOrder: 1,
      },
      ...createEmptyMonthlyReport("2026-01").processingEntries.slice(2),
    ],
  };

  const metrics = computeMonthlyMetrics(form);

  it("returns four summary cards including net profit", () => {
    const cards = getMonthlyReportPrintSummaryCards(metrics);

    expect(cards).toHaveLength(4);
    expect(cards.at(-1)).toMatchObject({
      label: "本月利潤",
      tone: "dark",
    });
  });

  it("includes freight fields required by the redesigned print layout", () => {
    const fields = getMonthlyReportPrintFreightFields(form, metrics);
    const labels = fields.map(field => field.label);

    expect(labels).toEqual([
      "板運噸數",
      "板車運費",
      "吊運噸數",
      "每噸費用",
      "吊卡運費",
      "不運噸數",
      "不運費用",
      "總運費",
    ]);
    expect(fields.find(field => field.label === "吊卡運費")?.value).toContain("312,000");
  });

  it("builds three formulas including crane freight and gross profit", () => {
    const formulas = getMonthlyReportPrintFormulas(form, metrics);

    expect(formulas).toHaveLength(3);
    expect(formulas[0]).toMatchObject({ label: "吊卡運公式" });
    expect(formulas[1].result).toContain("14,028.000 元/噸");
    expect(formulas[2]).toMatchObject({ label: "毛利公式" });
    expect(formulas[2].result).toContain("6,028.000 元/噸");
  });

  it("returns the fixed signature sequence", () => {
    expect(getMonthlyReportPrintSignatures()).toEqual(["製表", "核對", "主管"]);
  });
});
