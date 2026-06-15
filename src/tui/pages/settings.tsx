import { createMemo, createSignal, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import {
  createDefaultProjectConfig,
  loadResolvedConfig,
  saveProjectConfig,
  saveUserConfig,
} from "../../config/manager.ts";
import type { ProjectConfig, ResolvedConfig, UserConfig } from "../../config/schema.ts";

import { tokens } from "../tokens.ts";

/** Editable Settings page form state. */
export interface SettingsFormState {
  /** User-level workspace label. */
  workspaceName: string;
  /** Project-level Teamwork ID as input text so invalid edits can be displayed. */
  teamworkProjectId: string;
}

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
  if (state.teamworkProjectId.trim() && parseTeamworkProjectId(state.teamworkProjectId) === null) {
    return "Teamwork project ID must be a positive integer.";
  }

  return null;
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
  const error = createMemo(() => getSettingsFormError(form()));
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
    <box flexDirection="column" flexGrow={1} padding={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={tokens.warning}>
          Settings
        </text>
        <text fg={hasUnsavedChanges() ? tokens.warning : tokens.textDim}>
          {hasUnsavedChanges() ? "unsaved changes" : "saved"}
        </text>
      </box>

      {resolved() && (
        <box flexDirection="column" gap={1}>
          <box flexDirection="column" gap={0}>
            <text attributes={TextAttributes.BOLD} fg={tokens.accent}>
              User config
            </text>
            <text fg={tokens.textDim}>{resolved()?.paths.userConfigPath}</text>
            <box flexDirection="row" gap={1}>
              <text fg={tokens.text}>workspaceName</text>
              <input
                width={30}
                value={form().workspaceName}
                placeholder="Workspace name"
                onInput={(value: string) => {
                  setForm((current) => ({ ...current, workspaceName: value }));
                }}
              />
            </box>
          </box>

          <box flexDirection="column" gap={0}>
            <text attributes={TextAttributes.BOLD} fg={tokens.accent}>
              Project config
            </text>
            <text fg={tokens.textDim}>
              {resolved()?.paths.projectConfigPath ??
                ".wtc.json will be created in this directory on save"}
            </text>
            <text fg={tokens.textDim}>
              Search start: {resolved()?.paths.projectConfigSearchStart}
            </text>
            <box flexDirection="row" gap={1}>
              <text fg={tokens.text}>teamworkProjectId</text>
              <input
                width={18}
                value={form().teamworkProjectId}
                placeholder="12345"
                onInput={(value: string) => {
                  setForm((current) => ({ ...current, teamworkProjectId: value }));
                }}
              />
            </box>
          </box>
        </box>
      )}

      {error() && <text fg={tokens.danger}>{error()}</text>}

      <box flexDirection="row" gap={1}>
        <box paddingX={2} backgroundColor={tokens.accent} onMouseUp={() => void save()}>
          <text fg={tokens.textInverse}>{isSaving() ? "saving" : "save"}</text>
        </box>
        <box paddingX={2} backgroundColor={tokens.surfaceOverlay} onMouseUp={() => void reload()}>
          <text fg={tokens.text}>reload</text>
        </box>
      </box>

      <text fg={tokens.textDim}>{message()}</text>
    </box>
  );
}
