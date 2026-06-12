const args = Bun.argv.slice(2);

if (args.length === 0) {
  const { runTUI } = await import("./tui/app.tsx");
  await runTUI();
} else {
  const { runCli } = await import("./cli/parser.ts");
  await runCli();
}
