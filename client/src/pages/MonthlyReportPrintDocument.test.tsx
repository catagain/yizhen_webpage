import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { computeMonthlyMetrics, createEmptyMonthlyReport } from "@/lib/costing";
import {
  getMonthlyReportPrintFormulas,
  getMonthlyReportPrintSignatures,
  getMonthlyReportPrintSummaryCards,
} from "@/lib/monthlyReportPrint";
import { MonthlyReportPrintDocument } from "@/pages/MonthlyReportPrintDocument";

describe("MonthlyReportPrintDocument", () => {
  const form = {
    ...createEmptyMonthlyReport("2026-01"),
    purchaseQuantity: 5848.77,
    purchaseUnit: "kg" as const,
    purchaseAmount: 94968000,
    shipmentQuantity: 6343.626,
    shipmentUnit: "kg" as const,
    shipmentAmount: 120885332,
    flatbedWeightTons: 0,
    flatbedFreight: 28882,
    craneWeightTons: 0,
    craneFeePerTon: 0,
    selfHaulWeightTons: 0,
    note: "本月份無額外備註。",
    processingEntries: [
      {
        workerId: 1,
        workerNameSnapshot: "吳秋貴",
        processingWeightTons: 2988.65,
        feeAmount: 1298375,
        sortOrder: 0,
      },
      {
        workerId: 2,
        workerNameSnapshot: "黃鬆翰",
        processingWeightTons: 796.79,
        feeAmount: 400849,
        sortOrder: 1,
      },
      {
        workerId: 3,
        workerNameSnapshot: "古樂樂",
        processingWeightTons: 1355.5,
        feeAmount: 690488,
        sortOrder: 2,
      },
      {
        workerId: 4,
        workerNameSnapshot: "吳昇峰",
        processingWeightTons: 1002.21,
        feeAmount: 450000,
        sortOrder: 3,
      },
    ],
  };

  const metrics = computeMonthlyMetrics(form);
  const markup = renderToStaticMarkup(
    <MonthlyReportPrintDocument
      monthKey="2026-01"
      form={form}
      metrics={metrics}
      printSummaryCards={getMonthlyReportPrintSummaryCards(metrics)}
      printFormulas={getMonthlyReportPrintFormulas(form, metrics)}
      printSignatures={getMonthlyReportPrintSignatures()}
      processingEntriesForPrint={form.processingEntries}
    />
  );

  it("renders exactly two print pages with fixed page numbering", () => {
    const pageMatches = markup.match(/data-testid="monthly-report-print-page-[12]"/g) ?? [];

    expect(pageMatches).toHaveLength(2);
    expect(markup).toContain("第 1 頁 / 共 2 頁");
    expect(markup).toContain("第 2 頁 / 共 2 頁");
  });

  it("keeps the page-one shipment table aligned with the mockup structure", () => {
    expect(markup).toContain("SHIPMENT / 出貨參數");
    expect(markup).toContain("出貨總金額");
    expect(markup).not.toContain("出貨每噸均價</th>");
  });

  it("renders only print document markup without editor chrome", () => {
    expect(markup).toContain("class=\"print-only hidden print:block\"");
    expect(markup).not.toContain("screen-only");
    expect(markup).not.toContain("Monthly Report Editor");
  });
});
