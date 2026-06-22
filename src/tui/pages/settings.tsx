import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import { loadResolvedConfig, saveProjectConfig, saveUserConfig } from "../../config/manager.ts";
import type { ProjectConfig, ResolvedConfig, UserConfig } from "../../config/schema.ts";
import { getTeamworkAuthStatus, setTeamworkApiToken } from "../../teamwork/auth.ts";
import type { TeamworkAuthStatus } from "../../teamwork/auth.ts";
import { ActionButton } from "../components/forms/action-button.tsx";
import { Page } from "../components/layout/page.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";
import { PinnedTaskListsSection } from "./settings/pinned-task-lists-section.tsx";
import { ProjectConfigSection } from "./settings/project-config-section.tsx";
import { ProjectLinksSection } from "./settings/project-links-section.tsx";
import type {
  PinnedTaskListFormState,
  ProjectLinkFormState,
  SettingsExpandedSections,
  SettingsFocusTarget,
  SettingsFormErrors,
  SettingsFormState,
} from "./settings/types.ts";
import { UserConfigSection } from "./settings/user-config-section.tsx";

export type {
  PinnedTaskListFormState,
  ProjectLinkFormState,
  SettingsExpandedSections,
  SettingsFocusTarget,
  SettingsFormErrors,
  SettingsFormState,
} from "./settings/types.ts";

const DEFAULT_EXPANDED_SECTIONS: SettingsExpandedSections = {
  user: true,
  project: true,
  links: true,
  pinnedTaskLists: true,
};

const FIRST_FOCUS: SettingsFocusTarget = { type: "field", name: "workspaceName" };

/** Settings route for viewing and editing WTC config files. */
export function SettingsPage() {
  const { setHints } = useStatusBar();
  const [resolved, setResolved] = createSignal<ResolvedConfig | null>(null);
  const [savedForm, setSavedForm] = createSignal<SettingsFormState | null>(null);
  const [form, setForm] = createSignal<SettingsFormState>({
    user: { workspaceName: "", teamworkApiToken: "" },
    project: { teamworkProjectId: "", links: [], pinnedTaskLists: [] },
  });
  const [expandedSections, setExpandedSections] =
    createSignal<SettingsExpandedSections>(DEFAULT_EXPANDED_SECTIONS);
  const [teamworkAuthStatus, setTeamworkAuthStatus] = createSignal<TeamworkAuthStatus>("missing");
  const [message, setMessage] = createSignal("Loading settings...");
  const [isSaving, setIsSaving] = createSignal(false);
  const [focusedTarget, setFocusedTarget] = createSignal<SettingsFocusTarget>(FIRST_FOCUS);
  const errors = createMemo(() => validateSettingsForm(form()));
  const error = createMemo(() => Object.values(errors())[0] ?? null);
  const hasUnsavedChanges = createMemo(() => {
    const saved = savedForm();
    return saved ? JSON.stringify(saved) !== JSON.stringify(form()) : false;
  });

  const toggleSection = (section: keyof SettingsExpandedSections) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const reload = async () => {
    setMessage("Loading settings...");

    try {
      const config = await loadResolvedConfig(process.cwd());
      const nextForm = buildSettingsFormState(config);
      const authStatus = await getTeamworkAuthStatus();
      setResolved(config);
      setTeamworkAuthStatus(authStatus);
      setSavedForm(nextForm);
      setForm(nextForm);
      setFocusedTarget(FIRST_FOCUS);
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
      const teamworkApiToken = parseTeamworkApiTokenInput(form().user.teamworkApiToken);
      await saveUserConfig(nextConfig.user);
      await saveProjectConfig(nextConfig.project, process.cwd());
      // Blank token input means "leave the existing OS secret unchanged".
      if (teamworkApiToken) await setTeamworkApiToken(teamworkApiToken);
      await reload();
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const addProjectLink = () => {
    const index = form().project.links.length;
    setForm((current) => ({
      ...current,
      project: { ...current.project, links: [...current.project.links, { name: "", url: "" }] },
    }));
    setFocusedTarget({ type: "projectLink", index, field: "name" });
  };

  const removeProjectLink = (index: number) => {
    setForm((current) => ({
      ...current,
      project: {
        ...current.project,
        links: current.project.links.filter((_, currentIndex) => currentIndex !== index),
      },
    }));
    setFocusedTarget({ type: "listAction", list: "projectLinks", action: "add" });
  };

  const updateProjectLink = (index: number, patch: Partial<ProjectLinkFormState>) => {
    setForm((current) => ({
      ...current,
      project: {
        ...current.project,
        links: current.project.links.map((link, currentIndex) =>
          currentIndex === index ? { ...link, ...patch } : link,
        ),
      },
    }));
  };

  const addPinnedTaskList = () => {
    const index = form().project.pinnedTaskLists.length;
    setForm((current) => ({
      ...current,
      project: {
        ...current.project,
        pinnedTaskLists: [...current.project.pinnedTaskLists, { name: "", id: "" }],
      },
    }));
    setFocusedTarget({ type: "pinnedTaskList", index, field: "name" });
  };

  const removePinnedTaskList = (index: number) => {
    setForm((current) => ({
      ...current,
      project: {
        ...current.project,
        pinnedTaskLists: current.project.pinnedTaskLists.filter(
          (_, currentIndex) => currentIndex !== index,
        ),
      },
    }));
    setFocusedTarget({ type: "listAction", list: "pinnedTaskLists", action: "add" });
  };

  const updatePinnedTaskList = (index: number, patch: Partial<PinnedTaskListFormState>) => {
    setForm((current) => ({
      ...current,
      project: {
        ...current.project,
        pinnedTaskLists: current.project.pinnedTaskLists.map((taskList, currentIndex) =>
          currentIndex === index ? { ...taskList, ...patch } : taskList,
        ),
      },
    }));
  };

  const pressFocusedAction = () => {
    const target = focusedTarget();

    if (target.type === "action" && target.name === "save") {
      void save();
      return;
    }

    if (target.type === "action" && target.name === "reload") {
      void reload();
      return;
    }

    if (target.type === "listAction" && target.list === "projectLinks" && target.action === "add") {
      addProjectLink();
      return;
    }

    if (
      target.type === "listAction" &&
      target.list === "projectLinks" &&
      target.action === "remove"
    ) {
      removeProjectLink(target.index ?? 0);
      return;
    }

    if (
      target.type === "listAction" &&
      target.list === "pinnedTaskLists" &&
      target.action === "add"
    ) {
      addPinnedTaskList();
      return;
    }

    if (
      target.type === "listAction" &&
      target.list === "pinnedTaskLists" &&
      target.action === "remove"
    ) {
      removePinnedTaskList(target.index ?? 0);
    }
  };

  useBindings(() => ({
    bindings: [
      {
        key: "tab",
        desc: "Next settings field",
        group: "Settings",
        cmd: () => {
          setFocusedTarget((target) => getNextSettingsFocus(target, form(), 1, expandedSections()));
        },
      },
      {
        key: "shift+tab",
        desc: "Previous settings field",
        group: "Settings",
        cmd: () => {
          setFocusedTarget((target) =>
            getNextSettingsFocus(target, form(), -1, expandedSections()),
          );
        },
      },
      {
        key: "down",
        desc: "Next settings field",
        group: "Settings",
        cmd: () => {
          setFocusedTarget((target) => getNextSettingsFocus(target, form(), 1, expandedSections()));
        },
      },
      {
        key: "up",
        desc: "Previous settings field",
        group: "Settings",
        cmd: () => {
          setFocusedTarget((target) =>
            getNextSettingsFocus(target, form(), -1, expandedSections()),
          );
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
      <Show when={resolved()}>
        <box flexDirection="column" gap={1}>
          <UserConfigSection
            form={form()}
            userConfigPath={resolved()?.paths.userConfigPath}
            expanded={expandedSections().user}
            teamworkAuthStatus={teamworkAuthStatus()}
            isFocused={(target) => isSettingsFocusTarget(focusedTarget(), target)}
            onToggle={() => toggleSection("user")}
            onWorkspaceNameInput={(workspaceName) => {
              setForm((current) => ({
                ...current,
                user: { ...current.user, workspaceName },
              }));
            }}
            onTeamworkApiTokenInput={(teamworkApiToken) => {
              setForm((current) => ({
                ...current,
                user: { ...current.user, teamworkApiToken },
              }));
            }}
          />

          <ProjectConfigSection
            form={form()}
            projectConfigPath={resolved()?.paths.projectConfigPath}
            expanded={expandedSections().project}
            errors={errors()}
            isFocused={(target) => isSettingsFocusTarget(focusedTarget(), target)}
            onToggle={() => toggleSection("project")}
            onTeamworkProjectIdInput={(teamworkProjectId) => {
              setForm((current) => ({
                ...current,
                project: { ...current.project, teamworkProjectId },
              }));
            }}
          />

          <ProjectLinksSection
            form={form()}
            expanded={expandedSections().links}
            errors={errors()}
            isFocused={(target) => isSettingsFocusTarget(focusedTarget(), target)}
            onToggle={() => toggleSection("links")}
            onAdd={addProjectLink}
            onRemove={removeProjectLink}
            onUpdate={updateProjectLink}
          />

          <PinnedTaskListsSection
            form={form()}
            expanded={expandedSections().pinnedTaskLists}
            errors={errors()}
            isFocused={(target) => isSettingsFocusTarget(focusedTarget(), target)}
            onToggle={() => toggleSection("pinnedTaskLists")}
            onAdd={addPinnedTaskList}
            onRemove={removePinnedTaskList}
            onUpdate={updatePinnedTaskList}
          />
        </box>
      </Show>

      <box flexDirection="row" gap={1} paddingTop={1} paddingBottom={1}>
        <ActionButton
          name="save-settings"
          label={isSaving() ? "saving" : "save"}
          variant="primary"
          focused={isSettingsFocusTarget(focusedTarget(), { type: "action", name: "save" })}
          onPress={() => void save()}
        />
        <ActionButton
          name="reload-settings"
          label="reload"
          focused={isSettingsFocusTarget(focusedTarget(), { type: "action", name: "reload" })}
          onPress={() => void reload()}
        />
      </box>
    </Page>
  );
}

/** Parses a user-provided teamwork project ID string, returning null when invalid. */
export function parseTeamworkProjectId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Parses a user-provided pinned task list ID string, returning null when invalid. */
export function parsePinnedTaskListId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Blank input intentionally preserves the existing Teamwork token secret. */
export function parseTeamworkApiTokenInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

/** Builds initial Settings form state from a resolved config. */
export function buildSettingsFormState(config: ResolvedConfig): SettingsFormState {
  return {
    user: {
      workspaceName: config.user.workspaceName,
      teamworkApiToken: "",
    },
    project: {
      teamworkProjectId: config.project?.teamwork.projectId?.toString() ?? "",
      links:
        config.project?.project.links.map((link) => ({ name: link.name, url: link.url })) ?? [],
      pinnedTaskLists:
        config.project?.teamwork.pinnedTaskLists.map((taskList) => ({
          name: taskList.name,
          id: taskList.id.toString(),
        })) ?? [],
    },
  };
}

/** Compares two focus targets by value (serializes to JSON). */
export function isSettingsFocusTarget(
  current: SettingsFocusTarget,
  expected: SettingsFocusTarget,
): boolean {
  return JSON.stringify(current) === JSON.stringify(expected);
}

/** Builds the ordered list of focusable controls based on which accordion sections are expanded. */
export function getSettingsFocusOrder(
  state: SettingsFormState,
  expanded: SettingsExpandedSections = DEFAULT_EXPANDED_SECTIONS,
): SettingsFocusTarget[] {
  const order: SettingsFocusTarget[] = [];

  if (expanded.user) {
    order.push({ type: "field", name: "workspaceName" });
    order.push({ type: "field", name: "teamworkApiToken" });
  }

  if (expanded.project) order.push({ type: "field", name: "teamworkProjectId" });

  if (expanded.links) {
    order.push({ type: "listAction", list: "projectLinks", action: "add" });
    for (let index = 0; index < state.project.links.length; index += 1) {
      order.push({ type: "projectLink", index, field: "name" });
      order.push({ type: "projectLink", index, field: "url" });
      order.push({ type: "listAction", list: "projectLinks", action: "remove", index });
    }
  }

  if (expanded.pinnedTaskLists) {
    order.push({ type: "listAction", list: "pinnedTaskLists", action: "add" });
    for (let index = 0; index < state.project.pinnedTaskLists.length; index += 1) {
      order.push({ type: "pinnedTaskList", index, field: "name" });
      order.push({ type: "pinnedTaskList", index, field: "id" });
      order.push({ type: "listAction", list: "pinnedTaskLists", action: "remove", index });
    }
  }

  order.push({ type: "action", name: "save" });
  order.push({ type: "action", name: "reload" });

  return order;
}

/** Cycles to the next or previous Settings control in focus order, wrapping around. */
export function getNextSettingsFocus(
  current: SettingsFocusTarget,
  state: SettingsFormState,
  direction: 1 | -1,
  expanded: SettingsExpandedSections = DEFAULT_EXPANDED_SECTIONS,
): SettingsFocusTarget {
  const order = getSettingsFocusOrder(state, expanded);
  const currentIndex = order.findIndex((target) => isSettingsFocusTarget(target, current));
  const fallbackIndex = direction === 1 ? 0 : order.length - 1;
  const nextIndex =
    currentIndex === -1 ? fallbackIndex : (currentIndex + direction + order.length) % order.length;

  return order[nextIndex] ?? FIRST_FOCUS;
}

/** Returns the first validation error message, or null when the form is valid. */
export function getSettingsFormError(state: SettingsFormState): string | null {
  return Object.values(validateSettingsForm(state))[0] ?? null;
}

/** Validates all Settings form fields and returns error messages keyed by field path. */
export function validateSettingsForm(state: SettingsFormState): SettingsFormErrors {
  const errors: SettingsFormErrors = {};

  if (
    state.project.teamworkProjectId.trim() &&
    parseTeamworkProjectId(state.project.teamworkProjectId) === null
  ) {
    errors.teamworkProjectId = "Teamwork project ID must be a positive integer.";
  }

  for (const [index, link] of state.project.links.entries()) {
    const name = link.name.trim();
    const url = link.url.trim();
    if (!name && !url) continue;
    if (!name) errors[`projectLinks.${index}.name`] = "Project link name is required.";
    if (!url) {
      errors[`projectLinks.${index}.url`] = "Project link URL is required.";
      continue;
    }

    try {
      new URL(url);
    } catch {
      errors[`projectLinks.${index}.url`] = "Project link URL must be valid.";
    }
  }

  for (const [index, taskList] of state.project.pinnedTaskLists.entries()) {
    const name = taskList.name.trim();
    const id = taskList.id.trim();
    if (!name && !id) continue;
    if (!name) errors[`pinnedTaskLists.${index}.name`] = "Pinned task list name is required.";
    if (parsePinnedTaskListId(id) === null) {
      errors[`pinnedTaskLists.${index}.id`] = "Pinned task list ID must be a positive integer.";
    }
  }

  return errors;
}

/** Converts validated Settings form state into UserConfig and ProjectConfig objects, dropping blank dynamic rows. */
export function applySettingsFormState(state: SettingsFormState): {
  user: UserConfig;
  project: ProjectConfig;
} {
  return {
    user: {
      version: 1,
      workspaceName: state.user.workspaceName,
    },
    project: {
      version: 1,
      project: {
        links: state.project.links.flatMap((link) => {
          const name = link.name.trim();
          const url = link.url.trim();
          return name && url ? [{ name, url }] : [];
        }),
      },
      teamwork: {
        projectId: parseTeamworkProjectId(state.project.teamworkProjectId),
        pinnedTaskLists: state.project.pinnedTaskLists.flatMap((taskList) => {
          const name = taskList.name.trim();
          const id = parsePinnedTaskListId(taskList.id);
          return name && id ? [{ name, id }] : [];
        }),
      },
    },
  };
}
