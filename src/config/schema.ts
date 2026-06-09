import { z } from "zod";

export const ConfigSchema = z.object({
  version: z.literal(1),
  encrypted: z.object({
    salt: z.string(),
    iv: z.string(),
    authTag: z.string(),
    data: z.string(),
  }),
  plain: z.object({
    aws: z.object({ profile: z.string().default("default") }),
    github: z.object({ org: z.string() }),
    teamwork: z.object({ domain: z.string() }),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
