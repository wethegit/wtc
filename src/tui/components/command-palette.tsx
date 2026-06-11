import { createSignal } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme.tsx";
import { useDialog } from "./dialog.tsx";
import { useBindings } from "../keymap.tsx";

export interface CommandEntry {
  id: string;
  title: string;
  description?: string;
  onSelect: () => void;
}

export function showCommandPalette(entries: () => CommandEntry[]) {
  const dialog = useDialog();

  dialog.replace(() => <CommandPalette entries={entries()} onClose={() => dialog.clear()} />);
}

function CommandPalette(props: { entries: CommandEntry[]; onClose: () => void }) {
  const theme = useTheme();
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const filtered = () => {
    const q = query().toLowerCase();
    if (!q) return props.entries;
    return props.entries.filter(
      (e) => e.title.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q),
    );
  };

  useBindings(() => ({
    bindings: [
      {
        key: "escape",
        desc: "Close palette",
        group: "CommandPalette",
        cmd: () => props.onClose(),
      },
      {
        key: "up",
        cmd: "palette.up",
        run: () => setSelectedIndex((i) => Math.max(0, i - 1)),
      },
      {
        key: "down",
        cmd: "palette.down",
        run: () => setSelectedIndex((i) => Math.min(filtered().length - 1, i + 1)),
      },
      {
        key: "return",
        desc: "Select command",
        group: "CommandPalette",
        cmd: () => {
          const entry = filtered()[selectedIndex()];
          if (entry) {
            entry.onSelect();
          }
        },
      },
    ],
  }));

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} flexDirection="column">
      <text attributes={TextAttributes.BOLD} fg={theme.text}>
        Command Palette
      </text>
      <input
        value={query()}
        onInput={(val: string) => {
          setQuery(val);
          setSelectedIndex(0);
        }}
        placeholder="Type to filter..."
      />
      <box flexDirection="column" height={10} gap={0}>
        {filtered().map((entry, i) => (
          <box
            backgroundColor={i === selectedIndex() ? theme.selectionBg : undefined}
            onMouseUp={() => {
              entry.onSelect();
            }}
          >
            <text fg={i === selectedIndex() ? theme.selectionText : theme.text}>{entry.title}</text>
            {entry.description && <text fg={theme.textDim}> — {entry.description}</text>}
          </box>
        ))}
        {filtered().length === 0 && <text fg={theme.textDim}>No matching commands</text>}
      </box>
      <text fg={theme.textDim}>↑↓ navigate · enter select · esc close</text>
    </box>
  );
}
