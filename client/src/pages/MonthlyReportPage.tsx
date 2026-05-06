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
      flatbedFreight: report.flatbedFreight,
      craneFreight: report.craneFreight,
      note: report.note,
      processingEntries: rows,
    });
  }, [monthKey, reportQuery.data]);

  const metrics = useMemo(() => computeMonthlyMetrics(form), [form]);
  const printSummaryCards = useMemo(() => getMonthlyReportPrintSummaryCards(metrics), [metrics]);
  const printFreightFields = useMemo(() => getMonthlyReportPrintFreightFields(form, metrics), [form, metrics]);
  const printFormulas = useMemo(() => getMonthlyReportPrintFormulas(form, metrics), [form, metrics]);
  const printSignatures = useMemo(() => getMonthlyReportPrintSignatures(), []);
  const workerOptions = workersQuery.data ?? [];

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
      flatbedFreight: form.flatbedFreight,
      craneFreight: form.craneFreight,
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
                進貨、出貨、運費、加工與結果五大區塊會即時計算。加工區現在只保留四組鐵工明細，並新增每筆加工均價唯讀欄位；自家欄位已移除。
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
                  <DecimalInput value={form.purchaseQuantity} onValueChange={value => updateField("purchaseQuantity", value)} className="rounded-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">單位</label>
                  <select value={form.purchaseUnit} onChange={event => updateField("purchaseUnit", event.target.value as "ton" | "kg")} className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm">
                    <option value="ton">噸</option>
                    <option value="kg">公斤</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">進貨總金額</label>
                  <DecimalInput value={form.purchaseAmount} onValueChange={value => updateField("purchaseAmount", value)} className="rounded-none" />
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
                  <DecimalInput value={form.shipmentQuantity} onValueChange={value => updateField("shipmentQuantity", value)} className="rounded-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">單位</label>
                  <select value={form.shipmentUnit} onChange={event => updateField("shipmentUnit", event.target.value as "ton" | "kg")} className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm">
                    <option value="ton">噸</option>
                    <option value="kg">公斤</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">出貨總金額</label>
                  <DecimalInput value={form.shipmentAmount} onValueChange={value => updateField("shipmentAmount", value)} className="rounded-none" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border-border bg-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-xl font-black">運費</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">板車運</label>
                  <DecimalInput value={form.flatbedFreight} onValueChange={value => updateField("flatbedFreight", value)} className="rounded-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">吊卡運</label>
                  <DecimalInput value={form.craneFreight} onValueChange={value => updateField("craneFreight", value)} className="rounded-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">不含運</label>
                  <Input value="0" readOnly className="rounded-none bg-muted" />
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
                        className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
                      >
                        <option value="">未指定</option>
                        {workerOptions.map(worker => (
                          <option key={worker.id} value={worker.id}>{worker.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">加工名稱快照</label>
                      <Input value={entry.workerNameSnapshot} onChange={event => updateProcessingEntry(index, current => ({ ...current, workerNameSnapshot: event.target.value }))} className="rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">加工噸數</label>
                      <DecimalInput value={entry.processingWeightTons} onValueChange={value => updateProcessingEntry(index, current => ({ ...current, processingWeightTons: value }))} className="rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">費用</label>
                      <DecimalInput value={entry.feeAmount} onValueChange={value => updateProcessingEntry(index, current => ({ ...current, feeAmount: value }))} className="rounded-none" />
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
                <Textarea value={form.note} onChange={event => updateField("note", event.target.value)} className="min-h-32 rounded-none" placeholder="例如：春節延後請款，導致本月利潤偏高。" />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <section className="print-only hidden bg-white text-black print:block">
        <div className="mx-auto flex min-h-[277mm] max-w-[182mm] flex-col border border-black bg-white px-6 py-7">
          <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-5">
            <div className="max-w-[120mm] flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.5em] text-neutral-500">Printable Monthly Summary</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight">{formatMonthLabel(monthKey)} 成本與利潤月報</h2>
            </div>
            <div className="w-[48mm] shrink-0 border border-black bg-black px-4 py-3 text-white">
              <div className="grid gap-1 text-[11px]">
                <div className="flex items-center justify-between gap-3"><span>頁次</span><span className="font-bold">1 / 2</span></div>
                <div className="flex items-center justify-between gap-3"><span>報表月份</span><span className="font-bold">{monthKey}</span></div>
                <div className="flex items-center justify-between gap-3"><span>資料型態</span><span className="font-bold">月報主檔</span></div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-none border border-black bg-stone-50 px-5 py-4 text-center text-sm leading-7">
            此頁完整呈現月報主檔參數與核心結果，讓列印時先看得到進貨、出貨、運費與主要績效數字，不再只剩摘要卻找不到來源。
          </div>

          <div className="mt-5 space-y-4">
            <PrintSection title="進貨參數" description="原始輸入與換算值置中排列，避免左側留白過大。">
              <div className="overflow-hidden border border-black">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-stone-100 text-center font-bold">
                      <th className="border border-black px-3 py-2">進貨數量</th>
                      <th className="border border-black px-3 py-2">單位</th>
                      <th className="border border-black px-3 py-2">換算後進貨噸數</th>
                      <th className="border border-black px-3 py-2">進貨總金額</th>
                      <th className="border border-black px-3 py-2">進貨成本（元/噸）</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-center">
                      <td className="border border-black px-3 py-2">{formatNumber(form.purchaseQuantity)}</td>
                      <td className="border border-black px-3 py-2">{form.purchaseUnit}</td>
                      <td className="border border-black px-3 py-2">{formatNumber(metrics.purchaseWeightTons)} 噸</td>
                      <td className="border border-black px-3 py-2">{formatCurrency(form.purchaseAmount)}</td>
                      <td className="border border-black px-3 py-2">{formatNumber(metrics.purchaseCostPerTon)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PrintSection>

            <PrintSection title="出貨參數" description="主數據維持正中對齊，列印時更容易核對。">
              <div className="overflow-hidden border border-black">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-stone-100 text-center font-bold">
                      <th className="border border-black px-3 py-2">出貨數量</th>
                      <th className="border border-black px-3 py-2">單位</th>
                      <th className="border border-black px-3 py-2">換算後出貨噸數</th>
                      <th className="border border-black px-3 py-2">出貨總金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-center">
                      <td className="border border-black px-3 py-2">{formatNumber(form.shipmentQuantity)}</td>
                      <td className="border border-black px-3 py-2">{form.shipmentUnit}</td>
                      <td className="border border-black px-3 py-2">{formatNumber(metrics.shipmentWeightTons)} 噸</td>
                      <td className="border border-black px-3 py-2">{formatCurrency(form.shipmentAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PrintSection>

            <PrintSection title="運費摘要" description="整體集中在頁面中軸，不再讓內容偏左。">
              <div className="grid grid-cols-2 gap-3">
                {printFreightFields.map(field => (
                  <PrintValueCard key={field.label} label={field.label} value={field.value} />
                ))}
              </div>
            </PrintSection>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {printSummaryCards.map(card => (
              <PrintValueCard key={card.label} label={card.label} value={card.value} dark={card.tone === "dark"} />
            ))}
          </div>
        </div>

        <div className="mx-auto mt-4 flex min-h-[277mm] max-w-[182mm] flex-col border border-black bg-white px-6 py-7 print:mt-0 print:break-before-page">
          <div className="flex items-end justify-between gap-4 border-b-2 border-black pb-5">
            <div className="flex-1 text-center">
              <p className="text-[11px] uppercase tracking-[0.5em] text-neutral-500">Print Detail Page</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">加工明細、公式說明與備註</h2>
            </div>
            <div className="text-sm font-bold">2 / 2</div>
          </div>

          <div className="mt-5">
            <PrintSection title="加工明細" description="資料表置中展開，固定四列，避免第二頁左重右輕。">
              <div className="overflow-hidden border border-black">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-stone-100 text-center font-bold">
                      <th className="border border-black px-3 py-2">序號</th>
                      <th className="border border-black px-3 py-2">加工名稱</th>
                      <th className="border border-black px-3 py-2">加工噸數</th>
                      <th className="border border-black px-3 py-2">費用</th>
                      <th className="border border-black px-3 py-2">均價（元/噸）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.processingEntries.map((entry, index) => (
                      <tr key={`${entry.workerNameSnapshot}-${index}`} className="text-center">
                        <td className="border border-black px-3 py-2">{index + 1}</td>
                        <td className="border border-black px-3 py-2">{entry.workerNameSnapshot || `鐵工 ${index + 1}`}</td>
                        <td className="border border-black px-3 py-2">{formatNumber(entry.processingWeightTons)}</td>
                        <td className="border border-black px-3 py-2">{formatCurrency(entry.feeAmount)}</td>
                        <td className="border border-black px-3 py-2">{formatNumber(entry.unitPricePerTon)}</td>
                      </tr>
                    ))}
                    <tr className="text-center font-bold">
                      <td className="border border-black px-3 py-2" colSpan={3}>加工費合計</td>
                      <td className="border border-black px-3 py-2" colSpan={2}>{formatCurrency(metrics.totalProcessingFee)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PrintSection>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {printFormulas.map(formula => (
              <div key={formula.label} className="border border-black bg-stone-50 p-4 text-center">
                <p className="text-sm font-black tracking-[0.08em]">{formula.label}</p>
                <p className="mt-3 text-sm leading-7">{formula.expression}</p>
                <p className="mt-3 text-lg font-black">{formula.result}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[1.2fr_0.8fr] gap-3">
            <div className="border border-black bg-stone-50 p-4">
              <p className="text-sm font-black tracking-[0.08em]">備註</p>
              <p className="mt-3 min-h-24 text-sm leading-7">{form.note || "本月份無備註。"}</p>
            </div>
            <div className="border border-black bg-stone-50 p-4">
              <p className="text-sm font-black tracking-[0.08em]">簽核</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {printSignatures.map(label => (
                  <div key={label} className="flex h-24 flex-col justify-between border-t border-black pt-2 text-center text-xs">
                    <span>{label}</span>
                    <span>________________</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <PrintValueCard label="進貨成本" value={`${formatNumber(metrics.purchaseCostPerTon)} 元/噸`} />
            <PrintValueCard label="總運費" value={formatCurrency(metrics.totalFreight)} />
            <PrintValueCard label="總加工費" value={formatCurrency(metrics.totalProcessingFee)} />
            <PrintValueCard label="銷貨成本" value={formatCurrency(metrics.salesCost)} dark />
          </div>
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

function PrintSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-4">
        <p className="text-sm font-black uppercase tracking-[0.18em]">{title}</p>
        <p className="text-[11px] text-neutral-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function PrintValueCard({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`border border-black p-4 text-center ${dark ? "bg-black text-white" : "bg-stone-50 text-black"}`}>
      <p className={`text-xs uppercase tracking-[0.18em] ${dark ? "text-white/70" : "text-neutral-500"}`}>{label}</p>
      <p className="mt-3 text-xl font-black tracking-tight">{value}</p>
    </div>
  );
}
