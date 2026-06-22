import { createContext, createSignal, useContext, type ParentProps } from "solid-js";

import { saveTuiState } from "../../state/manager.ts";
import type { TuiStateEntry } from "../../state/schema.ts";

/** TUI state context: provides current state snapshot and a persist-to-disk updater. */
export interface StateContextValue {
  /** Current state snapshot for the active directory. */
  state: TuiStateEntry;
  /** Merges partial state into the current entry and persists to disk. */
  updateState: (partial: Partial<TuiStateEntry>) => void;
}

const StateContext = createContext<StateContextValue>();

/** Provides the per-directory TUI state to the component tree. */
export function StateProvider(props: { dir: string; initialState: TuiStateEntry } & ParentProps) {
  const [state, setState] = createSignal<TuiStateEntry>(props.initialState);

  const value: StateContextValue = {
    get state() {
      return state();
    },
    updateState(partial: Partial<TuiStateEntry>) {
      const next = { ...state(), ...partial, lastUpdated: new Date().toISOString() };
      setState(next);
      void saveTuiState(props.dir, partial);
    },
  };

  return <StateContext.Provider value={value}>{props.children}</StateContext.Provider>;
}

/** Returns the current TUI state context. */
export function useTuiState(): StateContextValue {
  const value = useContext(StateContext);
  if (!value) {
    throw new Error("useTuiState must be used within a StateProvider");
  }
  return value;
}
