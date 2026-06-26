import { TextAttributes } from "@opentui/core";

import { tokens } from "../tokens.ts";

export interface LoadingDialogProps {
  title?: string;
  message: string;
}

export function LoadingDialog(props: LoadingDialogProps) {
  return (
    <box gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD}>{props.title ?? "Loading"}</text>
      </box>
      <text fg={tokens.textDim}>{props.message}</text>
    </box>
  );
}
