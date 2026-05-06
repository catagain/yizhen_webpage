import type { WeightUnit } from "../drizzle/schema";

export const DECIMAL_SCALE = 3;

export type ProcessingEntryInput = {
  workerId: number | null;
  workerNameSnapshot: string;
  processingWeightTons: number;
  feeAmount: number;
  sortOrder: number;
};

export type MonthlyReportCalculationInput = {
  purchaseQuantity: number;
  purchaseUnit: WeightUnit;
  purchaseAmount: number;
  shipmentQuantity: number;
  shipmentUnit: WeightUnit;
  shipmentAmount: number;
  flatbedWeightTons?: number;
  flatbedFreight: number;
  craneWeightTons: number;
  craneFeePerTon: number;
  selfHaulWeightTons?: number;
  processingEntries: ProcessingEntryInput[];
};

export type ProcessingEntryMetrics = ProcessingEntryInput & {
  unitPricePerTon: number;
};

export type MonthlyReportMetrics = {
  purchaseWeightTons: number;
  shipmentWeightTons: number;
  purchaseCostPerTon: number;
  craneFreight: number;
  totalFreight: number;
  processingSubtotal: number;
  totalProcessingFee: number;
  salesCost: number;
  shipmentUnitPrice: number;
  grossProfitPerTon: number;
  netProfit: number;
  processingEntries: ProcessingEntryMetrics[];
};

export function roundToThree(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function normalizeNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function convertToTons(quantity: number, unit: WeightUnit): number {
  const normalizedQuantity = normalizeNumber(quantity);

  if (unit === "kg") {
    return roundToThree(normalizedQuantity / 1000);
  }

  return roundToThree(normalizedQuantity);
}

export function computeMonthlyReportMetrics(
  input: MonthlyReportCalculationInput
): MonthlyReportMetrics {
  const purchaseWeightTons = convertToTons(input.purchaseQuantity, input.purchaseUnit);
  const shipmentWeightTons = convertToTons(input.shipmentQuantity, input.shipmentUnit);
  const purchaseAmount = normalizeNumber(input.purchaseAmount);
  const shipmentAmount = normalizeNumber(input.shipmentAmount);
  const flatbedFreight = normalizeNumber(input.flatbedFreight);
  const craneWeightTons = normalizeNumber(input.craneWeightTons);
  const craneFeePerTon = normalizeNumber(input.craneFeePerTon);
  const craneFreight = roundToThree(craneWeightTons * craneFeePerTon);

  const processingEntries = input.processingEntries.map(entry => {
    const processingWeightTons = roundToThree(normalizeNumber(entry.processingWeightTons));
    const feeAmount = roundToThree(normalizeNumber(entry.feeAmount));
    const unitPricePerTon =
      processingWeightTons > 0 ? roundToThree(feeAmount / processingWeightTons) : 0;

    return {
      workerId: entry.workerId,
      workerNameSnapshot: entry.workerNameSnapshot.trim(),
      processingWeightTons,
      feeAmount,
      sortOrder: entry.sortOrder,
      unitPricePerTon,
    } satisfies ProcessingEntryMetrics;
  });

  const processingSubtotal = roundToThree(
    processingEntries.reduce((sum, entry) => sum + entry.feeAmount, 0)
  );
  const totalProcessingFee = roundToThree(processingSubtotal);
  const totalFreight = roundToThree(flatbedFreight + craneFreight);
  const salesCost = roundToThree(totalFreight + totalProcessingFee);
  const purchaseCostPerTon =
    purchaseWeightTons > 0 ? roundToThree(purchaseAmount / purchaseWeightTons) : 0;
  const shipmentUnitPrice =
    shipmentWeightTons > 0
      ? roundToThree((shipmentAmount - totalProcessingFee - totalFreight) / shipmentWeightTons)
      : 0;
  const grossProfitPerTon = roundToThree(shipmentUnitPrice - purchaseCostPerTon);
  const netProfit = roundToThree(grossProfitPerTon * shipmentWeightTons);

  return {
    purchaseWeightTons,
    shipmentWeightTons,
    purchaseCostPerTon,
    craneFreight,
    totalFreight,
    processingSubtotal,
    totalProcessingFee,
    salesCost,
    shipmentUnitPrice,
    grossProfitPerTon,
    netProfit,
    processingEntries,
  };
}
