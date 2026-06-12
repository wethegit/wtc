import { TextAttributes } from "@opentui/core";

import { APP_VERSION } from "../../config/consts.ts";

import { tokens } from "../tokens.ts";

export function Dashboard() {
  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={2}>
      <box flexDirection="column" justifyContent="center" alignItems="center" gap={1}>
        <ascii_font font="tiny" text="WTC" />
        <text attributes={TextAttributes.DIM}>What will you build?</text>
      </box>
      <text fg={tokens.text}>Press ctrl/cmd+p to open the command palette.</text>
      <text attributes={TextAttributes.DIM}>v{APP_VERSION} · Press Ctrl+C to exit</text>
    </box>
  );
}
