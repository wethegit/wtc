import { createMemo, createSignal, For, Show } from "solid-js";
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
  /** Optional grouping metadata rendered as a section heading. */
  category?: string;
  /** Reserved for future contextual footer text. */
  footer?: string;
  /** Action to run when the option is selected by keyboard or mouse. */
  onSelect?: () => void;
}

interface DialogOptionSection<T> {
  category: string;
  options: DialogSelectOption<T>[];
  startIndex: number;
}

/**
 * Filters dialog select options using the title, description, and category.
 */
function filterDialogSelectOptions<T>(
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
export function DialogSelect<T>(props: {
  title: string;
  options: DialogSelectOption<T>[];
  onCancel?: () => void;
}) {
  const dialog = useDialog();
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const filtered = createMemo(() => filterDialogSelectOptions(props.options, query()));

  const sections = createMemo(() => {
    const items = filtered();
    const groups = new Map<string, DialogSelectOption<T>[]>();
    for (const item of items) {
      const cat = item.category ?? "Other";
      const group = groups.get(cat);
      if (group) {
        group.push(item);
      } else {
        groups.set(cat, [item]);
      }
    }
    let startIndex = 0;
    const result: DialogOptionSection<T>[] = [];
    for (const [category, groupOptions] of groups) {
      result.push({ category, options: groupOptions, startIndex });
      startIndex += groupOptions.length;
    }
    return result;
  });

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
        cmd: () => (props.onCancel ? props.onCancel() : dialog.clear()),
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
    <box paddingLeft={2} paddingRight={2} paddingTop={1} gap={1} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={tokens.text}>
          {props.title}
        </text>
        <text
          fg={tokens.textDim}
          onMouseUp={() => (props.onCancel ? props.onCancel() : dialog.clear())}
        >
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
      <box flexDirection="column" flexGrow={1} gap={0}>
        <For each={sections()}>
          {(section, sectionIndex) => (
            <box flexDirection="column" gap={0}>
              <Show when={sectionIndex() > 0}>
                <text> </text>
              </Show>
              <text paddingLeft={1} fg={tokens.accent}>
                {section.category}
              </text>
              <For each={section.options}>
                {(option, localIndex) => {
                  const globalIndex = section.startIndex + localIndex();
                  return (
                    <box
                      backgroundColor={
                        globalIndex === selectedIndex() ? tokens.selectionBg : undefined
                      }
                      onMouseUp={() => option.onSelect?.()}
                    >
                      <text
                        fg={globalIndex === selectedIndex() ? tokens.selectionText : tokens.text}
                      >
                        {option.title}
                      </text>
                      {option.description && (
                        <text fg={tokens.textDim}> — {option.description}</text>
                      )}
                    </box>
                  );
                }}
              </For>
            </box>
          )}
        </For>
        {filtered().length === 0 && <text fg={tokens.textDim}>No matching commands</text>}
      </box>
      <text fg={tokens.textDim}>
        ↑↓ navigate · enter select · esc {props.onCancel ? "back" : "close"}
      </text>
    </box>
  );
}
