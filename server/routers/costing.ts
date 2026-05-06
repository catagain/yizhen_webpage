import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  deleteMonthlyReport,
  getAnnualSummary,
  getMonthlyReportById,
  getMonthlyReportByMonthKey,
  listMonthlyReports,
  saveMonthlyReport,
  seedDefaultWorkersIfEmpty,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const processingEntrySchema = z.object({
  workerId: z.number().int().positive().nullable(),
  workerNameSnapshot: z.string().trim().max(120),
  processingWeightTons: z.number().min(0),
  feeAmount: z.number().min(0),
  sortOrder: z.number().int().min(0).max(3),
});

const saveMonthlyReportSchema = z.object({
  id: z.number().int().positive().optional(),
  monthKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  purchaseQuantity: z.number().min(0),
  purchaseUnit: z.enum(["ton", "kg"]),
  purchaseAmount: z.number().min(0),
  shipmentQuantity: z.number().min(0),
  shipmentUnit: z.enum(["ton", "kg"]),
  shipmentAmount: z.number().min(0),
  flatbedWeightTons: z.number().min(0),
  flatbedFreight: z.number().min(0),
  craneWeightTons: z.number().min(0),
  craneFeePerTon: z.number().min(0),
  selfHaulWeightTons: z.number().min(0),
  note: z.string().max(5000).optional().default(""),
  processingEntries: z.array(processingEntrySchema).max(4),
});

export const costingRouter = router({
  listReports: protectedProcedure
    .input(
      z
        .object({
          year: z.number().int().min(2000).max(2100).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      await seedDefaultWorkersIfEmpty();
      return listMonthlyReports(input?.year);
    }),

  getReport: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        monthKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
      })
    )
    .query(async ({ input }) => {
      await seedDefaultWorkersIfEmpty();

      if (!input.id && !input.monthKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing report id or month key.",
        });
      }

      return input.id
        ? getMonthlyReportById(input.id)
        : getMonthlyReportByMonthKey(input.monthKey!);
    }),

  saveReport: protectedProcedure
    .input(saveMonthlyReportSchema)
    .mutation(async ({ ctx, input }) => {
      await seedDefaultWorkersIfEmpty();
      return saveMonthlyReport({
        ...input,
        actorUserId: ctx.user.id,
      });
    }),

  deleteReport: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      return deleteMonthlyReport(input.id);
    }),

  annualSummary: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
      })
    )
    .query(async ({ input }) => {
      await seedDefaultWorkersIfEmpty();
      return getAnnualSummary(input.year);
    }),
});
