import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  deleteMonthlyReportMock: vi.fn(async () => ({ success: true as const })),
  seedDefaultWorkersIfEmptyMock: vi.fn(async () => undefined),
  listMonthlyReportsMock: vi.fn(async () => []),
  getAnnualSummaryMock: vi.fn(async () => ({ year: 2026, items: [], totalNetProfit: 0 })),
  getMonthlyReportByMonthKeyMock: vi.fn(async () => null),
  getMonthlyReportByIdMock: vi.fn(async () => null),
  saveMonthlyReportMock: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./db", () => ({
  deleteMonthlyReport: dbMocks.deleteMonthlyReportMock,
  seedDefaultWorkersIfEmpty: dbMocks.seedDefaultWorkersIfEmptyMock,
  listMonthlyReports: dbMocks.listMonthlyReportsMock,
  getAnnualSummary: dbMocks.getAnnualSummaryMock,
  getMonthlyReportByMonthKey: dbMocks.getMonthlyReportByMonthKeyMock,
  getMonthlyReportById: dbMocks.getMonthlyReportByIdMock,
  saveMonthlyReport: dbMocks.saveMonthlyReportMock,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "local-password-user",
      name: "YIZHEN",
      email: "yizhen123",
      loginMethod: "password",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("costing router", () => {
  it("accepts decimal values when saving a monthly report", async () => {
    const caller = appRouter.createCaller(createContext());

    await caller.costing.saveReport({
      monthKey: "2026-04",
      purchaseQuantity: 8.125,
      purchaseUnit: "ton",
      purchaseAmount: 160000.75,
      shipmentQuantity: 7.5,
      shipmentUnit: "ton",
      shipmentAmount: 280000.5,
      flatbedWeightTons: 7.5,
      flatbedFreight: 12000.25,
      craneWeightTons: 2.75,
      craneFeePerTon: 2909.273,
      selfHaulWeightTons: 0.5,
      note: "decimal save",
      processingEntries: [
        {
          workerId: 1,
          workerNameSnapshot: "吳秋貴",
          processingWeightTons: 2.25,
          feeAmount: 20500.75,
          sortOrder: 0,
        },
        {
          workerId: 2,
          workerNameSnapshot: "黃鬆翰",
          processingWeightTons: 1.5,
          feeAmount: 13200.5,
          sortOrder: 1,
        },
      ],
    });

    expect(dbMocks.saveMonthlyReportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        purchaseQuantity: 8.125,
        purchaseAmount: 160000.75,
        shipmentQuantity: 7.5,
        shipmentAmount: 280000.5,
        flatbedWeightTons: 7.5,
        flatbedFreight: 12000.25,
        craneWeightTons: 2.75,
        craneFeePerTon: 2909.273,
        selfHaulWeightTons: 0.5,
      })
    );
  });

  it("deletes a monthly report through the protected mutation", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.costing.deleteReport({ id: 99 });

    expect(dbMocks.deleteMonthlyReportMock).toHaveBeenCalledWith(99);
    expect(result).toEqual({ success: true });
  });
});
