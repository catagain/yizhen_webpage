export type WeightUnit = "ton" | "kg";

export type WorkerFormRow = {
  workerId: number | null;
  workerNameSnapshot: string;
  processingWeightTons: number;
  feeAmount: number;
  sortOrder: number;
};

export type MonthlyReportFormValues = {
  monthKey: string;
  purchaseQuantity: number;
  purchaseUnit: WeightUnit;
  purchaseAmount: number;
  shipmentQuantity: number;
  shipmentUnit: WeightUnit;
  shipmentAmount: number;
  flatbedFreight: number;
  craneFreight: number;
  note: string;
  processingEntries: WorkerFormRow[];
};

export function roundToThree(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function convertToTons(quantity: number, unit: WeightUnit): number {
  return roundToThree(unit === "kg" ? quantity / 1000 : quantity);
}

export function computeMonthlyMetrics(values: MonthlyReportFormValues) {
  const purchaseWeightTons = convertToTons(values.purchaseQuantity, values.purchaseUnit);
  const shipmentWeightTons = convertToTons(values.shipmentQuantity, values.shipmentUnit);
  const processingEntries = values.processingEntries.map(entry => ({
    ...entry,
    processingWeightTons: roundToThree(entry.processingWeightTons),
    feeAmount: roundToThree(entry.feeAmount),
    unitPricePerTon:
      entry.processingWeightTons > 0 ? roundToThree(entry.feeAmount / entry.processingWeightTons) : 0,
  }));
  const processingSubtotal = roundToThree(
    processingEntries.reduce((sum, entry) => sum + entry.feeAmount, 0)
  );
  const totalProcessingFee = roundToThree(processingSubtotal);
  const totalFreight = roundToThree(values.flatbedFreight + values.craneFreight);
  const salesCost = roundToThree(totalFreight + totalProcessingFee);
  const purchaseCostPerTon =
    purchaseWeightTons > 0 ? roundToThree(values.purchaseAmount / purchaseWeightTons) : 0;
  const shipmentUnitPrice =
    shipmentWeightTons > 0
      ? roundToThree((values.shipmentAmount - values.purchaseAmount - salesCost) / shipmentWeightTons)
      : 0;
  const grossProfitPerTon = roundToThree(shipmentUnitPrice - purchaseCostPerTon);
  const netProfit = roundToThree(grossProfitPerTon * shipmentWeightTons);

  return {
    purchaseWeightTons,
    shipmentWeightTons,
    purchaseCostPerTon,
    processingSubtotal,
    totalProcessingFee,
    totalFreight,
    salesCost,
    shipmentUnitPrice,
    grossProfitPerTon,
    netProfit,
    processingEntries,
  };
}

export function createEmptyProcessingEntries(): WorkerFormRow[] {
  return Array.from({ length: 4 }, (_, index) => ({
    workerId: null,
    workerNameSnapshot: "",
    processingWeightTons: 0,
    feeAmount: 0,
    sortOrder: index,
  }));
}

export function createEmptyMonthlyReport(monthKey: string): MonthlyReportFormValues {
  return {
    monthKey,
    purchaseQuantity: 0,
    purchaseUnit: "ton",
    purchaseAmount: 0,
    shipmentQuantity: 0,
    shipmentUnit: "ton",
    shipmentAmount: 0,
    flatbedFreight: 0,
    craneFreight: 0,
    note: "",
    processingEntries: createEmptyProcessingEntries(),
  };
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year} 年 ${month} 月`;
}
