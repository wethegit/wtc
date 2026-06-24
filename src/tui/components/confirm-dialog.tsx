import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { tokens } from "../tokens.ts";

import { useDialog } from "./dialog.tsx";

/** Props for a simple confirmation dialog. */
export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}

/** Small reusable confirmation modal for destructive or workflow-switching actions. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const dialog = useDialog();

  const confirm = async () => {
    try {
      await props.onConfirm();
    } catch (error) {
      console.error(error);
    } finally {
      dialog.clear();
    }
  };

  useBindings(() => ({
    bindings: [
      {
        key: "return",
        desc: "Confirm",
        group: "Dialog",
        cmd: () => {
          void confirm();
        },
      },
    ],
  }));

  return (
    <box gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD}>{props.title}</text>
        <text fg={tokens.textDim} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <text fg={tokens.textDim}>{props.message}</text>
      <box flexDirection="row" justifyContent="flex-end" gap={1} paddingTop={1}>
        <box paddingX={2} backgroundColor={tokens.surfaceOverlay} onMouseUp={() => dialog.clear()}>
          <text fg={tokens.text}>{props.cancelLabel ?? "cancel"}</text>
        </box>
        <box
          paddingX={2}
          backgroundColor={tokens.accent}
          onMouseUp={() => {
            void confirm();
          }}
        >
          <text fg={tokens.textInverse}>{props.confirmLabel ?? "confirm"}</text>
        </box>
      </box>
    </box>
  );
}
