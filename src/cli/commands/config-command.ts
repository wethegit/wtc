import type { Argv, CommandModule } from "yargs";

import {
  CONFIG_AUTH_PROVIDERS,
  configAuthDelete,
  configAuthSet,
  configAuthStatus,
  configInit,
} from "./config.ts";

const configInitCommand: CommandModule = {
  command: "init",
  describe: "Create a project config in the current directory",
  handler: () => configInit(),
};

const configAuthSetCommand: CommandModule<{}, { provider: string; token: string }> = {
  command: "set <provider>",
  describe: "Store a provider API token",
  builder: (yargs) =>
    yargs
      .positional("provider", {
        type: "string",
        choices: [...CONFIG_AUTH_PROVIDERS],
        describe: "Auth provider",
      })
      .option("token", {
        type: "string",
        describe: "API token to store",
        demandOption: true,
      }) as unknown as Argv<{ provider: string; token: string }>,
  handler: (argv) => configAuthSet({ provider: argv.provider ?? "", token: argv.token }),
};

const configAuthStatusCommand: CommandModule<{}, { provider: string }> = {
  command: "status <provider>",
  describe: "Show provider auth status",
  builder: (yargs) =>
    yargs.positional("provider", {
      type: "string",
      choices: [...CONFIG_AUTH_PROVIDERS],
      describe: "Auth provider",
    }) as unknown as Argv<{ provider: string }>,
  handler: (argv) => configAuthStatus({ provider: argv.provider ?? "" }),
};

const configAuthDeleteCommand: CommandModule<{}, { provider: string }> = {
  command: "delete <provider>",
  describe: "Delete provider auth",
  builder: (yargs) =>
    yargs.positional("provider", {
      type: "string",
      choices: [...CONFIG_AUTH_PROVIDERS],
      describe: "Auth provider",
    }) as unknown as Argv<{ provider: string }>,
  handler: (argv) => configAuthDelete({ provider: argv.provider ?? "" }),
};

const configAuthCommand: CommandModule = {
  command: "auth",
  describe: "Manage provider credentials",
  builder: (yargs) =>
    yargs
      .command(configAuthSetCommand)
      .command(configAuthStatusCommand)
      .command(configAuthDeleteCommand)
      .demandCommand(1, "Specify an auth subcommand: set, status, delete"),
  handler: () => {},
};

export const configCommand: CommandModule = {
  command: "config",
  describe: "Manage WTC config files",
  builder: (yargs) =>
    yargs
      .command(configInitCommand)
      .command(configAuthCommand)
      .demandCommand(1, "Specify a config subcommand: init, auth"),
  handler: () => {},
};
