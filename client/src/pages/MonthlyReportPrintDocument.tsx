import React from "react";
import { computeMonthlyMetrics, type MonthlyReportFormValues } from "@/lib/costing";

type PrintMetrics = ReturnType<typeof computeMonthlyMetrics>;
type PrintSummaryCard = {
  label: string;
  value: string;
  tone: "light" | "dark";
};
type PrintFormula = {
  label: string;
  expression: string;
  result: string;
};
type ProcessingEntry = MonthlyReportFormValues["processingEntries"][number];

type MonthlyReportPrintDocumentProps = {
  monthKey: string;
  form: MonthlyReportFormValues;
  metrics: PrintMetrics;
  printSummaryCards: PrintSummaryCard[];
  printFormulas: PrintFormula[];
  printSignatures: string[];
  processingEntriesForPrint: ProcessingEntry[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 3,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatPrintCurrency(value: number) {
  return formatCurrency(value).replace("NT$", "");
}

export function MonthlyReportPrintDocument({
  monthKey,
  form,
  metrics,
  printSummaryCards,
  printFormulas,
  printSignatures,
  processingEntriesForPrint,
}: MonthlyReportPrintDocumentProps) {
  return (
    <section className="print-only hidden print:block">
      <div className="mx-auto w-full max-w-[820px] text-black">
        <article className="break-after-page overflow-hidden bg-white px-3 py-4" data-testid="monthly-report-print-page-1">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[430px]">
                <p className="text-[10px] uppercase tracking-[0.45em] text-neutral-500">YIZHEN COSTING SYSTEM</p>
                <h2 className="mt-2.5 max-w-[420px] text-[34px] font-black leading-[1.02] tracking-tight">{monthKey.slice(0, 4)}年{monthKey.slice(5, 7)}月月報列印版</h2>
              </div>
              <div className="w-[212px] shrink-0 border border-black bg-black px-4 py-3 text-white" data-section="page-1-meta-card">
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[11px] leading-5">
                  <span className="text-white/70">報表月份</span>
                  <span className="font-semibold">{monthKey}</span>
                  <span className="text-white/70">資料來源</span>
                  <span className="font-semibold">真實月報</span>
                  <span className="text-white/70">版面用途</span>
                  <span className="font-semibold">正式列印版</span>
                  <span className="text-white/70">頁次</span>
                  <span className="font-semibold">第 1 頁 / 共 2 頁</span>
                </div>
              </div>
            </div>

            <div className="h-[3px] w-full bg-black" />

            <div className="flex justify-end">
              <div className="w-[236px] border border-black bg-black px-4 py-3 text-white" data-section="page-1-net-profit-card">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">本月營業毛利 Operating Gross Margin</p>
                <p className="mt-4 text-[32px] font-black leading-none tracking-tight">{formatPrintCurrency(metrics.netProfit)}</p>
              </div>
            </div>

            <PrintTableHeading english="PURCHASE" chinese="進貨參數" note="所有原始輸入與換算單位同頁顯示" />
            <table className="w-full border-collapse text-[12px] leading-5" data-section="page-1-purchase-table">
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "17%" }} />
              </colgroup>
              <thead>
                <tr className="bg-[#f2efe6] text-center">
                  <th className="border border-black px-3 py-2 font-bold">區塊</th>
                  <th className="border border-black px-3 py-2 font-bold">進貨數量</th>
                  <th className="border border-black px-3 py-2 font-bold">單位</th>
                  <th className="border border-black px-3 py-2 font-bold">換算後進貨噸數</th>
                  <th className="border border-black px-3 py-2 font-bold">進貨總金額</th>
                  <th className="border border-black px-3 py-2 font-bold">進貨成本（元/噸）</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-right">
                  <td className="border border-black px-3 py-2 text-center font-bold">進貨</td>
                  <td className="border border-black px-3 py-2">{form.purchaseQuantity.toLocaleString("zh-TW")}</td>
                  <td className="border border-black px-3 py-2 text-center">{form.purchaseUnit === "kg" ? "kg" : "ton"}</td>
                  <td className="border border-black px-3 py-2">{formatNumber(metrics.purchaseWeightTons)}</td>
                  <td className="border border-black px-3 py-2">{Math.round(form.purchaseAmount).toLocaleString("zh-TW")}</td>
                  <td className="border border-black px-3 py-2">{formatNumber(metrics.purchaseCostPerTon)}</td>
                </tr>
              </tbody>
            </table>

            <PrintTableHeading english="SHIPMENT" chinese="出貨參數" note="保留數量、單位、噸數與總金額" />
            <table className="w-full border-collapse text-[12px] leading-5" data-section="page-1-shipment-table">
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "23%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "26%" }} />
                <col style={{ width: "25%" }} />
              </colgroup>
              <thead>
                <tr className="bg-[#f2efe6] text-center">
                  <th className="border border-black px-3 py-2 font-bold">區塊</th>
                  <th className="border border-black px-3 py-2 font-bold">出貨數量</th>
                  <th className="border border-black px-3 py-2 font-bold">單位</th>
                  <th className="border border-black px-3 py-2 font-bold">換算後出貨噸數</th>
                  <th className="border border-black px-3 py-2 font-bold">出貨總金額</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-right">
                  <td className="border border-black px-3 py-2 text-center font-bold">出貨</td>
                  <td className="border border-black px-3 py-2">{form.shipmentQuantity.toLocaleString("zh-TW")}</td>
                  <td className="border border-black px-3 py-2 text-center">{form.shipmentUnit === "kg" ? "kg" : "ton"}</td>
                  <td className="border border-black px-3 py-2">{formatNumber(metrics.shipmentWeightTons)}</td>
                  <td className="border border-black px-3 py-2">{Math.round(form.shipmentAmount).toLocaleString("zh-TW")}</td>
                </tr>
              </tbody>
            </table>

            <PrintTableHeading english="FREIGHT" chinese="運費參數" note="紀錄欄位與計算欄位分開排版" />
            <table className="w-full border-collapse text-[12px] leading-5" data-section="page-1-freight-table">
              <colgroup>
                <col style={{ width: "12.5%" }} />
                <col style={{ width: "12.5%" }} />
                <col style={{ width: "12.5%" }} />
                <col style={{ width: "12.5%" }} />
                <col style={{ width: "12.5%" }} />
                <col style={{ width: "12.5%" }} />
                <col style={{ width: "12.5%" }} />
                <col style={{ width: "12.5%" }} />
              </colgroup>
              <thead>
                <tr className="bg-[#f2efe6] text-center">
                  <th className="border border-black px-2.5 py-2 font-bold">板運噸數</th>
                  <th className="border border-black px-2.5 py-2 font-bold">板車運費</th>
                  <th className="border border-black px-2.5 py-2 font-bold">吊運噸數</th>
                  <th className="border border-black px-2.5 py-2 font-bold">每噸費用</th>
                  <th className="border border-black px-2.5 py-2 font-bold">吊卡運費</th>
                  <th className="border border-black px-2.5 py-2 font-bold">不運噸數</th>
                  <th className="border border-black px-2.5 py-2 font-bold">不運費用</th>
                  <th className="border border-black px-2.5 py-2 font-bold">總運費</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-right">
                  <td className="border border-black px-2.5 py-2">{formatNumber(form.flatbedWeightTons)}</td>
                  <td className="border border-black px-2.5 py-2">{Math.round(form.flatbedFreight).toLocaleString("zh-TW")}</td>
                  <td className="border border-black px-2.5 py-2">{formatNumber(form.craneWeightTons)}</td>
                  <td className="border border-black px-2.5 py-2">{Math.round(form.craneFeePerTon).toLocaleString("zh-TW")}</td>
                  <td className="border border-black px-2.5 py-2">{Math.round(metrics.craneFreight).toLocaleString("zh-TW")}</td>
                  <td className="border border-black px-2.5 py-2">{formatNumber(form.selfHaulWeightTons)}</td>
                  <td className="border border-black px-2.5 py-2">0</td>
                  <td className="border border-black px-2.5 py-2">{Math.round(metrics.totalFreight).toLocaleString("zh-TW")}</td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-4 gap-2.5" data-section="page-1-summary-cards">
              {printSummaryCards.map(card => (
                <PrintFooterMetric key={card.label} label={card.label} value={card.value.replace("NT$", "")} inverted={card.tone === "dark"} />
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-600">
              <p>新版方向：第 1 頁放主檔參數與結果速覽</p>
              <p>01 / 02</p>
            </div>
          </div>
        </article>

        <article className="overflow-hidden bg-white px-3 py-4" data-testid="monthly-report-print-page-2">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.45em] text-neutral-500">PRINT DETAIL PAGE</p>
                <h3 className="mt-2.5 text-[32px] font-black tracking-tight">加工明細、公式說明與備註</h3>
              </div>
              <p className="text-[12px] font-medium tracking-[0.2em] text-neutral-500">第 2 頁 / 共 2 頁</p>
            </div>

            <div className="h-[3px] w-full bg-black" />

            <PrintTableHeading english="PROCESSING DETAILS" chinese="加工明細" note="固定四列，避免每月高度跳動" />
            <table className="w-full border-collapse text-[12px] leading-5" data-section="page-2-processing-table">
              <colgroup>
                <col style={{ width: "10%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "26%" }} />
              </colgroup>
              <thead>
                <tr className="bg-[#f2efe6] text-center">
                  <th className="border border-black px-3 py-2 font-bold">序號</th>
                  <th className="border border-black px-3 py-2 font-bold">加工名稱</th>
                  <th className="border border-black px-3 py-2 font-bold">加工噸數</th>
                  <th className="border border-black px-3 py-2 font-bold">費用</th>
                  <th className="border border-black px-3 py-2 font-bold">均價（元/噸）</th>
                </tr>
              </thead>
              <tbody>
                {processingEntriesForPrint.map((entry, index) => {
                  const unitPrice = entry.processingWeightTons === 0 ? 0 : entry.feeAmount / entry.processingWeightTons;
                  return (
                    <tr key={`${entry.workerId ?? "row"}-${index}`} className="text-right">
                      <td className="border border-black px-3 py-2 text-center">{index + 1}</td>
                      <td className="border border-black px-3 py-2 text-left">{entry.workerNameSnapshot || "—"}</td>
                      <td className="border border-black px-3 py-2">{formatNumber(entry.processingWeightTons)}</td>
                      <td className="border border-black px-3 py-2">{Math.round(entry.feeAmount).toLocaleString("zh-TW")}</td>
                      <td className="border border-black px-3 py-2">{formatNumber(unitPrice)}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold text-right">
                  <td className="border border-black px-3 py-2 text-center" colSpan={3}>加工費合計</td>
                  <td className="border border-black px-3 py-2" colSpan={2}>{Math.round(metrics.totalProcessingFee).toLocaleString("zh-TW")}</td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-2.5" data-section="page-2-formulas">
              {printFormulas.map(formula => (
                <div key={formula.label} className="flex min-h-[146px] flex-col border border-black px-3.5 py-3" data-print-card="formula">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-700">{formula.label}</p>
                  <p className="mt-3 whitespace-pre-wrap text-[12px] leading-6 text-neutral-800">{formula.expression}</p>
                  <p className="mt-auto pt-3 text-[18px] font-black leading-tight tracking-tight">{formula.result}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1.2fr_0.88fr] gap-2.5">
              <div className="border border-black px-4 py-3" data-section="page-2-note-block">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-neutral-700">NOTE / 備註</p>
                <p className="mt-3.5 h-[92px] overflow-hidden whitespace-pre-wrap text-[12px] leading-6 text-neutral-800">{form.note || ""}</p>
              </div>
              <div className="border border-black px-4 py-3" data-section="page-2-approval-block">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-neutral-700">APPROVAL / 簽核</p>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center text-[12px]">
                  {printSignatures.map(signature => (
                    <div key={signature}>
                      <p>{signature}</p>
                      <div className="mt-10 border-b border-black" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5" data-section="page-2-summary-cards">
              <PrintFooterMetric label="進貨成本（元/噸）" value={formatNumber(metrics.purchaseCostPerTon)} />
              <PrintFooterMetric label="總運費" value={Math.round(metrics.totalFreight).toLocaleString("zh-TW")} />
              <PrintFooterMetric label="總加工費" value={Math.round(metrics.totalProcessingFee).toLocaleString("zh-TW")} />
              <PrintFooterMetric label="加工運費成本" value={Math.round(metrics.salesCost).toLocaleString("zh-TW")} inverted />
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-600">
              <p>新版方向：第 2 頁放加工明細、公式與簽核</p>
              <p>02 / 02</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function PrintTableHeading({ english, chinese, note }: { english: string; chinese: string; note: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <p className="text-[13px] font-black uppercase tracking-[0.28em]">{english} / {chinese}</p>
      <p className="text-[10px] text-neutral-500">{note}</p>
    </div>
  );
}

function PrintFooterMetric({ label, value, inverted = false }: { label: string; value: string; inverted?: boolean }) {
  return (
    <div className={`flex min-h-[78px] flex-col justify-between border border-black px-3.5 py-3 ${inverted ? "bg-black text-white" : "bg-white text-black"}`} data-print-card="summary">
      <p className={`text-[10px] uppercase tracking-[0.18em] ${inverted ? "text-white/75" : "text-neutral-500"}`}>{label}</p>
      <p className="mt-2 text-[18px] font-black leading-tight tracking-tight">{value}</p>
    </div>
  );
}
