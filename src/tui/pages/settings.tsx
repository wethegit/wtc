import { createMemo, createSignal, onMount } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import {
  createDefaultProjectConfig,
  loadResolvedConfig,
  saveProjectConfig,
  saveUserConfig,
} from "../../config/manager.ts";
import type { ProjectConfig, ResolvedConfig, UserConfig } from "../../config/schema.ts";

import { TextField } from "../components/forms/text-field.tsx";
import { Page } from "../components/layout/page.tsx";
import { Section } from "../components/layout/section.tsx";
import { tokens } from "../tokens.ts";

/** Editable Settings page form state. */
export interface SettingsFormState {
  /** User-level workspace label. */
  workspaceName: string;
  /** Project-level Teamwork ID as input text so invalid edits can be displayed. */
  teamworkProjectId: string;
}

/** Field-level validation messages keyed by settings form field. */
export type SettingsFormErrors = Partial<Record<keyof SettingsFormState, string>>;

type SettingsFieldValidator = {
  field: keyof SettingsFormState;
  validate: (state: SettingsFormState) => string | null;
};

const settingsFieldValidators = [
  {
    field: "teamworkProjectId",
    validate(state) {
      if (
        state.teamworkProjectId.trim() &&
        parseTeamworkProjectId(state.teamworkProjectId) === null
      ) {
        return "Teamwork project ID must be a positive integer.";
      }

      return null;
    },
  },
] satisfies readonly SettingsFieldValidator[];

/** Converts a Teamwork project ID input value into persisted config shape. */
export function parseTeamworkProjectId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Builds editable form state from resolved config. */
export function buildSettingsFormState(config: ResolvedConfig): SettingsFormState {
  return {
    workspaceName: config.user.workspaceName,
    teamworkProjectId: config.project?.teamworkProjectId?.toString() ?? "",
  };
}

/** Returns the current validation error for settings form state, if any. */
export function getSettingsFormError(state: SettingsFormState): string | null {
  return Object.values(validateSettingsForm(state))[0] ?? null;
}

/** Validates every Settings field and returns errors keyed by field name. */
export function validateSettingsForm(state: SettingsFormState): SettingsFormErrors {
  const errors: SettingsFormErrors = {};

  for (const validator of settingsFieldValidators) {
    const message = validator.validate(state);
    if (message) errors[validator.field] = message;
  }

  return errors;
}

/** Converts editable form state back into user and project config objects. */
export function applySettingsFormState(state: SettingsFormState): {
  user: UserConfig;
  project: ProjectConfig;
} {
  return {
    user: {
      version: 1,
      workspaceName: state.workspaceName,
    },
    project: {
      ...createDefaultProjectConfig(),
      teamworkProjectId: parseTeamworkProjectId(state.teamworkProjectId),
    },
  };
}

/** Settings route for viewing and editing Phase 3 config files. */
export function SettingsPage() {
  const [resolved, setResolved] = createSignal<ResolvedConfig | null>(null);
  const [savedForm, setSavedForm] = createSignal<SettingsFormState | null>(null);
  const [form, setForm] = createSignal<SettingsFormState>({
    workspaceName: "",
    teamworkProjectId: "",
  });
  const [message, setMessage] = createSignal("Loading settings...");
  const [isSaving, setIsSaving] = createSignal(false);
  const errors = createMemo(() => validateSettingsForm(form()));
  const error = createMemo(() => Object.values(errors())[0] ?? null);
  const hasUnsavedChanges = createMemo(() => {
    const saved = savedForm();
    if (!saved) return false;
    return (
      saved.workspaceName !== form().workspaceName ||
      saved.teamworkProjectId !== form().teamworkProjectId
    );
  });

  const reload = async () => {
    setMessage("Loading settings...");

    try {
      const config = await loadResolvedConfig(process.cwd());
      const nextForm = buildSettingsFormState(config);
      setResolved(config);
      setSavedForm(nextForm);
      setForm(nextForm);
      setMessage("Settings loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load settings.");
    }
  };

  const save = async () => {
    const currentError = error();
    if (currentError) {
      setMessage(currentError);
      return;
    }

    setIsSaving(true);
    setMessage("Saving settings...");

    try {
      const nextConfig = applySettingsFormState(form());
      await saveUserConfig(nextConfig.user);
      await saveProjectConfig(nextConfig.project, process.cwd());
      await reload();
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  useBindings(() => ({
    bindings: [
      {
        key: "ctrl+s",
        desc: "Save settings",
        group: "Settings",
        cmd: save,
      },
      {
        key: "mod+s",
        desc: "Save settings",
        group: "Settings",
        cmd: save,
      },
      {
        key: "r",
        desc: "Reload settings",
        group: "Settings",
        cmd: reload,
      },
    ],
  }));

  onMount(() => {
    void reload();
  });

  return (
    <Page
      title="Settings"
      titleColor={tokens.warning}
      status={
        <text fg={hasUnsavedChanges() ? tokens.warning : tokens.textDim}>
          {hasUnsavedChanges() ? "unsaved changes" : "saved"}
        </text>
      }
    >
      {resolved() && (
        <box flexDirection="column" gap={1}>
          <Section title="User config" description={resolved()?.paths.userConfigPath}>
            <TextField
              name="workspaceName"
              label="workspaceName"
              value={form().workspaceName}
              placeholder="Workspace name"
              description="User-level placeholder while broader settings are designed."
              onInput={(value) => {
                setForm((current) => ({ ...current, workspaceName: value }));
              }}
            />
          </Section>

          <Section
            title="Project config"
            description={[
              resolved()?.paths.projectConfigPath ??
                ".wtc.json will be created in this directory on save",
              `Search start: ${resolved()?.paths.projectConfigSearchStart ?? ""}`,
            ]}
          >
            <TextField
              name="teamworkProjectId"
              label="teamworkProjectId"
              value={form().teamworkProjectId}
              width={18}
              placeholder="12345"
              description="Leave blank until this repo is linked to Teamwork."
              error={errors().teamworkProjectId}
              onInput={(value) => {
                setForm((current) => ({ ...current, teamworkProjectId: value }));
              }}
            />
          </Section>
        </box>
      )}

      <box flexDirection="row" gap={1}>
        <box paddingX={2} backgroundColor={tokens.accent} onMouseUp={() => void save()}>
          <text fg={tokens.textInverse}>{isSaving() ? "saving" : "save"}</text>
        </box>
        <box paddingX={2} backgroundColor={tokens.surfaceOverlay} onMouseUp={() => void reload()}>
          <text fg={tokens.text}>reload</text>
        </box>
      </box>

      <text fg={tokens.textDim}>{message()}</text>
    </Page>
  );
}
