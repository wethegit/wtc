import type { CommandModule } from "yargs";

import { logsClear, logsOpen, logsPath } from "./logs.ts";

const logsOpenCommand: CommandModule = {
  command: "open",
  describe: "Open the log file in the system browser",
  handler: () => logsOpen(),
};

const logsClearCommand: CommandModule = {
  command: "clear",
  describe: "Clear all log entries",
  handler: () => logsClear(),
};

const logsPathCommand: CommandModule = {
  command: "path",
  describe: "Print the log file path",
  handler: () => logsPath(),
};

export const logsCommand: CommandModule = {
  command: "logs",
  describe: "Manage application logs",
  builder: (yargs) =>
    yargs
      .command(logsOpenCommand)
      .command(logsClearCommand)
      .command(logsPathCommand)
      .demandCommand(1, "Specify a logs subcommand: open, clear, or path"),
  handler: () => {},
};
