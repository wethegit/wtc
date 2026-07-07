import type { Argv, CommandModule } from "yargs";

import { GITHUB_REPO_OWNER } from "../../api/github/consts.ts";
import { repoCreate, type RepoVisibility } from "./repo.ts";

const repoCreateCommand: CommandModule<
  {},
  {
    name: string;
    template?: string;
    visibility: RepoVisibility;
    description?: string;
    json?: boolean;
    rulesPreset?: string;
    setupTeamwork?: boolean;
    cloneDir?: string;
    teamworkProjectId?: number;
    generalTasks?: string;
    reviewTask?: string;
  }
> = {
  command: "create <name>",
  describe: "Create a GitHub repo",
  builder: (yargs) =>
    yargs
      .positional("name", {
        type: "string",
        describe: "New repository name",
      })
      .option("template", {
        type: "string",
        describe: `Template repo name under ${GITHUB_REPO_OWNER}. Omit for a blank repo.`,
      })
      .option("visibility", {
        choices: ["private", "public"] as const,
        describe: "Repository visibility",
        default: "private" as const,
      })
      .option("description", {
        type: "string",
        describe: "Optional repository description",
      })
      .option("rules-preset", {
        choices: ["standard", "none"] as const,
        describe: "Repository rules preset (standard or none)",
        default: "standard" as const,
      })
      .option("setup-teamwork", {
        type: "boolean",
        describe: "Clone with SSH and write .wtc.yaml Teamwork project config before repo rules",
        default: false,
      })
      .option("clone-dir", {
        type: "string",
        describe: "Parent directory for the cloned repo. Defaults to the current directory.",
      })
      .option("teamwork-project-id", {
        type: "number",
        describe: "Teamwork project ID for the generated .wtc.yaml",
      })
      .option("general-tasks", {
        type: "string",
        describe:
          "General Tasks task-list ID or URL. Defaults to Teamwork template discovery. Pass -1 to skip.",
      })
      .option("review-task", {
        type: "string",
        describe:
          "Code Review task ID or URL. Defaults to Teamwork template discovery. Pass -1 to skip.",
      })
      .option("json", {
        type: "boolean",
        describe: "Print JSON output",
        default: false,
      }) as unknown as Argv<{
      name: string;
      template?: string;
      visibility: RepoVisibility;
      description?: string;
      json?: boolean;
      rulesPreset?: string;
      setupTeamwork?: boolean;
      cloneDir?: string;
      teamworkProjectId?: number;
      generalTasks?: string;
      reviewTask?: string;
    }>,
  handler: (argv) =>
    repoCreate({
      name: argv.name ?? "",
      template: argv.template,
      visibility: argv.visibility ?? "private",
      description: argv.description,
      json: argv.json ?? false,
      rulesPreset: argv.rulesPreset ?? "standard",
      setupTeamwork: argv.setupTeamwork ?? false,
      cloneDir: argv.cloneDir,
      teamworkProjectId: argv.teamworkProjectId,
      generalTasks: argv.generalTasks,
      reviewTask: argv.reviewTask,
    }),
};

export const repoCommand: CommandModule = {
  command: "repo",
  describe: "Manage GitHub repositories",
  builder: (yargs) =>
    yargs.command(repoCreateCommand).demandCommand(1, "Specify a repo subcommand: create"),
  handler: () => {},
};
