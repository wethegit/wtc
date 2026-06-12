import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";
import { tokens } from "../tokens.ts";
import { useDialog } from "./dialog.tsx";

export interface UpdateDialogProps {
  currentVersion: string;
  latestVersion: string;
  repo: string;
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

  const installCmd = `curl -fsSL https://raw.githubusercontent.com/${props.repo}/main/install.sh | bash`;

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={tokens.danger}>
          Update Available
        </text>
        <text fg={tokens.textDim} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box>
        <text fg={tokens.text}>v{props.currentVersion}</text>
        <text fg={tokens.textDim}> → </text>
        <text fg={tokens.accent}>v{props.latestVersion}</text>
      </box>
      <box paddingTop={1} paddingBottom={1}>
        <text fg={tokens.textDim}>{installCmd}</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box
          paddingLeft={3}
          paddingRight={3}
          backgroundColor={tokens.accent}
          onMouseUp={() => dialog.clear()}
        >
          <text fg={tokens.textInverse}>ok</text>
        </box>
      </box>
    </box>
  );
}
