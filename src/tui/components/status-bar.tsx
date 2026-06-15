import { tokens } from "../tokens.ts";

/** Key hint displayed in the bottom status bar. */
export interface StatusBarHint {
  /** Keyboard shortcut text, for example `ctrl+s`. */
  key: string;
  /** Human-readable action label, for example `save`. */
  label: string;
}

/** Props for contextual status bar content. */
export interface StatusBarProps {
  /** Ordered hints relevant to the current route or focus context. */
  hints: readonly StatusBarHint[];
  /** Optional short status message appended after the hints. */
  message?: string;
}

/**
 * Bottom status strip for global hints and contextual state.
 *
 * Pages and the app shell should pass route-specific hints instead of hardcoding
 * text here. That keeps styling centralized while allowing Settings, GitHub, and
 * future Teamwork/AWS pages to advertise their own shortcuts.
 */
export function StatusBar(props: StatusBarProps) {
  const hints = () => props.hints.map((hint) => `${hint.key} ${hint.label}`).join(" · ");

  return (
    <box
      position="absolute"
      bottom={0}
      left={0}
      width="100%"
      paddingX={1}
      backgroundColor={tokens.surfaceOverlay}
    >
      <text fg={tokens.textDim}>{hints()}</text>
      {props.message && <text fg={tokens.textDim}> · {props.message}</text>}
    </box>
  );
}
