import { useKeymapSelector } from "../keymap.tsx";
import { tokens } from "../tokens.ts";

export function StatusBar() {
  const activeKeys = useKeymapSelector((km) => km.getActiveKeys({ includeMetadata: true }));

  const hint = () => {
    const keys = activeKeys();
    if (keys.length > 0) {
      return keys.map((k) => k.display).join(" · ");
    }
    return "↑↓ navigate · enter select · esc back · q quit";
  };

  return (
    <box
      position="absolute"
      bottom={0}
      left={0}
      width="100%"
      height={1}
      backgroundColor={tokens.surface}
    >
      <text fg={tokens.textDim}>{hint()}</text>
    </box>
  );
}
