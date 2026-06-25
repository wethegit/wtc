import type { Argv, CommandModule } from "yargs";

import {
  teamworkTaskListPinned,
  teamworkTaskListPin,
  teamworkTaskListUnpin,
  teamworkTaskMine,
  teamworkTaskOpen,
} from "./teamwork.ts";
import {
  teamworkTimerDiscard,
  teamworkTimerList,
  teamworkTimerStart,
  teamworkTimerStop,
  teamworkTimerSubmit,
  teamworkTimesheetOpen,
} from "./timers.ts";

const taskListPinnedCommand: CommandModule<{}, { json: boolean }> = {
  command: "pinned",
  describe: "List pinned Teamwork task lists and tasks",
  builder: (yargs) =>
    yargs.option("json", {
      type: "boolean",
      describe: "Print JSON output",
      default: false,
    }) as unknown as Argv<{ json: boolean }>,
  handler: (argv) => teamworkTaskListPinned({ json: argv.json ?? false }),
};

const taskListPinCommand: CommandModule<{}, { taskListId: number; name: string }> = {
  command: "pin <taskListId>",
  describe: "Pin a Teamwork task list in project config",
  builder: (yargs) =>
    yargs
      .positional("taskListId", {
        type: "number",
        describe: "Teamwork task list ID",
      })
      .option("name", {
        type: "string",
        describe: "Display name for this task list",
        demandOption: true,
      }) as unknown as Argv<{ taskListId: number; name: string }>,
  handler: (argv) =>
    teamworkTaskListPin({
      taskListId: argv.taskListId ?? 0,
      name: argv.name ?? "",
    }),
};

const taskListUnpinCommand: CommandModule<{}, { taskListId: number }> = {
  command: "unpin <taskListId>",
  describe: "Unpin a Teamwork task list from project config",
  builder: (yargs) =>
    yargs.positional("taskListId", {
      type: "number",
      describe: "Teamwork task list ID",
    }) as unknown as Argv<{ taskListId: number }>,
  handler: (argv) => teamworkTaskListUnpin({ taskListId: argv.taskListId ?? 0 }),
};

const taskListCommand: CommandModule = {
  command: "task-list",
  describe: "Manage Teamwork task lists",
  builder: (yargs) =>
    yargs
      .command(taskListPinnedCommand)
      .command(taskListPinCommand)
      .command(taskListUnpinCommand)
      .demandCommand(1, "Specify a task-list subcommand: pinned, pin, unpin"),
  handler: () => {},
};

const taskOpenCommand: CommandModule<{}, { task: string }> = {
  command: "open <task>",
  describe: "Open a Teamwork task in the browser",
  builder: (yargs) =>
    yargs.positional("task", {
      type: "string",
      describe: "Teamwork task ID or URL",
    }) as unknown as Argv<{ task: string }>,
  handler: (argv) => teamworkTaskOpen({ task: argv.task ?? "" }),
};

const taskMineCommand: CommandModule<{}, { json: boolean }> = {
  command: "mine",
  describe: "List my Teamwork tasks due within the next 7 days",
  builder: (yargs) =>
    yargs.option("json", {
      type: "boolean",
      describe: "Print JSON output",
      default: false,
    }) as unknown as Argv<{ json: boolean }>,
  handler: (argv) => teamworkTaskMine({ json: argv.json ?? false }),
};

const taskCommand: CommandModule = {
  command: "task",
  describe: "Manage Teamwork tasks",
  builder: (yargs) =>
    yargs
      .command(taskOpenCommand)
      .command(taskMineCommand)
      .demandCommand(1, "Specify a task subcommand: open, mine"),
  handler: () => {},
};

const timerListCommand: CommandModule<{}, { json: boolean }> = {
  command: "list",
  describe: "List local timers",
  builder: (yargs) =>
    yargs.option("json", {
      type: "boolean",
      describe: "Print JSON output",
      default: false,
    }) as unknown as Argv<{ json: boolean }>,
  handler: (argv) => teamworkTimerList({ json: argv.json ?? false }),
};

const timerStartCommand: CommandModule<{}, { task: string }> = {
  command: "start <task>",
  describe: "Start a timer for a Teamwork task",
  builder: (yargs) =>
    yargs.positional("task", {
      type: "string",
      describe: "Teamwork task ID or URL",
    }) as unknown as Argv<{ task: string }>,
  handler: (argv) => teamworkTimerStart({ task: argv.task ?? "" }),
};

const timerStopCommand: CommandModule<{}, { task: string }> = {
  command: "stop <task>",
  describe: "Stop a running timer for a Teamwork task",
  builder: (yargs) =>
    yargs.positional("task", {
      type: "string",
      describe: "Teamwork task ID or URL",
    }) as unknown as Argv<{ task: string }>,
  handler: (argv) => teamworkTimerStop({ task: argv.task ?? "" }),
};

const timerSubmitCommand: CommandModule<{}, { task: string }> = {
  command: "submit <task>",
  describe: "Submit a local timer as a Teamwork time entry",
  builder: (yargs) =>
    yargs.positional("task", {
      type: "string",
      describe: "Teamwork task ID or URL",
    }) as unknown as Argv<{ task: string }>,
  handler: (argv) => teamworkTimerSubmit({ task: argv.task ?? "" }),
};

const timerDiscardCommand: CommandModule<{}, { task: string }> = {
  command: "discard <task>",
  describe: "Discard a local timer without submitting",
  builder: (yargs) =>
    yargs.positional("task", {
      type: "string",
      describe: "Teamwork task ID or URL",
    }) as unknown as Argv<{ task: string }>,
  handler: (argv) => teamworkTimerDiscard({ task: argv.task ?? "" }),
};

const timerCommand: CommandModule = {
  command: "timer",
  describe: "Manage local timers",
  builder: (yargs) =>
    yargs
      .command(timerListCommand)
      .command(timerStartCommand)
      .command(timerStopCommand)
      .command(timerSubmitCommand)
      .command(timerDiscardCommand)
      .demandCommand(1, "Specify a timer subcommand: list, start, stop, submit, discard"),
  handler: () => {},
};

const timesheetCommand: CommandModule = {
  command: "timesheet",
  describe: "Open the Teamwork timesheet in the browser",
  handler: () => teamworkTimesheetOpen(),
};

export const teamworkCommand: CommandModule = {
  command: "teamwork",
  describe: "Manage Teamwork workflows",
  builder: (yargs) =>
    yargs
      .command(taskListCommand)
      .command(taskCommand)
      .command(timerCommand)
      .command(timesheetCommand)
      .demandCommand(1, "Specify a teamwork subcommand: task-list, task, timer, timesheet"),
  handler: () => {},
};
