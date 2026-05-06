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
                進貨、出貨、運費、加工與結果五大區塊會即時計算。運費區已拆開板運噸數、吊運噸數與不運噸數等紀錄欄位，其中吊卡運會依吊運噸數與每噸費用自動換算。
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
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">板車運</label>
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
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">吊卡運</label>
                    <DecimalInput value={metrics.craneFreight} readOnly className="rounded-none bg-muted" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">不運噸數</label>
                    <DecimalInput value={form.selfHaulWeightTons} onValueChange={value => updateField("selfHaulWeightTons", value)} className={REPORT_INPUT_CLASS_NAME} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">不含運</label>
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
          <article className="w-full break-after-page border border-black bg-white px-10 py-8">
            <div className="mx-auto flex max-w-[900px] flex-col gap-8">
              <header className="border-b border-black pb-6 text-center">
                <p className="text-[11px] uppercase tracking-[0.5em] text-neutral-500">Yizhen Costing System</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight">{formatMonthLabel(monthKey)} 月報列印版</h2>
                <p className="mt-3 text-sm text-neutral-600">完整呈現進貨、出貨、運費與利潤結果，供列印與簽核使用。</p>
              </header>

              <div className="grid grid-cols-4 gap-3">
                {printSummaryCards.map(card => (
                  <div key={card.label} className={`border px-4 py-4 ${card.tone === "dark" ? "border-black bg-black text-white" : "border-black bg-neutral-50 text-black"}`}>
                    <p className={`text-[10px] uppercase tracking-[0.24em] ${card.tone === "dark" ? "text-white/70" : "text-neutral-500"}`}>{card.label}</p>
                    <p className="mt-3 text-xl font-black tracking-tight">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <PrintSectionCard title="主檔參數">
                  <PrintDataGrid
                    rows={[
                      { label: "進貨數量", value: form.purchaseQuantity.toLocaleString("zh-TW") },
                      { label: "進貨單位", value: form.purchaseUnit },
                      { label: "進貨噸數", value: `${formatNumber(metrics.purchaseWeightTons)} 噸` },
                      { label: "進貨總金額", value: formatCurrency(form.purchaseAmount) },
                      { label: "進貨每噸均價", value: `${formatNumber(metrics.purchaseCostPerTon)} 元/噸` },
                      { label: "出貨數量", value: form.shipmentQuantity.toLocaleString("zh-TW") },
                      { label: "出貨單位", value: form.shipmentUnit },
                      { label: "出貨噸數", value: `${formatNumber(metrics.shipmentWeightTons)} 噸` },
                      { label: "出貨總金額", value: formatCurrency(form.shipmentAmount) },
                      { label: "出貨每噸均價", value: `${formatNumber(metrics.shipmentUnitPrice)} 元/噸` },
                    ]}
                  />
                </PrintSectionCard>

                <PrintSectionCard title="運費與結果">
                  <PrintDataGrid rows={printFreightFields} />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <PrintHighlightBox label="總加工費" value={formatCurrency(metrics.totalProcessingFee)} />
                    <PrintHighlightBox label="本月利潤" value={formatCurrency(metrics.netProfit)} inverted />
                  </div>
                </PrintSectionCard>
              </div>
            </div>
          </article>

          <article className="w-full border border-black bg-white px-10 py-8">
            <div className="mx-auto flex max-w-[900px] flex-col gap-8">
              <header className="border-b border-black pb-5 text-center">
                <h3 className="text-2xl font-black tracking-tight">加工、公式與簽核</h3>
                <p className="mt-2 text-sm text-neutral-600">第 2 頁集中列出加工明細、核心公式、備註與簽核欄。</p>
              </header>

              <PrintSectionCard title="加工明細">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-neutral-100 text-left">
                      <th className="border border-black px-3 py-2 font-bold">姓名</th>
                      <th className="border border-black px-3 py-2 font-bold">加工噸數</th>
                      <th className="border border-black px-3 py-2 font-bold">費用</th>
                      <th className="border border-black px-3 py-2 font-bold">均價</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filledProcessingEntries.length > 0 ? filledProcessingEntries : form.processingEntries.slice(0, 4)).map((entry, index) => {
                      const unitPrice = entry.processingWeightTons === 0 ? 0 : entry.feeAmount / entry.processingWeightTons;
                      return (
                        <tr key={`${entry.workerId ?? "row"}-${index}`}>
                          <td className="border border-black px-3 py-2">{entry.workerNameSnapshot || "—"}</td>
                          <td className="border border-black px-3 py-2">{formatNumber(entry.processingWeightTons)} 噸</td>
                          <td className="border border-black px-3 py-2">{formatCurrency(entry.feeAmount)}</td>
                          <td className="border border-black px-3 py-2">{formatNumber(unitPrice)} 元/噸</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </PrintSectionCard>

              <div className="grid grid-cols-2 gap-6">
                <PrintSectionCard title="公式區">
                  <div className="space-y-3">
                    {printFormulas.map(formula => (
                      <div key={formula.label} className="border border-black px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">{formula.label}</p>
                        <p className="mt-2 text-sm leading-6">{formula.expression}</p>
                        <p className="mt-2 text-base font-black">= {formula.result}</p>
                      </div>
                    ))}
                  </div>
                </PrintSectionCard>

                <PrintSectionCard title="備註與簽核">
                  <div className="border border-black px-4 py-4 text-sm leading-7">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500">備註</p>
                    <p className="mt-2 min-h-28 whitespace-pre-wrap">{form.note || "—"}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {printSignatures.map(signature => (
                      <div key={signature} className="border border-black px-4 pb-3 pt-12 text-center">
                        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{signature}</p>
                      </div>
                    ))}
                  </div>
                </PrintSectionCard>
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

function PrintSectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-black px-5 py-4">
      <div className="border-b border-black pb-3">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-500">{title}</p>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function PrintDataGrid({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {rows.map(row => (
        <div key={row.label} className="border-b border-dashed border-neutral-400 pb-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">{row.label}</p>
          <p className="mt-2 text-sm font-bold">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

function PrintHighlightBox({ label, value, inverted = false }: { label: string; value: string; inverted?: boolean }) {
  return (
    <div className={`border px-4 py-4 ${inverted ? "border-black bg-black text-white" : "border-black bg-neutral-50 text-black"}`}>
      <p className={`text-[11px] uppercase tracking-[0.18em] ${inverted ? "text-white/70" : "text-neutral-500"}`}>{label}</p>
      <p className="mt-2 text-lg font-black tracking-tight">{value}</p>
    </div>
  );
}
