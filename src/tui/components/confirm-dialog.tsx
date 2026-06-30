import { createSignal, Show } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { tokens } from "../tokens.ts";

import { ActionButton } from "./forms/action-button.tsx";
import { useDialog } from "./dialog.tsx";

/** Props for a simple confirmation dialog. */
export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true (default), closes the dialog after onConfirm completes. */
  autoClose?: boolean;
  /** Called when the user cancels instead of calling dialog.clear(). */
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
}

type ConfirmFocusTarget = "confirm" | "cancel";

/** Small reusable confirmation modal for destructive or workflow-switching actions. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const dialog = useDialog();
  const [focused, setFocused] = createSignal<ConfirmFocusTarget>("confirm");

  const hasCancel = !!props.onCancel;

  const confirm = async () => {
    try {
      await props.onConfirm();
    } catch (error) {
      console.error(error);
    } finally {
      if (props.autoClose !== false) dialog.clear();
    }
  };

  const pressFocused = () => {
    if (focused() === "confirm") {
      void confirm();
    } else {
      if (props.onCancel) {
        props.onCancel();
      } else {
        dialog.clear();
      }
    }
  };

  useBindings(() => ({
    enabled: dialog.active(),
    bindings: [
      {
        key: "return",
        desc: props.confirmLabel ?? "Confirm",
        group: "Dialog",
        cmd: pressFocused,
      },
      ...(hasCancel
        ? [
            {
              key: "escape",
              desc: props.cancelLabel ?? "Cancel",
              group: "Dialog",
              cmd: () => {
                props.onCancel?.();
              },
            },
            {
              key: "tab",
              desc: "Next button",
              group: "Dialog",
              cmd: () => {
                setFocused((prev) => (prev === "confirm" ? "cancel" : "confirm"));
              },
            },
            {
              key: "shift+tab",
              desc: "Previous button",
              group: "Dialog",
              cmd: () => {
                setFocused((prev) => (prev === "confirm" ? "cancel" : "confirm"));
              },
            },
            {
              key: "right",
              desc: "Next button",
              group: "Dialog",
              cmd: () => {
                setFocused((prev) => (prev === "confirm" ? "cancel" : "confirm"));
              },
            },
            {
              key: "left",
              desc: "Previous button",
              group: "Dialog",
              cmd: () => {
                setFocused((prev) => (prev === "confirm" ? "cancel" : "confirm"));
              },
            },
          ]
        : []),
    ],
  }));

  return (
    <box gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD}>{props.title}</text>
        <text
          fg={tokens.textDim}
          onMouseUp={() => (props.onCancel ? props.onCancel() : dialog.clear())}
        >
          esc
        </text>
      </box>
      <text fg={tokens.textDim}>{props.message}</text>
      <box flexDirection="row" justifyContent="flex-end" gap={1} paddingTop={1}>
        <Show when={hasCancel}>
          <ActionButton
            name="cancel"
            label={props.cancelLabel ?? "cancel"}
            focused={focused() === "cancel"}
            onPress={() => {
              props.onCancel?.();
            }}
          />
        </Show>
        <ActionButton
          name="confirm"
          label={props.confirmLabel ?? "confirm"}
          variant="primary"
          focused={focused() === "confirm"}
          onPress={() => {
            void confirm();
          }}
        />
      </box>
    </box>
  );
}
