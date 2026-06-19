import { createEffect } from "solid-js";
import type { BoxRenderable } from "@opentui/core";

import { usePageScroll } from "../layout/scroll-context.tsx";
import { tokens } from "../../tokens.ts";

/** Props for a keyboard-reachable form action button. */
export interface ActionButtonProps {
  /** Stable action name used as the renderable id. */
  name: string;
  /** Button text. */
  label: string;
  /** Whether this action is the current keyboard focus target. */
  focused?: boolean;
  /** Whether this is the primary action in the group. */
  variant?: "primary" | "secondary";
  /** Mouse/keyboard action handler. */
  onPress: () => void;
}

/**
 * Standard action button for TUI forms.
 *
 * Buttons can receive OpenTUI focus so moving out of an input actually removes
 * focus from that input. Pressing Enter is handled by the owning form because it
 * knows which action is currently selected.
 */
export function ActionButton(props: ActionButtonProps) {
  let button: BoxRenderable | undefined;
  const scroll = usePageScroll();

  createEffect(() => {
    if (!props.focused || !button || button.isDestroyed) return;

    setTimeout(() => {
      if (!button || button.isDestroyed) return;
      button.focus();
      scroll?.scrollChildIntoView(props.name);
    }, 1);
  });

  const background = () => {
    if (props.focused) return tokens.warning;
    if (props.variant === "primary") return tokens.accent;
    return tokens.surfaceOverlay;
  };

  const foreground = () => (props.focused ? tokens.textInverse : tokens.text);

  return (
    <box
      id={props.name}
      ref={(renderable) => {
        button = renderable;
      }}
      focused={props.focused}
      paddingX={2}
      backgroundColor={background()}
      onMouseUp={props.onPress}
    >
      <text fg={foreground()}>{props.label}</text>
    </box>
  );
}
