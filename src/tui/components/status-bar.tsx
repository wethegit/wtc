import { createContext, createSignal, useContext, type ParentProps } from "solid-js";

import { tokens } from "../tokens.ts";

export interface StatusBarHint {
  key: string;
  label: string;
}

interface StatusBarContextValue {
  setHints: (hints: StatusBarHint[]) => void;
}

const StatusBarContext = createContext<StatusBarContextValue>();

export function StatusBarProvider(props: { globalHints: StatusBarHint[] } & ParentProps) {
  const [contextualHints, setContextualHints] = createSignal<StatusBarHint[]>([]);

  return (
    <StatusBarContext.Provider value={{ setHints: setContextualHints }}>
      {props.children}
      <StatusBar globalHints={props.globalHints} contextualHints={contextualHints()} />
    </StatusBarContext.Provider>
  );
}

interface InternalBarProps {
  globalHints: StatusBarHint[];
  contextualHints: StatusBarHint[];
}

function StatusBar(props: InternalBarProps) {
  const hintsText = () =>
    [...props.globalHints, ...props.contextualHints]
      .map((hint) => `${hint.key} ${hint.label}`)
      .join(" · ");

  return (
    <box
      position="absolute"
      bottom={0}
      left={0}
      width="100%"
      paddingX={1}
      backgroundColor={tokens.surfaceOverlay}
    >
      <text fg={tokens.textDim}>{hintsText()}</text>
    </box>
  );
}

export function useStatusBar(): StatusBarContextValue {
  const value = useContext(StatusBarContext);
  if (!value) {
    throw new Error("useStatusBar must be used within StatusBarProvider");
  }
  return value;
}
