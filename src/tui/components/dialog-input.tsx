import { createSignal } from "solid-js";
import { InputRenderable, TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { tokens } from "../tokens.ts";

import { useDialog } from "./dialog.tsx";

export interface DialogInputProps {
  title: string;
  label: string;
  initialValue: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
}

export function DialogInput(props: DialogInputProps) {
  const dialog = useDialog();
  const [value, setValue] = createSignal(props.initialValue);

  let input: InputRenderable | undefined;

  useBindings(() => ({
    bindings: [
      {
        key: "escape",
        desc: "Cancel",
        group: "Dialog",
        cmd: () => dialog.clear(),
      },
      {
        key: "return",
        desc: props.confirmLabel ?? "Confirm",
        group: "Dialog",
        cmd: () => {
          const v = value();
          if (!v.trim()) return;
          props.onConfirm(v);
        },
      },
    ],
  }));

  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} gap={1} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={tokens.text}>
          {props.title}
        </text>
        <text fg={tokens.textDim} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <text fg={tokens.textDim}>{props.label}</text>
      <box paddingX={1} borderStyle="single" borderColor={tokens.border}>
        <input
          value={value()}
          onInput={(v: string) => setValue(v)}
          ref={(renderable) => {
            input = renderable;
            setTimeout(() => {
              if (!input || input.isDestroyed) return;
              input.focus();
            }, 1);
          }}
        />
      </box>
      <box flexDirection="row" justifyContent="flex-end" gap={1} paddingTop={1}>
        <text fg={tokens.textDim}>{props.cancelLabel ?? "cancel"} · </text>
        <text fg={tokens.textAccent}>{props.confirmLabel ?? "confirm"}</text>
      </box>
    </box>
  );
}
