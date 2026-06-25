import type { CommandModule } from "yargs";

import { settings } from "./settings.ts";

/** `wtc settings` command. */
export const settingsCommand: CommandModule = {
  command: "settings",
  describe: "Print resolved config and config file paths",
  handler: () => settings(),
};
