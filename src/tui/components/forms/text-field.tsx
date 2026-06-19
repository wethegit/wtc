import { createEffect } from "solid-js";
import type { InputRenderable } from "@opentui/core";

import { usePageScroll } from "../layout/scroll-context.tsx";
import { tokens } from "../../tokens.ts";

/** Props for the standard single-line TUI text field. */
export interface TextFieldProps {
  /** Stable field name used by forms and tests. */
  name: string;
  /** Label shown before the input. */
  label: string;
  /** Current input value. */
  value: string;
  /** Placeholder shown when the input is empty. */
  placeholder?: string;
  /** Input width in terminal columns. */
  width?: number;
  /** Secondary helper text shown below the input row. */
  description?: string;
  /** Validation error shown below the input row. */
  error?: string | null;
  /** Whether this field should receive keyboard focus. */
  focused?: boolean;
  /** Called whenever OpenTUI reports input text changes. */
  onInput: (value: string) => void;
}

/**
 * Standard labeled text input for TUI forms.
 *
 * Use this instead of hand-rolling `<text>` + `<input>` rows in feature pages so
 * labels, spacing, helper text, and validation states stay consistent across the
 * Solid TUI design system.
 */
export function TextField(props: TextFieldProps) {
  let input: InputRenderable | undefined;
  const scroll = usePageScroll();

  createEffect(() => {
    if (!props.focused || !input || input.isDestroyed) return;

    setTimeout(() => {
      if (!input || input.isDestroyed) return;
      input.focus();
      scroll?.scrollChildIntoView(props.name);
    }, 1);
  });

  return (
    <box flexDirection="column" gap={0}>
      <box flexDirection="row" gap={1}>
        <box width={1}>
          <text fg={props.focused ? tokens.accent : tokens.textDim}>
            {props.focused ? ">" : " "}
          </text>
        </box>
        <box width={20}>
          <text fg={props.focused ? tokens.accent : tokens.textDim}>{props.label}</text>
        </box>
        <input
          id={props.name}
          ref={(renderable) => {
            input = renderable;
          }}
          focused={props.focused}
          width={props.width ?? 30}
          value={props.value}
          placeholder={props.placeholder ?? ""}
          onInput={props.onInput}
        />
      </box>
      <box flexDirection="column" paddingLeft={23}>
        {props.description && <text fg={tokens.textDim}>{props.description}</text>}
        {props.error && <text fg={tokens.danger}>{props.error}</text>}
      </box>
    </box>
  );
}
