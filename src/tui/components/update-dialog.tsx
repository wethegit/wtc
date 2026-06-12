import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { APP_VERSION, REPO } from "../../config/consts.ts";

import { tokens } from "../tokens.ts";

import { useDialog } from "./dialog.tsx";

export interface UpdateDialogProps {
  latestVersion: string;
}

export function UpdateDialog(props: UpdateDialogProps) {
  const dialog = useDialog();

  useBindings(() => ({
    bindings: [
      {
        key: "return",
        desc: "Close",
        group: "Dialog",
        cmd: () => dialog.clear(),
      },
    ],
  }));

  const installCmd = `curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash`;

  return (
    <box gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD}>Update Available</text>
        <text fg={tokens.textDim} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box flexDirection="row">
        <text fg={tokens.textDim}>v{APP_VERSION}</text>
        <text fg={tokens.textDim}> → </text>
        <text fg={tokens.accent}>{props.latestVersion}</text>
      </box>
      <box paddingTop={1}>
        <text fg={tokens.text}>{installCmd}</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end">
        <box paddingX={3} backgroundColor={tokens.accent} onMouseUp={() => dialog.clear()}>
          <text fg={tokens.textInverse}>ok</text>
        </box>
      </box>
    </box>
  );
}
