import { createMemo, createSignal } from "solid-js";
import { InputRenderable, TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";
import { tokens } from "../tokens.ts";
import { useDialog } from "./dialog.tsx";

export interface DialogSelectOption<T> {
  title: string;
  value: T;
  description?: string;
  category?: string;
  footer?: string;
  onSelect?: () => void;
}

export function filterDialogSelectOptions<T>(
  options: readonly DialogSelectOption<T>[],
  query: string,
): DialogSelectOption<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  return options.filter(
    (option) =>
      option.title.toLowerCase().includes(q) ||
      option.description?.toLowerCase().includes(q) ||
      option.category?.toLowerCase().includes(q),
  );
}

export function DialogSelect<T>(props: { title: string; options: DialogSelectOption<T>[] }) {
  const dialog = useDialog();
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const filtered = createMemo(() => filterDialogSelectOptions(props.options, query()));
  let input: InputRenderable | undefined;

  const move = (direction: 1 | -1) => {
    if (filtered().length === 0) return;
    setSelectedIndex((index) => {
      const next = index + direction;
      if (next < 0) return filtered().length - 1;
      if (next >= filtered().length) return 0;
      return next;
    });
  };

  const submit = () => {
    const option = filtered()[selectedIndex()];
    if (!option) return;
    option.onSelect?.();
  };

  useBindings(() => ({
    bindings: [
      {
        key: "escape",
        desc: "Close dialog",
        group: "Dialog",
        cmd: () => dialog.clear(),
      },
      {
        key: "up",
        desc: "Previous item",
        group: "Dialog",
        cmd: () => move(-1),
      },
      {
        key: "down",
        desc: "Next item",
        group: "Dialog",
        cmd: () => move(1),
      },
      {
        key: "return",
        desc: "Select item",
        group: "Dialog",
        cmd: submit,
      },
    ],
  }));

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={tokens.text}>
          {props.title}
        </text>
        <text fg={tokens.textDim} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <input
        onInput={(value: string) => {
          setQuery(value);
          setSelectedIndex(0);
        }}
        placeholder="Search"
        ref={(renderable) => {
          input = renderable;
          setTimeout(() => {
            if (!input || input.isDestroyed) return;
            input.focus();
          }, 1);
        }}
      />
      <box flexDirection="column" height={10} gap={0}>
        {filtered().map((option, index) => (
          <box
            backgroundColor={index === selectedIndex() ? tokens.selectionBg : undefined}
            onMouseUp={() => option.onSelect?.()}
          >
            <text fg={index === selectedIndex() ? tokens.selectionText : tokens.text}>
              {option.title}
            </text>
            {option.description && <text fg={tokens.textDim}> — {option.description}</text>}
          </box>
        ))}
        {filtered().length === 0 && <text fg={tokens.textDim}>No matching commands</text>}
      </box>
      <text fg={tokens.textDim}>↑↓ navigate · enter select · esc close</text>
    </box>
  );
}
