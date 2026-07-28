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
  /** Whether this action is unavailable. */
  disabled?: boolean;
  /** Figma button color. */
  color?: "default" | "yellow" | "secondary";
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
    if (props.disabled) return tokens.white46;
    if (props.focused) return tokens.focusBlue;
    if (props.color === "yellow") return tokens.wtcYellow;
    if (props.color === "secondary") return tokens.black80;
    return tokens.white65;
  };

  const foreground = () => {
    if (props.disabled || props.focused) return tokens.black;
    if (props.color === "secondary") return tokens.white;
    return tokens.black;
  };

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
      onMouseUp={() => {
        if (!props.disabled) props.onPress();
      }}
    >
      <text fg={foreground()}>{props.label}</text>
    </box>
  );
}
