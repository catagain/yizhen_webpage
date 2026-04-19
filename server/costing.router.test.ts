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
  it("deletes a monthly report through the protected mutation", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.costing.deleteReport({ id: 99 });

    expect(dbMocks.deleteMonthlyReportMock).toHaveBeenCalledWith(99);
    expect(result).toEqual({ success: true });
  });
});
