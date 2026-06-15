import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import {
  createDefaultProjectConfig,
  loadResolvedConfig,
  saveProjectConfig,
  saveUserConfig,
} from "../../config/manager.ts";
import type { ProjectConfig, ResolvedConfig, UserConfig } from "../../config/schema.ts";

import { ActionButton } from "../components/forms/action-button.tsx";
import { TextField } from "../components/forms/text-field.tsx";
import { Page } from "../components/layout/page.tsx";
import { Section } from "../components/layout/section.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

/** Editable Settings page form state. */
export interface SettingsFormState {
  /** User-level workspace label. */
  workspaceName: string;
  /** Project-level Teamwork ID as input text so invalid edits can be displayed. */
  teamworkProjectId: string;
}

const SETTINGS_FOCUS_ORDER = ["workspaceName", "teamworkProjectId", "save", "reload"] as const;

type SettingsFocusTarget = (typeof SETTINGS_FOCUS_ORDER)[number];

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

/** Returns the next focusable Settings control, wrapping at either end. */
export function getNextSettingsFocus(
  current: SettingsFocusTarget,
  direction: 1 | -1,
): SettingsFocusTarget {
  const currentIndex = SETTINGS_FOCUS_ORDER.indexOf(current);
  const nextIndex =
    (currentIndex + direction + SETTINGS_FOCUS_ORDER.length) % SETTINGS_FOCUS_ORDER.length;

  return SETTINGS_FOCUS_ORDER[nextIndex] ?? SETTINGS_FOCUS_ORDER[0];
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
  const { setHints } = useStatusBar();
  const [resolved, setResolved] = createSignal<ResolvedConfig | null>(null);
  const [savedForm, setSavedForm] = createSignal<SettingsFormState | null>(null);
  const [form, setForm] = createSignal<SettingsFormState>({
    workspaceName: "",
    teamworkProjectId: "",
  });
  const [message, setMessage] = createSignal("Loading settings...");
  const [isSaving, setIsSaving] = createSignal(false);
  const [focusedTarget, setFocusedTarget] = createSignal<SettingsFocusTarget>("workspaceName");
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
      setFocusedTarget("workspaceName");
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

  const pressFocusedAction = () => {
    if (focusedTarget() === "save") {
      void save();
      return;
    }

    if (focusedTarget() === "reload") {
      void reload();
    }
  };

  useBindings(() => ({
    bindings: [
      {
        key: "tab",
        desc: "Next settings field",
        group: "Settings",
        cmd: () => {
          setFocusedTarget((target) => getNextSettingsFocus(target, 1));
        },
      },
      {
        key: "shift+tab",
        desc: "Previous settings field",
        group: "Settings",
        cmd: () => {
          setFocusedTarget((target) => getNextSettingsFocus(target, -1));
        },
      },
      {
        key: "down",
        desc: "Next settings field",
        group: "Settings",
        cmd: () => {
          setFocusedTarget((target) => getNextSettingsFocus(target, 1));
        },
      },
      {
        key: "up",
        desc: "Previous settings field",
        group: "Settings",
        cmd: () => {
          setFocusedTarget((target) => getNextSettingsFocus(target, -1));
        },
      },
      {
        key: "return",
        desc: "Press focused settings action",
        group: "Settings",
        cmd: pressFocusedAction,
      },
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
        key: "ctrl+r",
        desc: "Reload settings",
        group: "Settings",
        cmd: reload,
      },
    ],
  }));

  onMount(() => {
    void reload();
    setHints([
      { key: "tab/↑↓", label: "controls" },
      { key: "enter", label: "press" },
      { key: "ctrl+s", label: "save" },
      { key: "ctrl+r", label: "reload" },
    ]);
  });

  onCleanup(() => setHints([]));

  return (
    <Page
      title="Settings"
      status={
        <text fg={hasUnsavedChanges() ? tokens.warning : tokens.textDim}>
          {hasUnsavedChanges() ? "unsaved changes" : "saved"}
        </text>
      }
      message={<text fg={error() ? tokens.danger : tokens.textDim}>{message()}</text>}
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
              focused={focusedTarget() === "workspaceName"}
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
              focused={focusedTarget() === "teamworkProjectId"}
              onInput={(value) => {
                setForm((current) => ({ ...current, teamworkProjectId: value }));
              }}
            />
          </Section>
        </box>
      )}

      <box flexDirection="row" gap={1} paddingTop={1} paddingBottom={1}>
        <ActionButton
          name="save-settings"
          label={isSaving() ? "saving" : "save"}
          variant="primary"
          focused={focusedTarget() === "save"}
          onPress={() => void save()}
        />
        <ActionButton
          name="reload-settings"
          label="reload"
          focused={focusedTarget() === "reload"}
          onPress={() => void reload()}
        />
      </box>
    </Page>
  );
}
