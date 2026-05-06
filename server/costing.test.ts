import { describe, expect, it } from "vitest";
import { computeMonthlyReportMetrics, convertToTons, roundToThree } from "./costing";

describe("costing helpers", () => {
  it("converts kilograms to tons and keeps three decimal places", () => {
    expect(convertToTons(1250, "kg")).toBe(1.25);
    expect(convertToTons(1.23456, "ton")).toBe(1.235);
  });

  it("rounds values to three decimal places", () => {
    expect(roundToThree(12.34567)).toBe(12.346);
    expect(roundToThree(12.34514)).toBe(12.345);
  });

  it("computes monthly metrics according to the agreed formula chain", () => {
    const result = computeMonthlyReportMetrics({
      purchaseQuantity: 10,
      purchaseUnit: "ton",
      purchaseAmount: 200000,
      shipmentQuantity: 12,
      shipmentUnit: "ton",
      shipmentAmount: 360000,
      flatbedFreight: 10000,
      craneFreight: 5000,
      selfHaulFreight: 0,
      processingEntries: [
        {
          workerId: 1,
          workerNameSnapshot: "吳秋貴",
          processingWeightTons: 3,
          feeAmount: 30000,
          sortOrder: 0,
        },
        {
          workerId: 2,
          workerNameSnapshot: "黃鬆翰",
          processingWeightTons: 2,
          feeAmount: 18000,
          sortOrder: 1,
        },
      ],
    });

    expect(result.purchaseWeightTons).toBe(10);
    expect(result.shipmentWeightTons).toBe(12);
    expect(result.purchaseCostPerTon).toBe(20000);
    expect(result.totalFreight).toBe(15000);
    expect(result.processingSubtotal).toBe(48000);
    expect(result.totalProcessingFee).toBe(48000);
    expect(result.salesCost).toBe(63000);
    expect(result.shipmentUnitPrice).toBe(24750);
    expect(result.grossProfitPerTon).toBe(4750);
    expect(result.netProfit).toBe(57000);
    expect(result.processingEntries[0]?.unitPricePerTon).toBe(10000);
    expect(result.processingEntries[1]?.unitPricePerTon).toBe(9000);
  });
});
