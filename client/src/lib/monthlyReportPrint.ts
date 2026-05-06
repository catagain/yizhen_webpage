import { computeMonthlyMetrics, type MonthlyReportFormValues } from "@/lib/costing";

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

type MonthlyMetrics = ReturnType<typeof computeMonthlyMetrics>;

type PrintField = {
  label: string;
  value: string;
};

type PrintFormula = {
  label: string;
  expression: string;
  result: string;
};

export function getMonthlyReportPrintSummaryCards(metrics: MonthlyMetrics) {
  return [
    { label: "銷貨成本", value: formatCurrency(metrics.salesCost), tone: "light" as const },
    { label: "出貨每噸均價", value: `${formatNumber(metrics.shipmentUnitPrice)} 元/噸`, tone: "light" as const },
    { label: "毛利", value: `${formatNumber(metrics.grossProfitPerTon)} 元/噸`, tone: "light" as const },
    { label: "本月利潤", value: formatCurrency(metrics.netProfit), tone: "dark" as const },
  ];
}

export function getMonthlyReportPrintFreightFields(form: MonthlyReportFormValues, metrics: MonthlyMetrics): PrintField[] {
  return [
    { label: "板車運", value: formatCurrency(form.flatbedFreight) },
    { label: "總運費", value: formatCurrency(metrics.totalFreight) },
  ];
}

export function getMonthlyReportPrintFormulas(form: MonthlyReportFormValues, metrics: MonthlyMetrics): PrintFormula[] {
  return [
    {
      label: "出貨每噸均價",
      expression: `（${formatCurrency(form.shipmentAmount)} − ${formatCurrency(metrics.totalProcessingFee)} − ${formatCurrency(metrics.totalFreight)}）÷ ${formatNumber(form.shipmentQuantity)}`,
      result: `${formatNumber(metrics.shipmentUnitPrice)} 元/噸`,
    },
    {
      label: "毛利",
      expression: `${formatNumber(metrics.shipmentUnitPrice)} − ${formatNumber(metrics.purchaseCostPerTon)}`,
      result: `${formatNumber(metrics.grossProfitPerTon)} 元/噸`,
    },
  ];
}

export function getMonthlyReportPrintSignatures() {
  return ["製表", "核對", "主管"];
}
