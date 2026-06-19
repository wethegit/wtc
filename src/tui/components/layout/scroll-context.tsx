import { createContext, useContext, type ParentProps } from "solid-js";
import type { ScrollBoxRenderable } from "@opentui/core";

interface ScrollContextValue {
  scrollChildIntoView: (id: string) => void;
}

const ScrollContext = createContext<ScrollContextValue>();

export function ScrollProvider(
  props: { scrollbox: () => ScrollBoxRenderable | undefined } & ParentProps,
) {
  const value: ScrollContextValue = {
    scrollChildIntoView(id) {
      props.scrollbox()?.scrollChildIntoView(id);
    },
  };

  return <ScrollContext.Provider value={value}>{props.children}</ScrollContext.Provider>;
}

export function usePageScroll(): ScrollContextValue | null {
  return useContext(ScrollContext) ?? null;
}
