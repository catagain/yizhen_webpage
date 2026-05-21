import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type ReactNode, useMemo, useState } from "react";

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 3,
  }).format(value);
}

function formatRate(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(3)}%`;
}

export function formatChartYAxisTick(value: number) {
  return `${value / 10000}萬`;
}

export function formatPerTonTick(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

export const NET_PROFIT_Y_AXIS_TICKS = [1000000, 5000000, 10000000, 15000000, 20000000] as const;
export const TREND_LINE_RED = "#b91c1c";

type AnnualChartMonth = {
  monthKey: string;
  netProfit: number;
  grossProfitPerTon: number;
};

export function buildAnnualChartData(months: AnnualChartMonth[], year: number) {
  return months.map(month => ({
    monthKey: month.monthKey.replace(`${year}-`, ""),
    netProfit: month.netProfit,
    grossProfitPerTon: month.grossProfitPerTon,
  }));
}

export default function AnnualOverviewPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const annualSummaryQuery = trpc.costing.annualSummary.useQuery({ year });

  const chartData = useMemo(
    () => buildAnnualChartData(annualSummaryQuery.data?.months ?? [], year),
    [annualSummaryQuery.data, year]
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-none border-foreground bg-card shadow-panel">
        <CardHeader className="border-b border-border">
          <p className="text-[11px] uppercase tracking-[0.5em] text-muted-foreground">Annual Profit Trends</p>
          <CardTitle className="text-4xl font-black tracking-tight">年度彙總</CardTitle>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            此頁同時呈現營業毛利與每噸毛利走勢。營業毛利圖以月度金額比較，每噸毛利圖則沿用既有每噸毛利公式，顯示單噸獲利的時間變化。
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">年度</label>
            <Input
              value={String(year)}
              onChange={event => setYear(Number(event.target.value) || new Date().getFullYear())}
              className="w-40 rounded-none"
              inputMode="numeric"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-none" onClick={() => setYear(previous => previous - 1)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              前一年
            </Button>
            <Button variant="outline" className="rounded-none" onClick={() => setYear(previous => previous + 1)}>
              後一年
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-none border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">年度累積營業毛利</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">
              {annualSummaryQuery.data ? formatCurrency(annualSummaryQuery.data.annualNetProfit) : "載入中"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">已建月份</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">{annualSummaryQuery.data?.months.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">最新月變動</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight">
              {formatCurrency(annualSummaryQuery.data?.months.at(-1)?.netProfitChangeAmount ?? null)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatRate(annualSummaryQuery.data?.months.at(-1)?.netProfitChangeRate ?? null)}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TrendChartCard title="營業毛利走勢" description="橫軸為月份，縱軸為營業毛利金額。">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--color-grid)" />
              <XAxis dataKey="monthKey" stroke="var(--color-muted-foreground)" />
              <YAxis
                stroke="var(--color-muted-foreground)"
                domain={[0, 20000000]}
                ticks={[...NET_PROFIT_Y_AXIS_TICKS]}
                tickFormatter={formatChartYAxisTick}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 0,
                }}
                labelFormatter={label => `${year}-${label}`}
                formatter={(value: number) => [formatCurrency(value), "營業毛利"]}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                stroke={TREND_LINE_RED}
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 0, fill: TREND_LINE_RED }}
                activeDot={{ r: 5, fill: TREND_LINE_RED, stroke: TREND_LINE_RED }}
              />
            </LineChart>
          </ResponsiveContainer>
        </TrendChartCard>

        <TrendChartCard title="每噸毛利走勢" description="橫軸為月份，縱軸為每噸毛利，沿用既有每噸毛利公式。">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--color-grid)" />
              <XAxis dataKey="monthKey" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" tickFormatter={formatPerTonTick} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 0,
                }}
                labelFormatter={label => `${year}-${label}`}
                formatter={(value: number) => [`${formatPerTonTick(value)} 元/噸`, "每噸毛利"]}
              />
              <Line
                type="monotone"
                dataKey="grossProfitPerTon"
                stroke={TREND_LINE_RED}
                strokeWidth={3}
                dot={{ r: 3, strokeWidth: 0, fill: TREND_LINE_RED }}
                activeDot={{ r: 5, fill: TREND_LINE_RED, stroke: TREND_LINE_RED }}
              />
            </LineChart>
          </ResponsiveContainer>
        </TrendChartCard>
      </section>

      <Card className="rounded-none border-border bg-card">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-xl font-black">月度比較表</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {(annualSummaryQuery.data?.months ?? []).map(month => (
              <div key={month.monthKey} className="grid gap-3 border border-border p-4 md:grid-cols-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">月份</p>
                  <p className="mt-2 text-lg font-black">{month.monthKey}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">營業毛利</p>
                  <p className="mt-2 text-lg font-black">{formatCurrency(month.netProfit)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">每噸毛利</p>
                  <p className="mt-2 text-lg font-black">{formatPerTonTick(month.grossProfitPerTon)} 元/噸</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">較上月增減金額</p>
                  <p className="mt-2 text-lg font-black">{formatCurrency(month.netProfitChangeAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">較上月增減百分比</p>
                  <p className="mt-2 text-lg font-black">{formatRate(month.netProfitChangeRate)}</p>
                </div>
              </div>
            ))}
            {!annualSummaryQuery.data?.months.length ? (
              <div className="border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">
                目前沒有年度資料。請先建立至少一個月報。
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-none border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-xl font-black">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[360px] w-full">{children}</div>
      </CardContent>
    </Card>
  );
}
