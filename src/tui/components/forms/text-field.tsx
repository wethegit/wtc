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
  return (
    <box flexDirection="column" gap={0}>
      <box flexDirection="row" gap={1}>
        <box width={20}>
          <text fg={tokens.text}>{props.label}</text>
        </box>
        <input
          id={props.name}
          width={props.width ?? 30}
          value={props.value}
          placeholder={props.placeholder ?? ""}
          onInput={props.onInput}
        />
      </box>
      {props.description && <text fg={tokens.textDim}>{props.description}</text>}
      {props.error && <text fg={tokens.danger}>{props.error}</text>}
    </box>
  );
}
