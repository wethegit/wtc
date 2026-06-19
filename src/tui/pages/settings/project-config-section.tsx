import { TextField } from "../../components/forms/text-field.tsx";
import { AccordionSection } from "../../components/layout/accordion-section.tsx";
import type { SettingsFocusTarget, SettingsFormErrors, SettingsFormState } from "./types.ts";

export function ProjectConfigSection(props: {
  form: SettingsFormState;
  projectConfigPath: string | null | undefined;
  expanded: boolean;
  errors: SettingsFormErrors;
  isFocused: (target: SettingsFocusTarget) => boolean;
  onToggle: () => void;
  onTeamworkProjectIdInput: (value: string) => void;
}) {
  return (
    <AccordionSection
      title="Project config"
      description={[
        props.projectConfigPath ?? ".wtc.yaml will be created in this directory on save",
      ]}
      expanded={props.expanded}
      onToggle={props.onToggle}
    >
      <TextField
        name="teamworkProjectId"
        label="teamworkProjectId"
        value={props.form.project.teamworkProjectId}
        width={18}
        placeholder="12345"
        description="Leave blank until this repo is linked to Teamwork."
        error={props.errors.teamworkProjectId}
        focused={props.isFocused({ type: "field", name: "teamworkProjectId" })}
        onInput={props.onTeamworkProjectIdInput}
      />
    </AccordionSection>
  );
}
