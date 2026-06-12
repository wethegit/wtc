import { APP_VERSION } from "./version.ts";

const args = Bun.argv.slice(2);

if (args.length === 0) {
  const { runTUI } = await import("./tui/app.tsx");
  await runTUI(APP_VERSION);
} else {
  const { runCli } = await import("./cli/parser.ts");
  await runCli();
}
