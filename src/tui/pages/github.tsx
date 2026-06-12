import { TextAttributes } from "@opentui/core";
import { tokens } from "../tokens.ts";

/** Placeholder route for upcoming GitHub repository workflows. */
export function GitHubPage() {
  return (
    <box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center" gap={1}>
      <text attributes={TextAttributes.BOLD} fg={tokens.accent}>
        GitHub
      </text>
      <text fg={tokens.text}>Repository workflows will live here.</text>
      <text fg={tokens.textDim}>Use ctrl/cmd+p to jump somewhere else.</text>
    </box>
  );
}
