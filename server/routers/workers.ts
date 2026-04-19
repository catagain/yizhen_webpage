import { z } from "zod";
import {
  deactivateWorkerCatalogItem,
  listWorkerCatalog,
  saveWorkerCatalogItem,
  seedDefaultWorkersIfEmpty,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const workersRouter = router({
  list: protectedProcedure.query(async () => {
    await seedDefaultWorkersIfEmpty();
    return listWorkerCatalog();
  }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().trim().min(1).max(120),
        sortOrder: z.number().int().min(0).max(999).default(0),
      })
    )
    .mutation(async ({ input }) => {
      await seedDefaultWorkersIfEmpty();
      return saveWorkerCatalogItem(input);
    }),

  archive: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      await deactivateWorkerCatalogItem(input.id);
      return { success: true } as const;
    }),
});
