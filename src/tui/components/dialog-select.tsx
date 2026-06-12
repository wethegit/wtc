import { createMemo, createSignal } from "solid-js";
import { InputRenderable, TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";
import { tokens } from "../tokens.ts";
import { useDialog } from "./dialog.tsx";

/**
 * Selectable option rendered by `DialogSelect`.
 *
 * `value` is owned by the caller and can be any stable identifier. `onSelect`
 * should perform the action and close the dialog when appropriate.
 */
export interface DialogSelectOption<T> {
  /** Primary label shown in the list. */
  title: string;
  /** Caller-owned identifier for the option. */
  value: T;
  /** Optional secondary text shown beside the title. */
  description?: string;
  /** Optional grouping metadata, currently used by filtering. */
  category?: string;
  /** Reserved for future contextual footer text. */
  footer?: string;
  /** Action to run when the option is selected by keyboard or mouse. */
  onSelect?: () => void;
}

/**
 * Filters dialog select options using the title, description, and category.
 *
 * This helper is intentionally pure so command palette filtering stays covered
 * by unit tests without rendering OpenTUI components.
 */
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

/**
 * Searchable list dialog used by the command palette and future pickers.
 *
 * The component assumes it is rendered inside `DialogProvider` and
 * `KeymapProvider`. It registers local dialog navigation bindings with
 * `useBindings()` for Escape, Up, Down, and Return. Callers provide the options
 * and decide what each option does in `onSelect`.
 */
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

  // These bindings live with the dialog component so they are automatically
  // disposed when the dialog is removed from the stack.
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
          // OpenTUI creates the underlying input renderable during reconciliation.
          // Delay focus until the renderable exists and has not been destroyed by
          // a fast close/reopen cycle.
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
