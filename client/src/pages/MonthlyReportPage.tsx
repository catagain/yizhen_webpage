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
  getMonthlyReportPrintSignatures,
  getMonthlyReportPrintSummaryCards,
} from "@/lib/monthlyReportPrint";
import { REPORT_INPUT_CLASS_NAME, REPORT_SELECT_CLASS_NAME } from "@/lib/reportInputStyles";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Printer, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { MonthlyReportPrintDocument } from "./MonthlyReportPrintDocument";

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
  const printFormulas = useMemo(() => getMonthlyReportPrintFormulas(form, metrics), [form, metrics]);
  const printSignatures = useMemo(() => getMonthlyReportPrintSignatures(), []);
  const filledProcessingEntries = useMemo(
    () => form.processingEntries.filter(entry => entry.workerId !== null || entry.processingWeightTons !== 0 || entry.feeAmount !== 0 || entry.workerNameSnapshot),
    [form.processingEntries]
  );
  const processingEntriesForPrint = useMemo(() => {
    const source = filledProcessingEntries.length > 0 ? filledProcessingEntries.slice(0, 4) : form.processingEntries.slice(0, 4);

    return Array.from({ length: 4 }, (_, index) => source[index] ?? {
      workerId: null,
      workerNameSnapshot: "",
      processingWeightTons: 0,
      feeAmount: 0,
      sortOrder: index,
    });
  }, [filledProcessingEntries, form.processingEntries]);

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

      <MonthlyReportPrintDocument
        monthKey={monthKey}
        form={form}
        metrics={metrics}
        printSummaryCards={printSummaryCards}
        printFormulas={printFormulas}
        printSignatures={printSignatures}
        processingEntriesForPrint={processingEntriesForPrint}
      />
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


