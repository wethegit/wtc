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
import {
  teamworkTaskOpen,
  teamworkTaskListPin,
  teamworkTaskListPinned,
  teamworkTaskListUnpin,
} from "./commands/teamwork.ts";
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
      "teamwork",
      "Manage Teamwork workflows",
      (yargs) =>
        yargs
          .command(
            "task-list",
            "Manage Teamwork task lists",
            (yargs) =>
              yargs
                .command(
                  "pinned",
                  "List pinned Teamwork task lists and tasks",
                  (yargs) =>
                    yargs.option("json", {
                      type: "boolean",
                      describe: "Print JSON output",
                      default: false,
                    }),
                  async (argv) => {
                    await teamworkTaskListPinned({ json: argv.json ?? false });
                  },
                )
                .command(
                  "pin <taskListId>",
                  "Pin a Teamwork task list in project config",
                  (yargs) =>
                    yargs
                      .positional("taskListId", {
                        type: "number",
                        describe: "Teamwork task list ID",
                      })
                      .option("name", {
                        type: "string",
                        describe: "Display name for this task list",
                        demandOption: true,
                      }),
                  async (argv) => {
                    await teamworkTaskListPin({
                      taskListId: argv.taskListId ?? 0,
                      name: argv.name ?? "",
                    });
                  },
                )
                .command(
                  "unpin <taskListId>",
                  "Unpin a Teamwork task list from project config",
                  (yargs) =>
                    yargs.positional("taskListId", {
                      type: "number",
                      describe: "Teamwork task list ID",
                    }),
                  async (argv) => {
                    await teamworkTaskListUnpin({ taskListId: argv.taskListId ?? 0 });
                  },
                )
                .demandCommand(1, "Specify a task-list subcommand: pinned, pin, unpin"),
            () => {},
          )
          .command(
            "task",
            "Manage Teamwork tasks",
            (yargs) =>
              yargs
                .command(
                  "open <task>",
                  "Open a Teamwork task in the browser",
                  (yargs) =>
                    yargs.positional("task", {
                      type: "string",
                      describe: "Teamwork task ID or URL",
                    }),
                  async (argv) => {
                    await teamworkTaskOpen({ task: argv.task ?? "" });
                  },
                )
                .demandCommand(1, "Specify a task subcommand: open"),
            () => {},
          )
          .demandCommand(1, "Specify a teamwork subcommand: task-list, task"),
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
