import { Show, type ParentProps } from "solid-js";

import { tokens } from "../../tokens.ts";

/** Props for a titled content card used to group related UI sections. */
export interface CardProps extends ParentProps {
  title?: string;
  status?: string;
  active?: boolean;
}

/**
 * Full-rounded-border grouping container for content sections.
 *
 * Use `Card` for major visual groups (pinned task lists, settings sections,
 * timer lists) and nest `ListItem` entries inside it. Avoid nesting Cards
 * more than one level deep.
 */
export function Card(props: CardProps) {
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={props.active ? tokens.borderFocus : tokens.border}
      padding={1}
      flexDirection="column"
      gap={1}
    >
      <Show when={props.title}>
        <box flexDirection="row" gap={1}>
          <text fg={props.active ? tokens.accent : tokens.text}>{props.title}</text>
          <Show when={props.status}>
            <text fg={tokens.textDim}>{props.status}</text>
          </Show>
        </box>
      </Show>

      {props.children}
    </box>
  );
}
