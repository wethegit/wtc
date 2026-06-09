import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { launchDashboard } from "../tui/app.tsx";

export async function runCli(): Promise<void> {
  const parser = yargs(hideBin(Bun.argv))
    .scriptName("wtc")
    .version()
    .help()
    .command(
      "$0",
      "Launch the WTC dashboard",
      () => {},
      () => {
        launchDashboard();
      },
    );

  await parser.parse();
}
