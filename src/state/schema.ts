import { z } from "zod";

export const TuiStateEntrySchema = z.object({
  lastRoute: z.enum(["home", "github", "settings", "teamwork"]).default("home"),
  // Default to the project tab because Phase 4 focuses on project-specific Teamwork setup first.
  lastTeamworkTab: z.enum(["my-work", "project"]).default("project"),
  lastUpdated: z.string(),
});

export type TuiStateEntry = z.infer<typeof TuiStateEntrySchema>;

export const TuiStateFileSchema = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), TuiStateEntrySchema),
});

export type TuiStateFile = z.infer<typeof TuiStateFileSchema>;
