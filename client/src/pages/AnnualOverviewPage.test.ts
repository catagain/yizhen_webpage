import { describe, expect, it } from "vitest";

import {
  NET_PROFIT_Y_AXIS_TICKS,
  buildAnnualChartData,
  formatChartYAxisTick,
  formatPerTonTick,
} from "./AnnualOverviewPage";

describe("AnnualOverviewPage chart helpers", () => {
  it("uses the fixed net profit Y-axis ticks requested by the user", () => {
    expect(NET_PROFIT_Y_AXIS_TICKS).toEqual([1000000, 3000000, 5000000, 7000000, 9000000]);
  });

  it("formats net profit Y-axis tick labels in ten-thousand units", () => {
    expect(formatChartYAxisTick(1000000)).toBe("100萬");
    expect(formatChartYAxisTick(3000000)).toBe("300萬");
    expect(formatChartYAxisTick(9000000)).toBe("900萬");
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
});
