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
    }>,
  handler: (argv) =>
    repoCreate({
      name: argv.name ?? "",
      template: argv.template,
      visibility: argv.visibility ?? "private",
      description: argv.description,
      json: argv.json ?? false,
    }),
};

export const repoCommand: CommandModule = {
  command: "repo",
  describe: "Manage GitHub repositories",
  builder: (yargs) =>
    yargs.command(repoCreateCommand).demandCommand(1, "Specify a repo subcommand: create"),
  handler: () => {},
};
