import { TextAttributes } from "@opentui/core";
import { tokens } from "../tokens.ts";

/** Placeholder route for configuration and setup workflows. */
export function SettingsPage() {
  return (
    <box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center" gap={1}>
      <text attributes={TextAttributes.BOLD} fg={tokens.warning}>
        Settings
      </text>
      <text fg={tokens.text}>Configuration and setup shortcuts will live here.</text>
      <text fg={tokens.textDim}>Use ctrl/cmd+p to jump somewhere else.</text>
    </box>
  );
}
