import type { Argv, CommandModule } from "yargs";

import { upgrade } from "./upgrade.ts";

export const upgradeCommand: CommandModule<{}, { check: boolean }> = {
  command: "upgrade",
  describe: "Check for updates",
  builder: (yargs) =>
    yargs.option("check", {
      alias: "c",
      type: "boolean",
      description: "Only check for updates",
    }) as unknown as Argv<{ check: boolean }>,
  handler: (argv) => {
    void upgrade({ check: argv.check ?? false });
  },
};
