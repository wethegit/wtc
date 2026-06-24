import { Show, type JSX } from "solid-js";

import { tokens } from "../../tokens.ts";

/** Props for a compact selectable list item inside a Card. */
export interface ListItemProps {
  id?: string;
  title: string;
  metadata?: readonly string[];
  selected?: boolean;
  badge?: JSX.Element;
}

/** Separator used between inline metadata segments. */
const METADATA_SEPARATOR = " • ";

/**
 * Compact selectable entry for use inside a `Card`.
 *
 * Renders a thin left accent bar, title, optional inline metadata, and an
 * optional right-aligned badge. Use for task entries, timer entries, and
 * any other list-style content.
 */
export function ListItem(props: ListItemProps) {
  const metadataLine = () => {
    const parts = props.metadata;
    if (!parts || parts.length === 0) return null;
    return parts.join(METADATA_SEPARATOR);
  };

  return (
    <box id={props.id} flexDirection="row" gap={1}>
      <box width={1} backgroundColor={props.selected ? tokens.accent : undefined} />

      <box flexDirection="column" flexGrow={1} gap={0}>
        <text fg={props.selected ? tokens.accent : tokens.text}>
          {props.selected ? "● " : ""}
          {props.title}
        </text>

        <Show when={metadataLine()}>
          <text fg={tokens.textDim}>{metadataLine()}</text>
        </Show>
      </box>

      <Show when={props.badge}>
        <box justifyContent="flex-end">{props.badge}</box>
      </Show>
    </box>
  );
}
