import { tokens } from "../tokens.ts";

export function StatusBar() {
  return (
    <box
      position="absolute"
      bottom={0}
      left={0}
      width="100%"
      height={1}
      backgroundColor={tokens.surface}
    >
      <text fg={tokens.textDim}>ctrl/cmd+p commands · q quit</text>
    </box>
  );
}
