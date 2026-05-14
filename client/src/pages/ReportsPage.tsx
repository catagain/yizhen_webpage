import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { REPORT_INPUT_CLASS_NAME } from "@/lib/reportInputStyles";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarPlus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 3,
  }).format(value);
}

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [monthInput, setMonthInput] = useState(() => new Date().toISOString().slice(0, 7));
  const [yearFilter, setYearFilter] = useState(() => String(new Date().getFullYear()));
  const [keyword, setKeyword] = useState("");
  const reportsQuery = trpc.costing.listReports.useQuery(
    Number.isFinite(Number(yearFilter)) ? { year: Number(yearFilter) } : undefined
  );

  const deleteReportMutation = trpc.costing.deleteReport.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.costing.listReports.invalidate(),
        utils.costing.annualSummary.invalidate(),
      ]);
      toast.success("月報已永久刪除");
    },
  });

  const filteredReports = useMemo(() => {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) return reportsQuery.data ?? [];
    return (reportsQuery.data ?? []).filter(report => report.monthKey.includes(normalizedKeyword));
  }, [keyword, reportsQuery.data]);

  const totals = useMemo(() => {
    const reports = filteredReports;
    return {
      count: reports.length,
      annualNetProfit: reports.reduce((sum, report) => sum + report.metrics.netProfit, 0),
    };
  }, [filteredReports]);

  const handleDelete = async (reportId: number, monthKey: string) => {
    const confirmed = window.confirm(`確定要永久刪除 ${monthKey} 月報嗎？刪除後無法復原。`);
    if (!confirmed) return;
    await deleteReportMutation.mutateAsync({ id: reportId });
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-foreground bg-card shadow-panel">
        <CardHeader className="border-b border-border">
          <p className="text-[11px] uppercase tracking-[0.5em] text-muted-foreground">Report Registry</p>
          <CardTitle className="text-4xl font-black tracking-tight">月報管理</CardTitle>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            每個月份對應一份獨立核算資料。你可以手動新增任意月份、回看歷史紀錄，也可以直接在列表中永久刪除不需要的月報。
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">建立或開啟月份</label>
            <Input type="month" value={monthInput} onChange={event => setMonthInput(event.target.value)} className={REPORT_INPUT_CLASS_NAME} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">年度篩選</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={yearFilter} onChange={event => setYearFilter(event.target.value)} className={`${REPORT_INPUT_CLASS_NAME} pl-10`} inputMode="numeric" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">月份搜尋</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={event => setKeyword(event.target.value)} className={`${REPORT_INPUT_CLASS_NAME} pl-10`} placeholder="例如 2026-04" />
            </div>
          </div>
          <div className="flex items-end">
            <Button className="h-10 rounded-none" onClick={() => monthInput && setLocation(`/reports/${monthInput}`)}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              前往該月份
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-none border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">篩選摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">{totals.count}</p>
            <p className="mt-2 text-sm text-muted-foreground">{yearFilter} 年符合條件的月報數量</p>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">年度營業毛利</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">{formatCurrency(totals.annualNetProfit)}</p>
            <p className="mt-2 text-sm text-muted-foreground">此數值為目前列表內月報的營業毛利合計。</p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-none border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-xl font-black">歷史月報</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {filteredReports.map(report => (
              <div key={report.id} className="flex items-center justify-between gap-4 border border-border px-4 py-4">
                <button
                  type="button"
                  onClick={() => setLocation(`/reports/${report.monthKey}`)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{report.monthKey}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      營業毛利 {formatCurrency(report.metrics.netProfit)} ｜ 加工運費成本 {formatCurrency(report.metrics.salesCost)} ｜ 每噸毛利 {report.metrics.grossProfitPerTon.toFixed(3)} 元/噸
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </button>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-none"
                  onClick={() => handleDelete(report.id, report.monthKey)}
                  disabled={deleteReportMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  刪除
                </Button>
              </div>
            ))}
            {!filteredReports.length ? (
              <div className="border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">
                這個年度目前沒有任何月報資料。你可以先在上方指定月份後進入建立。
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
