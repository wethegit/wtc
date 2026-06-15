import type { JSX, ParentProps } from "solid-js";
import { TextAttributes } from "@opentui/core";
import type { RGBA } from "@opentui/core";

import { tokens } from "../../tokens.ts";

/** Props for the standard full-page TUI wrapper. */
export interface PageProps extends ParentProps {
  /** Page title shown in the top-left header. */
  title: string;
  /** Optional right-aligned header content, such as saved/dirty status. */
  status?: JSX.Element;
  /** Optional status or feedback message shown directly below the header. */
  message?: JSX.Element;
  /** Optional title color override. */
  titleColor?: RGBA;
}

/**
 * Standard route page wrapper.
 *
 * Use this for feature pages so padding, header layout, and page spacing stay
 * consistent across the TUI.
 */
export function Page(props: PageProps) {
  return (
    <box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={props.titleColor ?? tokens.text}>
          {props.title}
        </text>
        {props.status}
      </box>
      {props.message}
      <scrollbox flexGrow={1}>{props.children}</scrollbox>
    </box>
  );
}
