import { Show, type ParentProps } from "solid-js";
import { TextAttributes } from "@opentui/core";

import { tokens } from "../../tokens.ts";

/** Props for a collapsible accordion section used in Settings and other multi-section pages. */
export interface AccordionSectionProps extends ParentProps {
  /** Section title shown in the collapsible header. */
  title: string;
  /** Optional secondary lines shown beneath the header title. */
  description?: string | readonly string[];
  /** Optional compact status shown on the header line. */
  status?: string;
  /** Whether section body content is visible. */
  expanded: boolean;
  /** Toggles the expanded state. */
  onToggle: () => void;
}

function descriptions(value: AccordionSectionProps["description"]): readonly string[] {
  if (!value) return [];
  return typeof value === "string" ? [value] : value;
}

/** A collapsible section with title, description, status, and expandable body content. */
export function AccordionSection(props: AccordionSectionProps) {
  return (
    <box
      border
      borderStyle="rounded"
      borderColor={tokens.white46}
      padding={1}
      flexDirection="column"
      gap={1}
      width="100%"
    >
      <box flexDirection="column" gap={0} onMouseUp={props.onToggle}>
        <box flexDirection="row" gap={1}>
          <text fg={tokens.focusBlue}>{props.expanded ? "↓" : "→"}</text>
          <text attributes={TextAttributes.BOLD} fg={tokens.white}>
            {props.title}
          </text>
          <Show when={props.status}>
            <text fg={tokens.white46}>{props.status}</text>
          </Show>
        </box>
        {descriptions(props.description).map((description) => (
          <text fg={tokens.white46}>{description}</text>
        ))}
      </box>

      <Show when={props.expanded}>
        <box flexDirection="column" paddingLeft={1}>
          {props.children}
        </box>
      </Show>
    </box>
  );
}
