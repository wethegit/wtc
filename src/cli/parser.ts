import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { APP_VERSION } from "../api/config/consts.ts";
import { logError, logInfo } from "../api/logs/manager.ts";

import { cacheCommand } from "./commands/cache-command.ts";
import { configCommand } from "./commands/config-command.ts";
import { logsCommand } from "./commands/logs-command.ts";
import { repoCommand } from "./commands/repo-command.ts";
import { settingsCommand } from "./commands/settings-command.ts";
import { teamworkCommand } from "./commands/teamwork-command.ts";
import { upgradeCommand } from "./commands/upgrade-command.ts";

export async function runCli(): Promise<void> {
  const args = hideBin(Bun.argv);
  const command = args
    .filter((arg) => !arg.startsWith("-"))
    .slice(0, 2)
    .join(" ");
  logInfo("cli", "cli.start", "CLI started", { command: command || "wtc" });

  const parser = yargs(args)
    .scriptName("wtc")
    .version(APP_VERSION)
    .help()
    .command(settingsCommand)
    .command(configCommand)
    .command(logsCommand)
    .command(repoCommand)
    .command(teamworkCommand)
    .command(upgradeCommand)
    .command(cacheCommand);

  try {
    await parser.parse();
    logInfo("cli", "cli.success", "CLI completed");
  } catch (error) {
    logError("cli", "cli.error", "CLI failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
