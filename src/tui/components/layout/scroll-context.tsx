import { createContext, useContext, type ParentProps } from "solid-js";
import type { ScrollBoxRenderable } from "@opentui/core";

interface ScrollContextValue {
  scrollChildIntoView: (id: string) => void;
}

const ScrollContext = createContext<ScrollContextValue>();

/** Provides a scroll-into-view helper to child form components for focus scrolling. */
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

/** Returns the current page scroll context, or null when no ScrollProvider is ancestor. */
export function usePageScroll(): ScrollContextValue | null {
  return useContext(ScrollContext) ?? null;
}
