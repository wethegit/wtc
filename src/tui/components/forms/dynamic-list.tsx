import { For, Show, type JSX } from "solid-js";

import { ActionButton } from "./action-button.tsx";
import { tokens } from "../../tokens.ts";

export interface DynamicListProps<T> {
  /** Current rows in the editable list. */
  items: readonly T[];
  /** Message shown when the list is empty. */
  emptyMessage: string;
  /** Label for the add-row action. */
  addLabel: string;
  /** Whether the add-row action is focused. */
  addFocused?: boolean;
  /** Adds a new unsaved row to the form state. */
  onAdd: () => void;
  /** Whether a row's remove action is focused. */
  removeFocused: (index: number) => boolean;
  /** Removes a row from unsaved form state. */
  onRemove: (index: number) => void;
  /** Renders row-specific fields. */
  renderItem: (item: T, index: number) => JSX.Element;
}

export function DynamicList<T>(props: DynamicListProps<T>) {
  return (
    <box flexDirection="column" gap={1}>
      <ActionButton
        name="add-list-item"
        label={props.addLabel}
        focused={props.addFocused}
        onPress={props.onAdd}
      />

      <Show
        when={props.items.length > 0}
        fallback={<text fg={tokens.textDim}>{props.emptyMessage}</text>}
      >
        <For each={props.items}>
          {(item, index) => (
            <box
              flexDirection="column"
              gap={1}
              paddingLeft={1}
              border={["left"]}
              borderColor={tokens.accentSoft}
            >
              {props.renderItem(item, index())}
              <ActionButton
                name={`remove-list-item-${index()}`}
                label="remove"
                focused={props.removeFocused(index())}
                onPress={() => props.onRemove(index())}
              />
            </box>
          )}
        </For>
      </Show>
    </box>
  );
}
