import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { APP_VERSION } from "../api/config/consts.ts";

import { cacheCommand } from "./commands/cache-command.ts";
import { configCommand } from "./commands/config-command.ts";
import { repoCommand } from "./commands/repo-command.ts";
import { settingsCommand } from "./commands/settings-command.ts";
import { teamworkCommand } from "./commands/teamwork-command.ts";
import { upgradeCommand } from "./commands/upgrade-command.ts";

export async function runCli(): Promise<void> {
  const parser = yargs(hideBin(Bun.argv))
    .scriptName("wtc")
    .version(APP_VERSION)
    .help()
    .command(settingsCommand)
    .command(configCommand)
    .command(repoCommand)
    .command(teamworkCommand)
    .command(upgradeCommand)
    .command(cacheCommand);

  await parser.parse();
}
