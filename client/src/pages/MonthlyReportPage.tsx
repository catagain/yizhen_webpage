import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  computeMonthlyMetrics,
  createEmptyMonthlyReport,
  createEmptyProcessingEntries,
  formatMonthLabel,
  type MonthlyReportFormValues,
} from "@/lib/costing";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Printer, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

function numberFromInput(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function MonthlyReportPage({ monthKey }: { monthKey: string }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const workersQuery = trpc.workers.list.useQuery();
  const reportQuery = trpc.costing.getReport.useQuery({ monthKey });
  const saveReportMutation = trpc.costing.saveReport.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.costing.getReport.invalidate({ monthKey }),
        utils.costing.listReports.invalidate(),
        utils.costing.annualSummary.invalidate(),
      ]);
      toast.success("月報已儲存");
    },
  });

  const [form, setForm] = useState<MonthlyReportFormValues>(() => createEmptyMonthlyReport(monthKey));
  const [reportId, setReportId] = useState<number | undefined>(undefined);

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
      inHouseHeadcount: report.inHouseHeadcount,
      inHouseUnitCost: report.inHouseUnitCost,
      note: report.note,
      processingEntries: rows,
    });
  }, [monthKey, reportQuery.data]);

  const metrics = useMemo(() => computeMonthlyMetrics(form), [form]);

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
      inHouseHeadcount: form.inHouseHeadcount,
      inHouseUnitCost: form.inHouseUnitCost,
      note: form.note,
      processingEntries: form.processingEntries,
    });
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
                這一頁是整個系統的核心工作區。進貨、出貨、運費、加工與結果五大區塊會即時計算，所有均價統一顯示到小數第 3 位。
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
                <Input
                  value={form.purchaseQuantity}
                  onChange={event => updateField("purchaseQuantity", numberFromInput(event.target.value))}
                  className="rounded-none"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">單位</label>
                <select
                  value={form.purchaseUnit}
                  onChange={event => updateField("purchaseUnit", event.target.value as "ton" | "kg")}
                  className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
                >
                  <option value="ton">噸</option>
                  <option value="kg">公斤</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">進貨總金額</label>
                <Input
                  value={form.purchaseAmount}
                  onChange={event => updateField("purchaseAmount", numberFromInput(event.target.value))}
                  className="rounded-none"
                  inputMode="decimal"
                />
              </div>
              <div className="border border-border bg-muted p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">換算後進貨噸數 / 進貨成本（元/噸）</p>
                <p className="mt-3 text-lg font-black tracking-tight">
                  {formatNumber(metrics.purchaseWeightTons)} 噸 ／ {formatNumber(metrics.purchaseCostPerTon)} 元/噸
                </p>
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
                <Input
                  value={form.shipmentQuantity}
                  onChange={event => updateField("shipmentQuantity", numberFromInput(event.target.value))}
                  className="rounded-none"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">單位</label>
                <select
                  value={form.shipmentUnit}
                  onChange={event => updateField("shipmentUnit", event.target.value as "ton" | "kg")}
                  className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
                >
                  <option value="ton">噸</option>
                  <option value="kg">公斤</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">出貨總金額</label>
                <Input
                  value={form.shipmentAmount}
                  onChange={event => updateField("shipmentAmount", numberFromInput(event.target.value))}
                  className="rounded-none"
                  inputMode="decimal"
                />
              </div>
              <div className="border border-border bg-muted p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">換算後出貨噸數</p>
                <p className="mt-3 text-lg font-black tracking-tight">{formatNumber(metrics.shipmentWeightTons)} 噸</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl font-black">運費</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">板運</label>
                <Input
                  value={form.flatbedFreight}
                  onChange={event => updateField("flatbedFreight", numberFromInput(event.target.value))}
                  className="rounded-none"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">吊運</label>
                <Input
                  value={form.craneFreight}
                  onChange={event => updateField("craneFreight", numberFromInput(event.target.value))}
                  className="rounded-none"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">不含運</label>
                <Input value={0} disabled className="rounded-none bg-muted" />
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
                <div key={index} className="grid gap-4 border border-border p-4 md:grid-cols-[1.1fr_0.9fr_0.9fr_0.7fr]">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">加工名單 {index + 1}</label>
                    <select
                      value={entry.workerId ?? ""}
                      onChange={event => {
                        const nextId = event.target.value ? Number(event.target.value) : null;
                        const option = workerOptions.find(worker => worker.id === nextId) ?? null;
                        updateProcessingEntry(index, current => ({
                          ...current,
                          workerId: nextId,
                          workerNameSnapshot: option?.name ?? "",
                        }));
                      }}
                      className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm"
                    >
                      <option value="">請選擇</option>
                      {workerOptions.map(worker => (
                        <option key={worker.id} value={worker.id}>
                          {worker.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">加工噸數</label>
                    <Input
                      value={entry.processingWeightTons}
                      onChange={event =>
                        updateProcessingEntry(index, current => ({
                          ...current,
                          processingWeightTons: numberFromInput(event.target.value),
                        }))
                      }
                      className="rounded-none"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">費用</label>
                    <Input
                      value={entry.feeAmount}
                      onChange={event =>
                        updateProcessingEntry(index, current => ({
                          ...current,
                          feeAmount: numberFromInput(event.target.value),
                        }))
                      }
                      className="rounded-none"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">均價</label>
                    <div className="flex h-10 items-center border border-border bg-muted px-3 text-sm font-bold">
                      {formatNumber(metrics.processingEntries[index]?.unitPricePerTon ?? 0)}
                    </div>
                  </div>
                </div>
              ))}

              <div className="grid gap-4 border border-border p-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">自家人數</label>
                  <Input
                    value={form.inHouseHeadcount}
                    onChange={event => updateField("inHouseHeadcount", Math.max(0, Math.trunc(numberFromInput(event.target.value))))}
                    className="rounded-none"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">每人單價</label>
                  <Input
                    value={form.inHouseUnitCost}
                    onChange={event => updateField("inHouseUnitCost", numberFromInput(event.target.value))}
                    className="rounded-none"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">自家加工費</label>
                  <div className="flex h-10 items-center border border-border bg-muted px-3 text-sm font-bold">
                    {formatCurrency(metrics.inHouseProcessingFee)}
                  </div>
                </div>
              </div>

              <div className="border border-border bg-muted p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">總加工費</p>
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
            <CardContent className="space-y-3 pt-6">
              {[
                ["銷貨成本", formatCurrency(metrics.salesCost)],
                ["本月出貨每噸均價", `${formatNumber(metrics.shipmentUnitPrice)} 元/噸`],
                ["毛利（元/噸）", `${formatNumber(metrics.grossProfitPerTon)} 元/噸`],
                ["本月利潤（元）", formatCurrency(metrics.netProfit)],
              ].map(([label, value]) => (
                <div key={label} className="border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl font-black">月份備註</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea
                value={form.note}
                onChange={event => updateField("note", event.target.value)}
                className="min-h-[220px] rounded-none"
                placeholder="例如：春節延後請款，導致本月出貨總金額與利潤判讀需保留偏差註記。"
              />
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl font-black">口徑提醒</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 text-sm leading-7 text-muted-foreground">
              <p>進貨與出貨資料若原始單位是公斤，請直接切換單位為公斤，系統會自動換算成噸後再進入公式。</p>
              <p>不含運固定為 0；若實際上沒有板運或吊運，請將對應欄位保留為 0 即可。</p>
              <p>自家人力單價不寫死，你可以依該月實際條件調整，系統會將當月單價與月報一起保存。</p>
            </CardContent>
          </Card>
        </div>
        </section>
      </div>

      <section className="hidden print:block">
        <div className="border border-black bg-white p-6 text-black">
          <div className="border-b border-black pb-4">
            <p className="text-[11px] uppercase tracking-[0.35em]">YIZHEN MONTHLY COSTING REPORT</p>
            <h2 className="mt-3 text-3xl font-black">{formatMonthLabel(monthKey)}</h2>
            <p className="mt-2 text-sm leading-6">成本與利潤核算月報列印版。所有重量均以噸為統一口徑，金額與均價顯示到小數第 3 位。</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="border border-black p-4">
              <p className="text-xs uppercase tracking-[0.2em]">進貨</p>
              <p className="mt-2">數量：{formatNumber(form.purchaseQuantity)} {form.purchaseUnit === "ton" ? "噸" : "公斤"}</p>
              <p>換算噸數：{formatNumber(metrics.purchaseWeightTons)} 噸</p>
              <p>總金額：{formatCurrency(form.purchaseAmount)}</p>
              <p>進貨成本：{formatNumber(metrics.purchaseCostPerTon)} 元/噸</p>
            </div>
            <div className="border border-black p-4">
              <p className="text-xs uppercase tracking-[0.2em]">出貨</p>
              <p className="mt-2">數量：{formatNumber(form.shipmentQuantity)} {form.shipmentUnit === "ton" ? "噸" : "公斤"}</p>
              <p>換算噸數：{formatNumber(metrics.shipmentWeightTons)} 噸</p>
              <p>總金額：{formatCurrency(form.shipmentAmount)}</p>
              <p>每噸均價：{formatNumber(metrics.shipmentUnitPrice)} 元/噸</p>
            </div>
            <div className="border border-black p-4">
              <p className="text-xs uppercase tracking-[0.2em]">運費與加工</p>
              <p className="mt-2">板運：{formatCurrency(form.flatbedFreight)}</p>
              <p>吊運：{formatCurrency(form.craneFreight)}</p>
              <p>總運費：{formatCurrency(metrics.totalFreight)}</p>
              <p>總加工費：{formatCurrency(metrics.totalProcessingFee)}</p>
            </div>
            <div className="border border-black p-4">
              <p className="text-xs uppercase tracking-[0.2em]">結果</p>
              <p className="mt-2">銷貨成本：{formatCurrency(metrics.salesCost)}</p>
              <p>毛利：{formatNumber(metrics.grossProfitPerTon)} 元/噸</p>
              <p>本月利潤：{formatCurrency(metrics.netProfit)}</p>
              <p>自家人力：{form.inHouseHeadcount} 人 × {formatCurrency(form.inHouseUnitCost)}</p>
            </div>
          </div>

          <div className="mt-6 border border-black p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.2em]">加工明細</p>
            <div className="mt-3 space-y-2">
              {form.processingEntries.map((entry, index) => (
                <div key={`print-${index}`} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 border-b border-dashed border-black/40 pb-2 last:border-b-0 last:pb-0">
                  <p>{entry.workerNameSnapshot || `名單 ${index + 1}`}</p>
                  <p>{formatNumber(entry.processingWeightTons)} 噸</p>
                  <p>{formatCurrency(entry.feeAmount)}</p>
                  <p>{formatNumber(metrics.processingEntries[index]?.unitPricePerTon ?? 0)} 元/噸</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border border-black p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.2em]">備註</p>
            <p className="mt-3 min-h-20 leading-6">{form.note || "無"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
