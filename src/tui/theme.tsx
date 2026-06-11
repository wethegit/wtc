import { createContext, useContext, onMount, type ParentProps } from "solid-js";
import { useRenderer } from "@opentui/solid";
import { tokens, type Tokens } from "./tokens.ts";

type Theme = Tokens;

const ThemeContext = createContext<Theme>();

export function ThemeProvider(props: ParentProps) {
  const renderer = useRenderer();

  onMount(() => {
    renderer.setBackgroundColor(tokens.bg);
  });

  return <ThemeContext.Provider value={tokens}>{props.children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return value;
}
