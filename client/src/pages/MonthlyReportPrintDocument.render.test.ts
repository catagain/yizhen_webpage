import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { computeMonthlyMetrics, createEmptyMonthlyReport } from "@/lib/costing";
import {
  getMonthlyReportPrintFormulas,
  getMonthlyReportPrintSignatures,
  getMonthlyReportPrintSummaryCards,
} from "@/lib/monthlyReportPrint";
import { MonthlyReportPrintDocument } from "@/pages/MonthlyReportPrintDocument";

function getSectionSlice(markup: string, startMarker: string, endMarker: string) {
  const startIndex = markup.indexOf(startMarker);

  if (startIndex === -1) {
    return "";
  }

  const sliced = markup.slice(startIndex);
  const endIndex = sliced.indexOf(endMarker);

  if (endIndex === -1) {
    return sliced;
  }

  return sliced.slice(0, endIndex + endMarker.length);
}

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
    createElement(MonthlyReportPrintDocument, {
      monthKey: "2026-01",
      form,
      metrics,
      printSummaryCards: getMonthlyReportPrintSummaryCards(metrics),
      printFormulas: getMonthlyReportPrintFormulas(form, metrics),
      printSignatures: getMonthlyReportPrintSignatures(),
      processingEntriesForPrint: form.processingEntries,
    })
  );
  const blankNoteForm = { ...form, note: "" };
  const blankNoteMarkup = renderToStaticMarkup(
    createElement(MonthlyReportPrintDocument, {
      monthKey: "2026-01",
      form: blankNoteForm,
      metrics: computeMonthlyMetrics(blankNoteForm),
      printSummaryCards: getMonthlyReportPrintSummaryCards(computeMonthlyMetrics(blankNoteForm)),
      printFormulas: getMonthlyReportPrintFormulas(blankNoteForm, computeMonthlyMetrics(blankNoteForm)),
      printSignatures: getMonthlyReportPrintSignatures(),
      processingEntriesForPrint: blankNoteForm.processingEntries,
    })
  );

  it("renders exactly two print pages with fixed page numbering", () => {
    const pageMatches = markup.match(/data-testid="monthly-report-print-page-[12]"/g) ?? [];

    expect(pageMatches).toHaveLength(2);
    expect(markup).toContain("第 1 頁 / 共 2 頁");
    expect(markup).toContain("第 2 頁 / 共 2 頁");
  });

  it("keeps the page-one shipment table aligned with the mockup structure", () => {
    const shipmentTable = getSectionSlice(markup, 'data-section="page-1-shipment-table"', "</table>");
    const shipmentCols = shipmentTable.match(/<col style="width:[^"]+"/g) ?? [];

    expect(shipmentTable).toContain("出貨總金額");
    expect(shipmentTable).not.toContain("出貨每噸均價</th>");
    expect(shipmentCols).toEqual([
      '<col style="width:12%"',
      '<col style="width:23%"',
      '<col style="width:14%"',
      '<col style="width:26%"',
      '<col style="width:25%"',
    ]);
  });

  it("covers the key mockup sections and copy on both print pages", () => {
    const pageOneSummary = getSectionSlice(markup, 'data-section="page-1-summary-cards"', '</div><div class="flex items-center justify-between text-[11px] text-neutral-600">');
    const pageTwoSummary = getSectionSlice(markup, 'data-section="page-2-summary-cards"', '</div><div class="flex items-center justify-between text-[11px] text-neutral-600">');
    const pageTwoFormulas = getSectionSlice(markup, 'data-section="page-2-formulas"', '</div><div class="grid grid-cols-[1.2fr_0.88fr] gap-2.5">');

    expect(markup).toContain("data-section=\"page-1-meta-card\"");
    expect(markup).toContain("data-section=\"page-1-net-profit-card\"");
    expect(markup).toContain("data-section=\"page-1-purchase-table\"");
    expect(markup).toContain("data-section=\"page-1-freight-table\"");
    expect(markup).toContain("data-section=\"page-2-processing-table\"");
    expect(markup).toContain("data-section=\"page-2-note-block\"");
    expect(markup).toContain("data-section=\"page-2-approval-block\"");
    expect(pageOneSummary.match(/data-print-card="summary"/g) ?? []).toHaveLength(4);
    expect(pageTwoSummary.match(/data-print-card="summary"/g) ?? []).toHaveLength(4);
    expect(pageTwoFormulas.match(/data-print-card="formula"/g) ?? []).toHaveLength(3);
    expect(pageTwoFormulas).toContain("吊卡運公式");
    expect(pageTwoFormulas).toContain("銷貨成本公式");
    expect(pageTwoFormulas).toContain("毛利公式");
    expect(markup).toContain("本月利潤 Net Profit");
    expect(markup).toContain("NOTE / 備註");
    expect(markup).toContain("APPROVAL / 簽核");
    expect(markup).not.toContain("這一頁專門放主檔參數");
    expect(markup).not.toContain("這個區塊維持固定高度");
  });

  it("keeps the major print sections in the mockup order", () => {
    const purchaseIndex = markup.indexOf("PURCHASE / 進貨參數");
    const shipmentIndex = markup.indexOf("SHIPMENT / 出貨參數");
    const freightIndex = markup.indexOf("FREIGHT / 運費參數");
    const processingIndex = markup.indexOf("PROCESSING DETAILS / 加工明細");
    const noteIndex = markup.indexOf("NOTE / 備註");
    const approvalIndex = markup.indexOf("APPROVAL / 簽核");

    expect(purchaseIndex).toBeGreaterThan(-1);
    expect(shipmentIndex).toBeGreaterThan(purchaseIndex);
    expect(freightIndex).toBeGreaterThan(shipmentIndex);
    expect(processingIndex).toBeGreaterThan(freightIndex);
    expect(noteIndex).toBeGreaterThan(processingIndex);
    expect(approvalIndex).toBeGreaterThan(noteIndex);
  });

  it("captures the overall print-document structure with a stable leading fragment", () => {
    expect(markup.startsWith("<section class=\"print-only hidden print:block\"><div class=\"mx-auto w-full max-w-[820px] text-black\"><article class=\"break-after-page overflow-hidden bg-white px-3 py-4\" data-testid=\"monthly-report-print-page-1\">" )).toBe(true);
    expect(markup).toContain("data-testid=\"monthly-report-print-page-2\"");
  });

  it("keeps the note block visually present but empty when the report has no note", () => {
    const blankNoteBlock = getSectionSlice(blankNoteMarkup, 'data-section="page-2-note-block"', '</div><div class="border border-black px-4 py-3" data-section="page-2-approval-block">');

    expect(blankNoteBlock).toContain("NOTE / 備註");
    expect(blankNoteBlock).not.toContain("本月份無額外備註");
  });

  it("renders only print document markup without editor chrome", () => {
    expect(markup).toContain("class=\"print-only hidden print:block\"");
    expect(markup).not.toContain("screen-only");
    expect(markup).not.toContain("Monthly Report Editor");
  });
});
