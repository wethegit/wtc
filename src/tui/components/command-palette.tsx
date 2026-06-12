import { createSignal } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";
import { tokens } from "../tokens.ts";

export interface CommandEntry {
  id: string;
  title: string;
  description?: string;
  onSelect: () => void;
}

export function filterCommands(entries: readonly CommandEntry[], query: string): CommandEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  return entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(q) || entry.description?.toLowerCase().includes(q),
  );
}

export function CommandPalette(props: { entries: CommandEntry[]; onClose: () => void }) {
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const filtered = () => filterCommands(props.entries, query());

  const selectCurrent = () => {
    const entry = filtered()[selectedIndex()];
    if (!entry) return;
    entry.onSelect();
    props.onClose();
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
        run: () => setSelectedIndex((i) => Math.min(Math.max(0, filtered().length - 1), i + 1)),
      },
      {
        key: "return",
        desc: "Select command",
        group: "CommandPalette",
        cmd: selectCurrent,
      },
    ],
  }));

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} flexDirection="column">
      <text attributes={TextAttributes.BOLD} fg={tokens.text}>
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
            backgroundColor={i === selectedIndex() ? tokens.selectionBg : undefined}
            onMouseUp={() => {
              entry.onSelect();
              props.onClose();
            }}
          >
            <text fg={i === selectedIndex() ? tokens.selectionText : tokens.text}>
              {entry.title}
            </text>
            {entry.description && <text fg={tokens.textDim}> — {entry.description}</text>}
          </box>
        ))}
        {filtered().length === 0 && <text fg={tokens.textDim}>No matching commands</text>}
      </box>
      <text fg={tokens.textDim}>↑↓ navigate · enter select · esc close</text>
    </box>
  );
}
