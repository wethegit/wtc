import { TextAttributes } from "@opentui/core";
import { tokens } from "../tokens.ts";

export function Dashboard(props: { version?: string }) {
  const version = props.version ?? "0.1.0";

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={2}>
      <box flexDirection="column" justifyContent="center" alignItems="center" gap={1}>
        <ascii_font font="tiny" text="WTC" />
        <text attributes={TextAttributes.DIM}>What will you build?</text>
      </box>
      <text fg={tokens.text}>Press ctrl/cmd+p to open the command palette.</text>
      <text attributes={TextAttributes.DIM}>v{version} · Press Ctrl+C to exit</text>
    </box>
  );
}
