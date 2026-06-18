import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { cacheClean } from "./commands/cache.ts";
import {
  CONFIG_AUTH_PROVIDERS,
  configAuthDelete,
  configAuthSet,
  configAuthStatus,
  configInit,
} from "./commands/config.ts";
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
      "config",
      "Manage WTC config files",
      (yargs) =>
        yargs
          .command(
            "init",
            "Create a project config in the current directory",
            () => {},
            async () => {
              await configInit();
            },
          )
          .command(
            "auth",
            "Manage provider credentials",
            (yargs) =>
              yargs
                .command(
                  "set <provider>",
                  "Store a provider API token",
                  (yargs) =>
                    yargs
                      .positional("provider", {
                        type: "string",
                        choices: CONFIG_AUTH_PROVIDERS,
                        describe: "Auth provider",
                      })
                      .option("token", {
                        type: "string",
                        describe: "API token to store",
                        demandOption: true,
                      }),
                  async (argv) => {
                    await configAuthSet({ provider: argv.provider ?? "", token: argv.token });
                  },
                )
                .command(
                  "status <provider>",
                  "Show provider auth status",
                  (yargs) =>
                    yargs.positional("provider", {
                      type: "string",
                      choices: CONFIG_AUTH_PROVIDERS,
                      describe: "Auth provider",
                    }),
                  async (argv) => {
                    await configAuthStatus({ provider: argv.provider ?? "" });
                  },
                )
                .command(
                  "delete <provider>",
                  "Delete provider auth",
                  (yargs) =>
                    yargs.positional("provider", {
                      type: "string",
                      choices: CONFIG_AUTH_PROVIDERS,
                      describe: "Auth provider",
                    }),
                  async (argv) => {
                    await configAuthDelete({ provider: argv.provider ?? "" });
                  },
                )
                .demandCommand(1, "Specify an auth subcommand: set, status, delete"),
            () => {},
          )
          .demandCommand(1, "Specify a config subcommand: init, auth"),
      () => {},
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
