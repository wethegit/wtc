import { z } from "zod";

/**
 * Persisted config file schema for `~/.config/wtc/config.json`.
 *
 * `plain` stores non-secret preferences that can be edited directly. `encrypted`
 * stores the encrypted secrets payload produced by `saveSecrets()`.
 */
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

/** Parsed and validated WTC config shape. */
export type Config = z.infer<typeof ConfigSchema>;
