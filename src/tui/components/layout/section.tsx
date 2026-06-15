import type { ParentProps } from "solid-js";
import { TextAttributes } from "@opentui/core";

import { tokens } from "../../tokens.ts";

/** Props for a titled content section inside a TUI page. */
export interface SectionProps extends ParentProps {
  /** Section title. */
  title: string;
  /** Optional secondary lines shown beneath the title. */
  description?: string | readonly string[];
}

function descriptions(value: SectionProps["description"]): readonly string[] {
  if (!value) return [];
  return typeof value === "string" ? [value] : value;
}

/**
 * Standard section wrapper for grouped page content.
 *
 * Use this for form sections, settings groups, and future configuration panels
 * so headings and detail text remain consistent across pages.
 */
export function Section(props: SectionProps) {
  return (
    <box
      flexDirection="row"
      gap={1}
      backgroundColor={tokens.surfaceOverlay}
      border={["left"]}
      borderColor={tokens.accentSoft}
    >
      <box flexDirection="column" gap={1} padding={1}>
        <box flexDirection="column" gap={0}>
          <text attributes={TextAttributes.BOLD} fg={tokens.text}>
            {props.title}
          </text>
          {descriptions(props.description).map((description) => (
            <text fg={tokens.textDim}>{description}</text>
          ))}
        </box>
        <box flexDirection="column" paddingLeft={1}>
          {props.children}
        </box>
      </box>
    </box>
  );
}
