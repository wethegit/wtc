import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { launchDashboard } from "../tui/app.ts";
import { upgrade } from "./commands/upgrade.ts";
import { checkForUpdate } from "../utils/update-check.ts";
import { APP_VERSION } from "../version.ts";

async function notifyUpdateIfAvailable(version: string): Promise<void> {
  const info = await checkForUpdate(version);
  if (info.updateAvailable) {
    console.log(
      `Update available: ${info.latestVersion} (you have v${version}). Use 'wtc upgrade' for direct installs, or update with your package manager.`,
    );
  }
}

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
        void notifyUpdateIfAvailable(currentVersion);
        await launchDashboard(currentVersion);
      },
    )
    .command(
      "upgrade",
      "Check for and apply updates",
      (yargs) =>
        yargs.option("check", {
          alias: "c",
          type: "boolean",
          description: "Only check for update, don't download",
        }),
      async (argv) => {
        await upgrade({ check: argv.check });
      },
    );

  await parser.parse();
}
