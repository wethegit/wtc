import { z } from "zod";

import { ROUTE_PAGES } from "../tui/app";

export const TuiStateEntrySchema = z.object({
  lastRoute: z.object({
    page: z.enum(ROUTE_PAGES).default("home"),
    tab: z.string().default("index"),
  }),
  lastUpdated: z.string(),
});

export type TuiStateEntry = z.infer<typeof TuiStateEntrySchema>;

export const TuiStateFileSchema = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), TuiStateEntrySchema),
});

export type TuiStateFile = z.infer<typeof TuiStateFileSchema>;
