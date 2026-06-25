import type { CommandModule } from "yargs";

import { cacheClean } from "./cache.ts";

const cacheCleanCommand: CommandModule = {
  command: "clean",
  describe: "Delete all cached data",
  handler: () => {
    void cacheClean();
  },
};

export const cacheCommand: CommandModule = {
  command: "cache",
  describe: "Manage local cache",
  builder: (yargs) =>
    yargs.command(cacheCleanCommand).demandCommand(1, "Specify a cache subcommand: clean"),
  handler: () => {},
};
