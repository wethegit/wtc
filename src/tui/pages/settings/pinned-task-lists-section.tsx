import { DynamicList } from "../../components/forms/dynamic-list.tsx";
import { TextField } from "../../components/forms/text-field.tsx";
import { AccordionSection } from "../../components/layout/accordion-section.tsx";
import type {
  PinnedTaskListFormState,
  SettingsFocusTarget,
  SettingsFormErrors,
  SettingsFormState,
} from "./types.ts";

export function PinnedTaskListsSection(props: {
  form: SettingsFormState;
  expanded: boolean;
  errors: SettingsFormErrors;
  isFocused: (target: SettingsFocusTarget) => boolean;
  onToggle: () => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<PinnedTaskListFormState>) => void;
}) {
  return (
    <AccordionSection
      title="Teamwork pinned task lists"
      status={`${props.form.project.pinnedTaskLists.length}`}
      expanded={props.expanded}
      onToggle={props.onToggle}
    >
      <DynamicList
        items={props.form.project.pinnedTaskLists}
        emptyMessage="No pinned task lists configured."
        addLabel="add task list"
        namePrefix="pinned-task-lists"
        addFocused={props.isFocused({ type: "listAction", list: "pinnedTaskLists", action: "add" })}
        onAdd={props.onAdd}
        removeFocused={(index) =>
          props.isFocused({ type: "listAction", list: "pinnedTaskLists", action: "remove", index })
        }
        onRemove={props.onRemove}
        renderItem={(taskList, index) => (
          <box flexDirection="column">
            <TextField
              name={`pinned-task-list-${index}-name`}
              label="name"
              value={taskList.name}
              placeholder="General Tasks"
              error={props.errors[`pinnedTaskLists.${index}.name`]}
              focused={props.isFocused({ type: "pinnedTaskList", index, field: "name" })}
              onInput={(value) => props.onUpdate(index, { name: value })}
            />
            <TextField
              name={`pinned-task-list-${index}-id`}
              label="id"
              value={taskList.id}
              width={18}
              placeholder="1597639"
              error={props.errors[`pinnedTaskLists.${index}.id`]}
              focused={props.isFocused({ type: "pinnedTaskList", index, field: "id" })}
              onInput={(value) => props.onUpdate(index, { id: value })}
            />
          </box>
        )}
      />
    </AccordionSection>
  );
}
