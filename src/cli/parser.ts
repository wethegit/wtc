import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { launchDashboard } from "../tui/app.ts";
import { upgrade } from "./commands/upgrade.ts";
import { APP_VERSION } from "../version.ts";

export async function runCli(): Promise<void> {
  const currentVersion = APP_VERSION;

  const parser = yargs(hideBin(Bun.argv))
    .scriptName("wtc")
    .version(currentVersion)
    .help()
    .command(
      "$0",
      "Launch the WTC dashboard",
      () => {},
      async () => {
        await launchDashboard(currentVersion);
      },
    )
    .command(
      "upgrade",
      "Check for updates",
      (yargs) =>
        yargs.option("check", {
          alias: "c",
          type: "boolean",
          description: "Only check for update, don't apply",
        }),
      async (argv) => {
        await upgrade({ check: argv.check ?? false });
      },
    );

  await parser.parse();
}
