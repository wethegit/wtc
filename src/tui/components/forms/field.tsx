import { createEffect } from "solid-js";
import type { InputRenderable } from "@opentui/core";

import { usePageScroll } from "../layout/scroll-context.tsx";
import { tokens } from "../../tokens.ts";

export interface FieldProps {
  /** Stable field name used by forms and tests. */
  name: string;
  /** Label shown before the input. */
  label: string;
  /** Current input value. */
  value: string;
  /** Placeholder shown when the input is empty. */
  placeholder?: string;
  /** Secondary helper text shown below the input row. */
  description?: string;
  /** Validation error shown below the input row. */
  error?: string | null;
  /** Whether this field should receive keyboard focus. */
  focused?: boolean;
  /** Called whenever OpenTUI reports input text changes. */
  onInput: (value: string) => void;
}

export function Field(props: FieldProps) {
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

  const hasValue = () => props.value.length > 0;
  const inputTextColor = () => (props.focused || hasValue() ? tokens.white : tokens.white46);
  const inputBorderColor = () => {
    if (props.focused) return tokens.focusBlue;
    return tokens.white46;
  };

  return (
    <box flexDirection="column" gap={0} width="100%">
      <box flexDirection="row" gap={1} width="100%" alignItems="center">
        <box width={20}>
          <text fg={tokens.white65}>{props.label}</text>
        </box>
        <box width={1}>
          <text fg={tokens.focusBlue}>{props.focused ? ">" : " "}</text>
        </box>
        <box
          border
          borderStyle="single"
          borderColor={inputBorderColor()}
          paddingX={1}
          flexGrow={1}
          flexShrink={1}
        >
          <input
            id={props.name}
            ref={(renderable) => {
              input = renderable;
            }}
            focused={props.focused}
            width="auto"
            flexGrow={1}
            value={props.value}
            placeholder={props.placeholder ?? ""}
            textColor={inputTextColor()}
            cursorColor={tokens.focusBlue}
            backgroundColor={tokens.wtcNavy}
            focusedBackgroundColor={tokens.wtcNavy}
            onInput={props.onInput}
          />
        </box>
      </box>
      <box flexDirection="column" paddingLeft={23}>
        {props.description && <text fg={tokens.white46}>{props.description}</text>}
        {props.error && <text fg={tokens.focusBlue}>{props.error}</text>}
      </box>
    </box>
  );
}
