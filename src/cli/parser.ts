import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { cacheClean } from "./commands/cache.ts";
import { settings } from "./commands/settings.ts";
import { upgrade } from "./commands/upgrade.ts";
import { APP_VERSION } from "../config/consts.ts";

/**
 * Runs the yargs-powered CLI parser for non-interactive commands.
 *
 * The top-level entrypoint only imports this module when arguments are present,
 * which keeps simple CLI commands independent from TUI startup cost and OpenTUI
 * renderer initialization.
 */
export async function runCli(): Promise<void> {
  const currentVersion = APP_VERSION;

  const parser = yargs(hideBin(Bun.argv))
    .scriptName("wtc")
    .version(currentVersion)
    .help()
    .command(
      "settings",
      "Print resolved config and config file paths",
      (yargs) => yargs,
      async () => {
        await settings();
      },
    )
    .command(
      "upgrade",
      "Check for updates",
      (yargs) =>
        yargs.option("check", {
          alias: "c",
          type: "boolean",
          description: "Only check for updates",
        }),
      async (argv) => {
        await upgrade({ check: argv.check ?? false });
      },
    )
    .command(
      "cache",
      "Manage local cache",
      (yargs) =>
        yargs
          .command(
            "clean",
            "Delete all cached data",
            () => {},
            async () => {
              await cacheClean();
            },
          )
          .demandCommand(1, "Specify a cache subcommand: clean"),
      () => {},
    );

  await parser.parse();
}
