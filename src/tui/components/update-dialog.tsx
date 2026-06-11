import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme.tsx";
import { useDialog } from "./dialog.tsx";
import { useBindings } from "../keymap.tsx";

export interface UpdateDialogProps {
  currentVersion: string;
  latestVersion: string;
  repo: string;
}

export function UpdateDialog(props: UpdateDialogProps) {
  const dialog = useDialog();
  const theme = useTheme();

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
        <text attributes={TextAttributes.BOLD} fg={theme.danger}>
          Update Available
        </text>
        <text fg={theme.textDim} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box>
        <text fg={theme.text}>v{props.currentVersion}</text>
        <text fg={theme.textDim}> → </text>
        <text fg={theme.accent}>v{props.latestVersion}</text>
      </box>
      <box paddingTop={1} paddingBottom={1}>
        <text fg={theme.textDim}>{installCmd}</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
        <box
          paddingLeft={3}
          paddingRight={3}
          backgroundColor={theme.accent}
          onMouseUp={() => dialog.clear()}
        >
          <text fg={theme.textInverse}>ok</text>
        </box>
      </box>
    </box>
  );
}
