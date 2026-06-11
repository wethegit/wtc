import { useTheme } from "../theme.tsx";
import { useKeymapSelector } from "../keymap.tsx";

export function StatusBar() {
  const theme = useTheme();
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
      backgroundColor={theme.surface}
    >
      <text fg={theme.textDim}>{hint()}</text>
    </box>
  );
}
