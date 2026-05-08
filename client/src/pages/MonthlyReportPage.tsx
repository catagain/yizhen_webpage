import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  computeMonthlyMetrics,
  createEmptyMonthlyReport,
  createEmptyProcessingEntries,
  formatMonthLabel,
  sanitizeDecimalInput,
  type MonthlyReportFormValues,
} from "@/lib/costing";
import {
  getMonthlyReportPrintFormulas,
  getMonthlyReportPrintFreightFields,
  getMonthlyReportPrintSignatures,
  getMonthlyReportPrintSummaryCards,
} from "@/lib/monthlyReportPrint";
import { REPORT_INPUT_CLASS_NAME, REPORT_SELECT_CLASS_NAME } from "@/lib/reportInputStyles";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Printer, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

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

function DecimalInput({
  value,
  onValueChange,
  className,
  readOnly = false,
}: {
  value: number;
  onValueChange?: (value: number) => void;
  className?: string;
  readOnly?: boolean;
}) {
  const [text, setText] = useState(() => `${value}`);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setText(`${value}`);
    }
  }, [isFocused, value]);

  if (readOnly) {
    return <Input value={value} readOnly className={className} inputMode="decimal" />;
  }

  return (
    <Input
      value={text}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setText(`${value}`);
      }}
      onChange={event => {
        const nextText = sanitizeDecimalInput(event.target.value);
        setText(nextText);

        if (!onValueChange) return;
        if (nextText === "" || nextText === "." || nextText === "-" || nextText === "-.") {
          onValueChange(0);
          return;
        }

        const parsed = Number.parseFloat(nextText);
        if (Number.isFinite(parsed)) {
          onValueChange(parsed);
        }
      }}
      className={className}
      inputMode="decimal"
    />
  );
}

export default function MonthlyReportPage({ monthKey }: { monthKey: string }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const workersQuery = trpc.workers.list.useQuery();
  const reportQuery = trpc.costing.getReport.useQuery({ monthKey });
  const [form, setForm] = useState<MonthlyReportFormValues>(() => createEmptyMonthlyReport(monthKey));
  const [reportId, setReportId] = useState<number | undefined>(undefined);

  const saveReportMutation = trpc.costing.saveReport.useMutation({
    onSuccess: async data => {
      setReportId(data?.id ?? undefined);
      await Promise.all([
        utils.costing.getReport.invalidate({ monthKey }),
        utils.costing.listReports.invalidate(),
        utils.costing.annualSummary.invalidate(),
      ]);
      toast.success("月報已儲存");
    },
  });

  const deleteReportMutation = trpc.costing.deleteReport.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.costing.getReport.invalidate({ monthKey }),
        utils.costing.listReports.invalidate(),
        utils.costing.annualSummary.invalidate(),
      ]);
      toast.success("月報已永久刪除");
      setLocation("/reports");
    },
  });

  useEffect(() => {
    const report = reportQuery.data;

    if (!report) {
      setReportId(undefined);
      setForm(createEmptyMonthlyReport(monthKey));
      return;
    }

    setReportId(report.id);
    const rows = createEmptyProcessingEntries();
    report.processingEntries.forEach((entry, index) => {
      if (!rows[index]) return;
      rows[index] = {
        workerId: entry.workerId,
        workerNameSnapshot: entry.workerNameSnapshot,
        processingWeightTons: entry.processingWeightTons,
        feeAmount: entry.feeAmount,
        sortOrder: index,
      };
    });

    setForm({
      monthKey: report.monthKey,
      purchaseQuantity: report.purchaseQuantity,
      purchaseUnit: report.purchaseUnit,
      purchaseAmount: report.purchaseAmount,
      shipmentQuantity: report.shipmentQuantity,
      shipmentUnit: report.shipmentUnit,
      shipmentAmount: report.shipmentAmount,
      flatbedWeightTons: report.flatbedWeightTons,
      flatbedFreight: report.flatbedFreight,
      craneWeightTons: report.craneWeightTons,
      craneFeePerTon: report.craneFeePerTon,
      selfHaulWeightTons: report.selfHaulWeightTons,
      note: report.note,
      processingEntries: rows,
    });
  }, [monthKey, reportQuery.data]);

  const metrics = useMemo(() => computeMonthlyMetrics(form), [form]);
  const workerOptions = workersQuery.data ?? [];
  const printSummaryCards = useMemo(() => getMonthlyReportPrintSummaryCards(metrics), [metrics]);
  const printFreightFields = useMemo(() => getMonthlyReportPrintFreightFields(form, metrics), [form, metrics]);
  const printFormulas = useMemo(() => getMonthlyReportPrintFormulas(form, metrics), [form, metrics]);
  const printSignatures = useMemo(() => getMonthlyReportPrintSignatures(), []);
  const filledProcessingEntries = useMemo(
    () => form.processingEntries.filter(entry => entry.workerId !== null || entry.processingWeightTons !== 0 || entry.feeAmount !== 0 || entry.workerNameSnapshot),
    [form.processingEntries]
  );

  const updateField = <K extends keyof MonthlyReportFormValues>(key: K, value: MonthlyReportFormValues[K]) => {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const updateProcessingEntry = (
    index: number,
    updater: (entry: MonthlyReportFormValues["processingEntries"][number]) => MonthlyReportFormValues["processingEntries"][number]
  ) => {
    setForm(current => ({
      ...current,
      processingEntries: current.processingEntries.map((entry, entryIndex) =>
        entryIndex === index ? updater(entry) : entry
      ),
    }));
  };

  const handleSave = async () => {
    await saveReportMutation.mutateAsync({
      id: reportId,
      monthKey,
      purchaseQuantity: form.purchaseQuantity,
      purchaseUnit: form.purchaseUnit,
      purchaseAmount: form.purchaseAmount,
      shipmentQuantity: form.shipmentQuantity,
      shipmentUnit: form.shipmentUnit,
      shipmentAmount: form.shipmentAmount,
      flatbedWeightTons: form.flatbedWeightTons,
      flatbedFreight: form.flatbedFreight,
      craneWeightTons: form.craneWeightTons,
      craneFeePerTon: form.craneFeePerTon,
      selfHaulWeightTons: form.selfHaulWeightTons,
      note: form.note,
      processingEntries: form.processingEntries,
    });
  };

  const handleDelete = async () => {
    if (!reportId) {
      toast.error("這份月報尚未儲存，無法刪除");
      return;
    }

    const confirmed = window.confirm(`確定要永久刪除 ${formatMonthLabel(monthKey)} 月報嗎？刪除後無法復原。`);
    if (!confirmed) return;

    await deleteReportMutation.mutateAsync({ id: reportId });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-foreground bg-card shadow-panel print:shadow-none">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.5em] text-muted-foreground">Monthly Report Editor</p>
              <CardTitle className="text-4xl font-black tracking-tight">{formatMonthLabel(monthKey)}</CardTitle>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                進貨、出貨、運費、加工與結果五大區塊會即時計算。運費區已拆開板運噸數、吊運噸數與不運噸數等紀錄欄位，其中吊卡運費會依吊運噸數與每噸費用自動換算。
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" className="rounded-none" onClick={() => setLocation("/reports")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回列表
              </Button>
              <Button variant="outline" className="rounded-none" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                列印月報
              </Button>
              <Button variant="destructive" className="rounded-none" onClick={handleDelete} disabled={!reportId || deleteReportMutation.isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                永久刪除
              </Button>
              <Button className="rounded-none" onClick={handleSave} disabled={saveReportMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                儲存月報
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="screen-only">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="rounded-none border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-xl font-black">進貨</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">進貨數量</label>
                  <DecimalInput value={form.purchaseQuantity} onValueChange={value => updateField("purchaseQuantity", value)} className={REPORT_INPUT_CLASS_NAME} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">單位</label>
                  <select value={form.purchaseUnit} onChange={event => updateField("purchaseUnit", event.target.value as "ton" | "kg")} className={REPORT_SELECT_CLASS_NAME}>
                    <option value="ton">噸</option>
                    <option value="kg">公斤</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">進貨總金額</label>
                  <DecimalInput value={form.purchaseAmount} onValueChange={value => updateField("purchaseAmount", value)} className={REPORT_INPUT_CLASS_NAME} />
                </div>
                <div className="border border-border bg-muted p-4 md:col-span-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">換算後進貨噸數 / 進貨成本（元/噸）</p>
                  <p className="mt-3 text-lg font-black tracking-tight">{formatNumber(metrics.purchaseWeightTons)} 噸 ／ {formatNumber(metrics.purchaseCostPerTon)} 元/噸</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-xl font-black">出貨</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">出貨數量</label>
                  <DecimalInput value={form.shipmentQuantity} onValueChange={value => updateField("shipmentQuantity", value)} className={REPORT_INPUT_CLASS_NAME} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">單位</label>
                  <select value={form.shipmentUnit} onChange={event => updateField("shipmentUnit", event.target.value as "ton" | "kg")} className={REPORT_SELECT_CLASS_NAME}>
                    <option value="ton">噸</option>
                    <option value="kg">公斤</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">出貨總金額</label>
                  <DecimalInput value={form.shipmentAmount} onValueChange={value => updateField("shipmentAmount", value)} className={REPORT_INPUT_CLASS_NAME} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-xl font-black">運費</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">板運噸數</label>
                    <DecimalInput value={form.flatbedWeightTons} onValueChange={value => updateField("flatbedWeightTons", value)} className={REPORT_INPUT_CLASS_NAME} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">板車運費</label>
                    <DecimalInput value={form.flatbedFreight} onValueChange={value => updateField("flatbedFreight", value)} className={REPORT_INPUT_CLASS_NAME} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">吊運噸數</label>
                    <DecimalInput value={form.craneWeightTons} onValueChange={value => updateField("craneWeightTons", value)} className={REPORT_INPUT_CLASS_NAME} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">每噸費用</label>
                    <DecimalInput value={form.craneFeePerTon} onValueChange={value => updateField("craneFeePerTon", value)} className={REPORT_INPUT_CLASS_NAME} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">吊卡運費</label>
                    <DecimalInput value={metrics.craneFreight} readOnly className="rounded-none bg-muted" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">不運噸數</label>
                    <DecimalInput value={form.selfHaulWeightTons} onValueChange={value => updateField("selfHaulWeightTons", value)} className={REPORT_INPUT_CLASS_NAME} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">不運費用</label>
                    <Input value="0" readOnly className="rounded-none bg-muted" />
                  </div>
                </div>
                <div className="border border-border bg-muted p-4 md:col-span-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">總運費</p>
                  <p className="mt-3 text-lg font-black tracking-tight">{formatCurrency(metrics.totalFreight)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-xl font-black">加工</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {form.processingEntries.map((entry, index) => (
                  <div key={index} className="grid gap-4 border border-border p-4 md:grid-cols-[1.05fr_0.95fr_0.85fr_0.8fr_0.85fr]">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">鐵工 {index + 1}</label>
                      <select
                        value={entry.workerId ?? ""}
                        onChange={event => {
                          const value = event.target.value;
                          const worker = workerOptions.find(option => option.id === Number(value));
                          updateProcessingEntry(index, current => ({
                            ...current,
                            workerId: value ? Number(value) : null,
                            workerNameSnapshot: worker?.name ?? current.workerNameSnapshot,
                          }));
                        }}
                        className={REPORT_SELECT_CLASS_NAME}
                      >
                        <option value="">未指定</option>
                        {workerOptions.map(worker => (
                          <option key={worker.id} value={worker.id}>{worker.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">加工名稱快照</label>
                      <Input value={entry.workerNameSnapshot} onChange={event => updateProcessingEntry(index, current => ({ ...current, workerNameSnapshot: event.target.value }))} className={REPORT_INPUT_CLASS_NAME} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">加工噸數</label>
                      <DecimalInput value={entry.processingWeightTons} onValueChange={value => updateProcessingEntry(index, current => ({ ...current, processingWeightTons: value }))} className={REPORT_INPUT_CLASS_NAME} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">費用</label>
                      <DecimalInput value={entry.feeAmount} onValueChange={value => updateProcessingEntry(index, current => ({ ...current, feeAmount: value }))} className={REPORT_INPUT_CLASS_NAME} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">均價</label>
                      <Input value={formatNumber(metrics.processingEntries[index]?.unitPricePerTon ?? 0)} readOnly className="rounded-none bg-muted" />
                    </div>
                  </div>
                ))}
                <div className="border border-border bg-muted p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">加工費合計</p>
                  <p className="mt-3 text-lg font-black tracking-tight">{formatCurrency(metrics.totalProcessingFee)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-none border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-xl font-black">結果</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6">
                <MetricBox label="銷貨成本" value={formatCurrency(metrics.salesCost)} description="計算式為總運費 + 總加工費" />
                <MetricBox label="出貨每噸均價" value={`${formatNumber(metrics.shipmentUnitPrice)} 元/噸`} description="計算式為（出貨總金額 - 總加工費 - 總運費）/ 出貨數量" />
                <MetricBox label="毛利" value={`${formatNumber(metrics.grossProfitPerTon)} 元/噸`} description="計算式為出貨每噸均價 - 進貨每噸均價" />
                <MetricBox label="本月利潤" value={formatCurrency(metrics.netProfit)} />
              </CardContent>
            </Card>

            <Card className="rounded-none border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-xl font-black">備註</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Textarea value={form.note} onChange={event => updateField("note", event.target.value)} className={`min-h-32 ${REPORT_INPUT_CLASS_NAME}`} placeholder="例如：春節延後請款，導致本月利潤偏高。" />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <section className="print-only hidden print:block">
        <div className="mx-auto flex w-full max-w-[980px] flex-col items-center gap-8 text-black">
          <article className="w-full break-after-page bg-white px-8 py-8">
            <div className="mx-auto flex max-w-[920px] flex-col gap-6">
              <header className="flex items-start justify-between gap-8 border-b-[3px] border-black pb-5">
                <div className="max-w-[560px]">
                  <p className="text-[11px] uppercase tracking-[0.5em] text-neutral-500">Yizhen Costing System</p>
                  <h2 className="mt-4 text-[52px] font-black leading-[0.94] tracking-tight">{monthKey.slice(0, 4)}年 {monthKey.slice(5, 7)} 月月報列印版</h2>
                </div>
                <div className="w-[260px] border border-black bg-black px-5 py-4 text-white">
                  <div className="grid grid-cols-[1fr_auto] gap-y-3 text-sm">
                    <span className="text-white/75">報表月份</span>
                    <span className="font-bold">{monthKey}</span>
                    <span className="text-white/75">資料來源</span>
                    <span className="font-bold">真實月報</span>
                    <span className="text-white/75">版面用途</span>
                    <span className="font-bold">正式列印版</span>
                    <span className="text-white/75">頁次</span>
                    <span className="font-bold">第 1 頁 / 共 2 頁</span>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-[1.55fr_1fr] gap-4">
                <div className="border border-black px-5 py-5 text-base leading-8">
                  本頁集中呈現進貨、出貨、運費原始輸入與核心結果，方便紙本列印、核對與簽核時快速比對主要母數。
                </div>
                <div className="border border-black bg-black px-5 py-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/75">本月利潤 Net Profit</p>
                  <p className="mt-6 text-[44px] font-black tracking-tight">{formatCurrency(metrics.netProfit).replace("NT$", "")}</p>
                </div>
              </div>

              <PrintTableHeading english="PURCHASE" chinese="進貨參數" note="所有原始輸入與換算單位同頁顯示" />
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f8f5ec] text-center">
                    <th className="border border-black px-4 py-3 font-bold">區塊</th>
                    <th className="border border-black px-4 py-3 font-bold">進貨數量</th>
                    <th className="border border-black px-4 py-3 font-bold">單位</th>
                    <th className="border border-black px-4 py-3 font-bold">換算後進貨噸數</th>
                    <th className="border border-black px-4 py-3 font-bold">進貨總金額</th>
                    <th className="border border-black px-4 py-3 font-bold">進貨成本（元/噸）</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-right">
                    <td className="border border-black px-4 py-3 text-center font-bold">進貨</td>
                    <td className="border border-black px-4 py-3">{form.purchaseQuantity.toLocaleString("zh-TW")}</td>
                    <td className="border border-black px-4 py-3 text-center">{form.purchaseUnit === "kg" ? "kg" : "ton"}</td>
                    <td className="border border-black px-4 py-3">{formatNumber(metrics.purchaseWeightTons)}</td>
                    <td className="border border-black px-4 py-3">{Math.round(form.purchaseAmount).toLocaleString("zh-TW")}</td>
                    <td className="border border-black px-4 py-3">{formatNumber(metrics.purchaseCostPerTon)}</td>
                  </tr>
                </tbody>
              </table>

              <PrintTableHeading english="SHIPMENT" chinese="出貨參數" note="保留數量、單位、噸數與總金額" />
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f8f5ec] text-center">
                    <th className="border border-black px-4 py-3 font-bold">區塊</th>
                    <th className="border border-black px-4 py-3 font-bold">出貨數量</th>
                    <th className="border border-black px-4 py-3 font-bold">單位</th>
                    <th className="border border-black px-4 py-3 font-bold">換算後出貨噸數</th>
                    <th className="border border-black px-4 py-3 font-bold">出貨總金額</th>
                    <th className="border border-black px-4 py-3 font-bold">出貨每噸均價</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-right">
                    <td className="border border-black px-4 py-3 text-center font-bold">出貨</td>
                    <td className="border border-black px-4 py-3">{form.shipmentQuantity.toLocaleString("zh-TW")}</td>
                    <td className="border border-black px-4 py-3 text-center">{form.shipmentUnit === "kg" ? "kg" : "ton"}</td>
                    <td className="border border-black px-4 py-3">{formatNumber(metrics.shipmentWeightTons)}</td>
                    <td className="border border-black px-4 py-3">{Math.round(form.shipmentAmount).toLocaleString("zh-TW")}</td>
                    <td className="border border-black px-4 py-3">{formatNumber(metrics.shipmentUnitPrice)}</td>
                  </tr>
                </tbody>
              </table>

              <PrintTableHeading english="FREIGHT" chinese="運費參數" note="紀錄欄位與計算欄位分開排版" />
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f8f5ec] text-center">
                    <th className="border border-black px-4 py-3 font-bold">板運噸數</th>
                    <th className="border border-black px-4 py-3 font-bold">板車運費</th>
                    <th className="border border-black px-4 py-3 font-bold">吊運噸數</th>
                    <th className="border border-black px-4 py-3 font-bold">每噸費用</th>
                    <th className="border border-black px-4 py-3 font-bold">吊卡運費</th>
                    <th className="border border-black px-4 py-3 font-bold">不運噸數</th>
                    <th className="border border-black px-4 py-3 font-bold">不運費用</th>
                    <th className="border border-black px-4 py-3 font-bold">總運費</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-right">
                    <td className="border border-black px-4 py-3">{formatNumber(form.flatbedWeightTons)}</td>
                    <td className="border border-black px-4 py-3">{Math.round(form.flatbedFreight).toLocaleString("zh-TW")}</td>
                    <td className="border border-black px-4 py-3">{formatNumber(form.craneWeightTons)}</td>
                    <td className="border border-black px-4 py-3">{Math.round(form.craneFeePerTon).toLocaleString("zh-TW")}</td>
                    <td className="border border-black px-4 py-3">{Math.round(metrics.craneFreight).toLocaleString("zh-TW")}</td>
                    <td className="border border-black px-4 py-3">{formatNumber(form.selfHaulWeightTons)}</td>
                    <td className="border border-black px-4 py-3">0</td>
                    <td className="border border-black px-4 py-3">{Math.round(metrics.totalFreight).toLocaleString("zh-TW")}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-4 gap-3">
                {printSummaryCards.map(card => (
                  <PrintFooterMetric key={card.label} label={card.label} value={card.value.replace("NT$", "")} inverted={card.tone === "dark"} />
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-neutral-600">
                <p>月報主檔參數與結果摘要</p>
                <p>01 / 02</p>
              </div>
            </div>
          </article>

          <article className="w-full bg-white px-8 py-8">
            <div className="mx-auto flex max-w-[920px] flex-col gap-6">
              <header className="flex items-end justify-between gap-8 border-b-[3px] border-black pb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.5em] text-neutral-500">Print Detail Page</p>
                  <h3 className="mt-4 text-[44px] font-black tracking-tight">加工明細、公式說明與備註</h3>
                </div>
                <p className="text-2xl font-medium text-neutral-500">第 2 頁 / 共 2 頁</p>
              </header>

              <PrintTableHeading english="PROCESSING DETAILS" chinese="加工明細" note="固定四列，避免每月高度跳動" />
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f8f5ec] text-center">
                    <th className="border border-black px-4 py-3 font-bold">序號</th>
                    <th className="border border-black px-4 py-3 font-bold">加工名稱</th>
                    <th className="border border-black px-4 py-3 font-bold">加工噸數</th>
                    <th className="border border-black px-4 py-3 font-bold">費用</th>
                    <th className="border border-black px-4 py-3 font-bold">均價（元/噸）</th>
                  </tr>
                </thead>
                <tbody>
                  {(filledProcessingEntries.length > 0 ? filledProcessingEntries : form.processingEntries.slice(0, 4)).slice(0, 4).map((entry, index) => {
                    const unitPrice = entry.processingWeightTons === 0 ? 0 : entry.feeAmount / entry.processingWeightTons;
                    return (
                      <tr key={`${entry.workerId ?? "row"}-${index}`} className="text-right">
                        <td className="border border-black px-4 py-3 text-center">{index + 1}</td>
                        <td className="border border-black px-4 py-3 text-left">{entry.workerNameSnapshot || "—"}</td>
                        <td className="border border-black px-4 py-3">{formatNumber(entry.processingWeightTons)}</td>
                        <td className="border border-black px-4 py-3">{Math.round(entry.feeAmount).toLocaleString("zh-TW")}</td>
                        <td className="border border-black px-4 py-3">{formatNumber(unitPrice)}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-bold text-right">
                    <td className="border border-black px-4 py-3 text-center" colSpan={3}>加工費合計</td>
                    <td className="border border-black px-4 py-3" colSpan={2}>{Math.round(metrics.totalProcessingFee).toLocaleString("zh-TW")}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-4">
                {printFormulas.map(formula => (
                  <div key={formula.label} className="border border-black px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-500">{formula.label}</p>
                    <p className="mt-4 whitespace-pre-wrap text-base leading-8">{formula.expression}</p>
                    <p className="mt-3 text-xl font-black tracking-tight">{formula.result}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[1.3fr_1fr] gap-4">
                <div className="border border-black px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">Note / 備註</p>
                  <p className="mt-5 min-h-32 whitespace-pre-wrap text-base leading-8">{form.note || "本月份無額外備註。"}</p>
                </div>
                <div className="border border-black px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-neutral-500">Approval / 簽核</p>
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    {printSignatures.map(signature => (
                      <div key={signature} className="space-y-12 text-center">
                        <p className="border-t border-black pt-2 text-base">{signature}</p>
                        <p className="border-t border-dashed border-neutral-500 pt-2 text-sm text-neutral-500">簽章</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <PrintFooterMetric label="進貨成本（元/噸）" value={formatNumber(metrics.purchaseCostPerTon)} />
                <PrintFooterMetric label="總運費" value={Math.round(metrics.totalFreight).toLocaleString("zh-TW")} />
                <PrintFooterMetric label="總加工費" value={Math.round(metrics.totalProcessingFee).toLocaleString("zh-TW")} />
                <PrintFooterMetric label="銷貨成本" value={Math.round(metrics.salesCost).toLocaleString("zh-TW")} inverted />
              </div>

              <div className="flex items-center justify-between text-sm text-neutral-600">
                <p>加工明細、公式說明與簽核欄</p>
                <p>02 / 02</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function MetricBox({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <div className="border border-border bg-muted p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
      {description ? <p className="mt-2 text-xs leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function PrintTableHeading({ english, chinese, note }: { english: string; chinese: string; note: string }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <p className="text-[18px] font-black uppercase tracking-[0.26em]">{english} / {chinese}</p>
      <p className="text-sm text-neutral-500">{note}</p>
    </div>
  );
}

function PrintFooterMetric({ label, value, inverted = false }: { label: string; value: string; inverted?: boolean }) {
  return (
    <div className={`border border-black px-4 py-4 ${inverted ? "bg-black text-white" : "bg-white text-black"}`}>
      <p className={`text-[11px] uppercase tracking-[0.18em] ${inverted ? "text-white/75" : "text-neutral-500"}`}>{label}</p>
      <p className="mt-4 text-[28px] font-black tracking-tight">{value}</p>
    </div>
  );
}
