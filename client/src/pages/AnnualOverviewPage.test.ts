import { describe, expect, it } from "vitest";

import {
  NET_PROFIT_Y_AXIS_TICKS,
  TREND_LINE_RED,
  buildAnnualChartData,
  formatChartYAxisTick,
  formatPerTonTick,
} from "./AnnualOverviewPage";

describe("AnnualOverviewPage chart helpers", () => {
  it("uses the fixed net profit Y-axis ticks requested by the user", () => {
    expect(NET_PROFIT_Y_AXIS_TICKS).toEqual([1000000, 5000000, 10000000, 15000000, 20000000]);
  });

  it("formats net profit Y-axis tick labels in ten-thousand units", () => {
    expect(formatChartYAxisTick(1000000)).toBe("100萬");
    expect(formatChartYAxisTick(5000000)).toBe("500萬");
    expect(formatChartYAxisTick(20000000)).toBe("2000萬");
  });

  it("formats gross profit labels with the existing per-ton precision", () => {
    expect(formatPerTonTick(4800)).toBe("4,800");
    expect(formatPerTonTick(4800.125)).toBe("4,800.125");
  });

  it("builds chart data for both net profit and gross profit trend lines", () => {
    expect(
      buildAnnualChartData(
        [
          { monthKey: "2026-01", netProfit: 1200000, grossProfitPerTon: 4500.125 },
          { monthKey: "2026-02", netProfit: 1500000, grossProfitPerTon: 4700.5 },
        ],
        2026
      )
    ).toEqual([
      { monthKey: "01", netProfit: 1200000, grossProfitPerTon: 4500.125 },
      { monthKey: "02", netProfit: 1500000, grossProfitPerTon: 4700.5 },
    ]);
  });

  it("uses the requested red color for both trend lines", () => {
    expect(TREND_LINE_RED).toBe("#b91c1c");
  });
});
