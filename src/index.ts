const args = Bun.argv.slice(2);

// OpenCode-style entrypoint split: no arguments enters the interactive TUI,
// while any explicit argument stays in the CLI parser path. Dynamic imports keep
// TUI dependencies out of simple commands such as `wtc --version`.
if (args.length === 0) {
  const { runTUI } = await import("./tui/app.tsx");
  await runTUI();
} else {
  const { runCli } = await import("./cli/parser.ts");
  await runCli();
}
