import { z } from "zod";

/** All valid top-level route pages in the TUI. */
export const ROUTE_PAGES = ["home", "github", "settings", "system", "teamwork"] as const;

/** TUI top-level page identifier. */
export type RoutePage = (typeof ROUTE_PAGES)[number];

/** Per-directory persisted TUI state: last-visited route and tab. */
export const TuiStateEntrySchema = z.object({
  lastRoute: z.object({
    page: z.enum(ROUTE_PAGES).default("home"),
    tab: z.string().default("index"),
  }),
  lastUpdated: z.string(),
});

export type TuiStateEntry = z.infer<typeof TuiStateEntrySchema>;

/** A route with page and tab segments. */
export type Route = TuiStateEntry["lastRoute"];

/** Top-level TUI state file schema (one file, entries keyed by directory path). */
export const TuiStateFileSchema = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), TuiStateEntrySchema),
});

export type TuiStateFile = z.infer<typeof TuiStateFileSchema>;
