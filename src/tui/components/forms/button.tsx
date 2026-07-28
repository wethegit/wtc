import { createEffect } from "solid-js";
import type { BoxRenderable } from "@opentui/core";

import { usePageScroll } from "../layout/scroll-context.tsx";
import { tokens } from "../../tokens.ts";

export interface ButtonProps {
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

export function Button(props: ButtonProps) {
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
    if (props.focused) return tokens.white;
    if (props.variant === "primary") return tokens.white65;
    return tokens.black46;
  };

  const foreground = () =>
    props.focused || props.variant === "primary" ? tokens.black : tokens.white;

  return (
    <box
      id={props.name}
      ref={(renderable) => {
        button = renderable;
      }}
      focused={props.focused}
      paddingX={2}
      alignItems="center"
      justifyContent="center"
      backgroundColor={background()}
      onMouseUp={props.onPress}
    >
      <text fg={foreground()}>{props.label}</text>
    </box>
  );
}
