import { describe, expect, it } from "vitest";

import { NET_PROFIT_Y_AXIS_TICKS, formatChartYAxisTick } from "./AnnualOverviewPage";

describe("AnnualOverviewPage chart axis", () => {
  it("uses the fixed net profit Y-axis ticks requested by the user", () => {
    expect(NET_PROFIT_Y_AXIS_TICKS).toEqual([1000000, 3000000, 5000000, 7000000, 9000000]);
  });

  it("formats Y-axis tick labels in ten-thousand units", () => {
    expect(formatChartYAxisTick(1000000)).toBe("100萬");
    expect(formatChartYAxisTick(3000000)).toBe("300萬");
    expect(formatChartYAxisTick(9000000)).toBe("900萬");
  });
});
