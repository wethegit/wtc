import { DynamicList } from "../../components/forms/dynamic-list.tsx";
import { Field } from "../../components/forms/field.tsx";
import { AccordionSection } from "../../components/layout/accordion-section.tsx";
import type {
  ProjectLinkFormState,
  SettingsFocusTarget,
  SettingsFormErrors,
  SettingsFormState,
} from "./types.ts";

/** Settings section for editable project links (add/remove rows). */
export function ProjectLinksSection(props: {
  form: SettingsFormState;
  expanded: boolean;
  errors: SettingsFormErrors;
  isFocused: (target: SettingsFocusTarget) => boolean;
  onToggle: () => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<ProjectLinkFormState>) => void;
}) {
  return (
    <AccordionSection
      title="Project links"
      status={`${props.form.project.links.length}`}
      expanded={props.expanded}
      onToggle={props.onToggle}
    >
      <DynamicList
        items={props.form.project.links}
        emptyMessage="No project links configured."
        addLabel="add link"
        namePrefix="project-links"
        addFocused={props.isFocused({ type: "listAction", list: "projectLinks", action: "add" })}
        onAdd={props.onAdd}
        removeFocused={(index) =>
          props.isFocused({ type: "listAction", list: "projectLinks", action: "remove", index })
        }
        onRemove={props.onRemove}
        renderItem={(link, index) => (
          <box flexDirection="column" gap={1}>
            <Field
              name={`project-link-${index}-name`}
              label="name"
              value={link.name}
              placeholder="Figma"
              error={props.errors[`projectLinks.${index}.name`]}
              focused={props.isFocused({ type: "projectLink", index, field: "name" })}
              onInput={(value) => props.onUpdate(index, { name: value })}
            />
            <Field
              name={`project-link-${index}-url`}
              label="url"
              value={link.url}
              placeholder="https://figma.com/..."
              error={props.errors[`projectLinks.${index}.url`]}
              focused={props.isFocused({ type: "projectLink", index, field: "url" })}
              onInput={(value) => props.onUpdate(index, { url: value })}
            />
          </box>
        )}
      />
    </AccordionSection>
  );
}
