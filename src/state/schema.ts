import { z } from "zod";

export const TuiStateEntrySchema = z.object({
  lastRoute: z.enum(["home", "github", "settings"]).default("home"),
  lastUpdated: z.string(),
});

export type TuiStateEntry = z.infer<typeof TuiStateEntrySchema>;

export const TuiStateFileSchema = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), TuiStateEntrySchema),
});

export type TuiStateFile = z.infer<typeof TuiStateFileSchema>;
