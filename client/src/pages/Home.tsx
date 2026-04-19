import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Calculator, CalendarDays, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";

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

export default function Home() {
  const currentYear = new Date().getFullYear();
  const reportsQuery = trpc.costing.listReports.useQuery();
  const annualSummaryQuery = trpc.costing.annualSummary.useQuery({ year: currentYear });

  const latestReport = reportsQuery.data?.[0] ?? null;
  const kpis = useMemo(() => {
    if (!latestReport) {
      return [
        { label: "最新月報淨利潤", value: "尚無資料" },
        { label: "最新月報毛利（元/噸）", value: "尚無資料" },
        { label: "最新月報銷貨成本", value: "尚無資料" },
      ];
    }

    return [
      {
        label: `最新月報淨利潤｜${latestReport.monthKey}`,
        value: formatCurrency(latestReport.metrics.netProfit),
      },
      {
        label: "最新月報毛利（元/噸）",
        value: formatNumber(latestReport.metrics.grossProfitPerTon),
      },
      {
        label: "最新月報銷貨成本",
        value: formatCurrency(latestReport.metrics.salesCost),
      },
    ];
  }, [latestReport]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="rounded-none border-foreground bg-card shadow-panel">
          <CardHeader className="space-y-4 border-b border-border pb-6">
            <p className="text-[11px] uppercase tracking-[0.5em] text-muted-foreground">Monthly Costing Core</p>
            <div className="space-y-3">
              <CardTitle className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
                以月份為主體的成本與利潤核算儀表板
              </CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                核心流程固定為進貨、出貨、運費、加工與結果五大區塊，全部統一以噸數口徑與三位小數規則處理，避免手算偏差與月度比較失真。
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
            {kpis.map(item => (
              <div key={item.label} className="border border-border bg-muted p-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                <p className="mt-4 text-2xl font-black tracking-tight">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-none border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                快速入口
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/reports" className="block border border-border p-4 transition-colors hover:bg-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">月報列表</p>
                    <p className="mt-1 text-xs text-muted-foreground">建立任意月份月報並開啟歷史資料。</p>
                  </div>
                  <CalendarDays className="h-4 w-4" />
                </div>
              </Link>
              <Link href="/annual" className="block border border-border p-4 transition-colors hover:bg-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">年度彙總</p>
                    <p className="mt-1 text-xs text-muted-foreground">比較淨利潤月增減與年度走勢。</p>
                  </div>
                  <TrendingUp className="h-4 w-4" />
                </div>
              </Link>
              <Link href="/workers" className="block border border-border p-4 transition-colors hover:bg-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">鐵工名單</p>
                    <p className="mt-1 text-xs text-muted-foreground">維護月報下拉選單使用的加工人員資料。</p>
                  </div>
                  <Calculator className="h-4 w-4" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                本年摘要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{currentYear} 年累積淨利潤</p>
              <p className="mt-4 text-3xl font-black tracking-tight">
                {annualSummaryQuery.data ? formatCurrency(annualSummaryQuery.data.annualNetProfit) : "載入中"}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                已建立月報數：{annualSummaryQuery.data?.months.length ?? 0}。若要檢視單月公式明細，請直接進入月報管理頁。
              </p>
              <Button asChild className="mt-6 rounded-none">
                <Link href="/reports">
                  進入月報管理
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-none border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-black">最近月報</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {(reportsQuery.data ?? []).slice(0, 5).map(report => (
                <Link
                  key={report.id}
                  href={`/reports/${report.monthKey}`}
                  className="flex items-center justify-between border border-border px-4 py-4 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-bold">{report.monthKey}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      淨利潤 {formatCurrency(report.metrics.netProfit)} ｜ 毛利 {formatNumber(report.metrics.grossProfitPerTon)} 元/噸
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
              {!reportsQuery.data?.length ? (
                <div className="border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                  目前還沒有建立月報。請先到月報管理頁建立任意月份資料。
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-black">操作提醒</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 text-sm leading-7 text-muted-foreground">
            <p>
              所有月報以「噸」為唯一口徑保存。若原始資料為公斤，系統會先換算成噸，再套用全部計算公式。
            </p>
            <p>
              不含運固定為 0；加工費由四組鐵工費用與自家人力成本共同構成，自家人力單價可依月份調整並跟著月報保存。
            </p>
            <p>
              年度彙總頁面的漲幅比較指標以淨利潤為主，會同時顯示相較上月的增減金額與增減百分比。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
