import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import { loadResolvedConfig, saveProjectConfig, saveUserConfig } from "../../config/manager.ts";
import type { ProjectConfig, ResolvedConfig, UserConfig } from "../../config/schema.ts";
import { getTeamworkAuthStatus, setTeamworkApiToken } from "../../teamwork/auth.ts";
import type { TeamworkAuthStatus } from "../../teamwork/auth.ts";
import { ActionButton } from "../components/forms/action-button.tsx";
import { DynamicList } from "../components/forms/dynamic-list.tsx";
import { TextField } from "../components/forms/text-field.tsx";
import { AccordionSection } from "../components/layout/accordion-section.tsx";
import { Page } from "../components/layout/page.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

interface ProjectLinkFormState {
  name: string;
  url: string;
}

interface PinnedTaskListFormState {
  name: string;
  id: string;
}

/** Editable Settings page form state grouped by config ownership. */
export interface SettingsFormState {
  /** User-level settings and user-owned secrets. */
  user: {
    workspaceName: string;
    teamworkApiToken: string;
  };
  /** Project-level `.wtc.yaml` settings. */
  project: {
    teamworkProjectId: string;
    links: ProjectLinkFormState[];
    pinnedTaskLists: PinnedTaskListFormState[];
  };
}

export type SettingsFormErrors = Record<string, string>;

export type SettingsFocusTarget =
  | { type: "field"; name: "workspaceName" | "teamworkApiToken" | "teamworkProjectId" }
  | { type: "projectLink"; index: number; field: "name" | "url" }
  | { type: "pinnedTaskList"; index: number; field: "name" | "id" }
  | {
      type: "listAction";
      list: "projectLinks" | "pinnedTaskLists";
      action: "add" | "remove";
      index?: number;
    }
  | { type: "action"; name: "save" | "reload" };

interface SettingsExpandedSections {
  user: boolean;
  project: boolean;
  links: boolean;
  pinnedTaskLists: boolean;
}

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
          <AccordionSection
            title="User config"
            description={resolved()?.paths.userConfigPath}
            expanded={expandedSections().user}
            onToggle={() => toggleSection("user")}
          >
            <box flexDirection="column" gap={1}>
              <TextField
                name="workspaceName"
                label="workspaceName"
                value={form().user.workspaceName}
                placeholder="Workspace name"
                description="User-level placeholder while broader settings are designed."
                focused={isSettingsFocusTarget(focusedTarget(), {
                  type: "field",
                  name: "workspaceName",
                })}
                onInput={(value) => {
                  setForm((current) => ({
                    ...current,
                    user: { ...current.user, workspaceName: value },
                  }));
                }}
              />

              <box
                flexDirection="column"
                gap={1}
                paddingLeft={1}
                border={["left"]}
                borderColor={tokens.accentSoft}
              >
                <box flexDirection="column" gap={0}>
                  <text fg={tokens.text}>Teamwork auth</text>
                  <text fg={tokens.textDim}>Status: {teamworkAuthStatus()}</text>
                </box>
                <TextField
                  name="teamworkApiToken"
                  label="teamworkApiToken"
                  value={form().user.teamworkApiToken}
                  width={40}
                  placeholder="Paste new token"
                  description="User-level secret stored outside YAML; this field clears after save."
                  focused={isSettingsFocusTarget(focusedTarget(), {
                    type: "field",
                    name: "teamworkApiToken",
                  })}
                  onInput={(value) => {
                    setForm((current) => ({
                      ...current,
                      user: { ...current.user, teamworkApiToken: value },
                    }));
                  }}
                />
              </box>
            </box>
          </AccordionSection>

          <AccordionSection
            title="Project config"
            description={[
              resolved()?.paths.projectConfigPath ??
                ".wtc.yaml will be created in this directory on save",
            ]}
            expanded={expandedSections().project}
            onToggle={() => toggleSection("project")}
          >
            <TextField
              name="teamworkProjectId"
              label="teamworkProjectId"
              value={form().project.teamworkProjectId}
              width={18}
              placeholder="12345"
              description="Leave blank until this repo is linked to Teamwork."
              error={errors().teamworkProjectId}
              focused={isSettingsFocusTarget(focusedTarget(), {
                type: "field",
                name: "teamworkProjectId",
              })}
              onInput={(value) => {
                setForm((current) => ({
                  ...current,
                  project: { ...current.project, teamworkProjectId: value },
                }));
              }}
            />
          </AccordionSection>

          <AccordionSection
            title="Project links"
            status={`${form().project.links.length}`}
            expanded={expandedSections().links}
            onToggle={() => toggleSection("links")}
          >
            <DynamicList
              items={form().project.links}
              emptyMessage="No project links configured."
              addLabel="add link"
              addFocused={isSettingsFocusTarget(focusedTarget(), {
                type: "listAction",
                list: "projectLinks",
                action: "add",
              })}
              onAdd={addProjectLink}
              removeFocused={(index) =>
                isSettingsFocusTarget(focusedTarget(), {
                  type: "listAction",
                  list: "projectLinks",
                  action: "remove",
                  index,
                })
              }
              onRemove={removeProjectLink}
              renderItem={(link, index) => (
                <box flexDirection="column" gap={1}>
                  <TextField
                    name={`project-link-${index}-name`}
                    label="name"
                    value={link.name}
                    placeholder="Figma"
                    error={errors()[`projectLinks.${index}.name`]}
                    focused={isSettingsFocusTarget(focusedTarget(), {
                      type: "projectLink",
                      index,
                      field: "name",
                    })}
                    onInput={(value) => {
                      setForm((current) => ({
                        ...current,
                        project: {
                          ...current.project,
                          links: current.project.links.map((currentLink, currentIndex) =>
                            currentIndex === index ? { ...currentLink, name: value } : currentLink,
                          ),
                        },
                      }));
                    }}
                  />
                  <TextField
                    name={`project-link-${index}-url`}
                    label="url"
                    value={link.url}
                    placeholder="https://figma.com/..."
                    error={errors()[`projectLinks.${index}.url`]}
                    focused={isSettingsFocusTarget(focusedTarget(), {
                      type: "projectLink",
                      index,
                      field: "url",
                    })}
                    onInput={(value) => {
                      setForm((current) => ({
                        ...current,
                        project: {
                          ...current.project,
                          links: current.project.links.map((currentLink, currentIndex) =>
                            currentIndex === index ? { ...currentLink, url: value } : currentLink,
                          ),
                        },
                      }));
                    }}
                  />
                </box>
              )}
            />
          </AccordionSection>

          <AccordionSection
            title="Teamwork pinned task lists"
            status={`${form().project.pinnedTaskLists.length}`}
            expanded={expandedSections().pinnedTaskLists}
            onToggle={() => toggleSection("pinnedTaskLists")}
          >
            <DynamicList
              items={form().project.pinnedTaskLists}
              emptyMessage="No pinned task lists configured."
              addLabel="add task list"
              addFocused={isSettingsFocusTarget(focusedTarget(), {
                type: "listAction",
                list: "pinnedTaskLists",
                action: "add",
              })}
              onAdd={addPinnedTaskList}
              removeFocused={(index) =>
                isSettingsFocusTarget(focusedTarget(), {
                  type: "listAction",
                  list: "pinnedTaskLists",
                  action: "remove",
                  index,
                })
              }
              onRemove={removePinnedTaskList}
              renderItem={(taskList, index) => (
                <box flexDirection="column">
                  <TextField
                    name={`pinned-task-list-${index}-name`}
                    label="name"
                    value={taskList.name}
                    placeholder="General Tasks"
                    error={errors()[`pinnedTaskLists.${index}.name`]}
                    focused={isSettingsFocusTarget(focusedTarget(), {
                      type: "pinnedTaskList",
                      index,
                      field: "name",
                    })}
                    onInput={(value) => {
                      setForm((current) => ({
                        ...current,
                        project: {
                          ...current.project,
                          pinnedTaskLists: current.project.pinnedTaskLists.map(
                            (currentTaskList, currentIndex) =>
                              currentIndex === index
                                ? { ...currentTaskList, name: value }
                                : currentTaskList,
                          ),
                        },
                      }));
                    }}
                  />
                  <TextField
                    name={`pinned-task-list-${index}-id`}
                    label="id"
                    value={taskList.id}
                    width={18}
                    placeholder="1597639"
                    error={errors()[`pinnedTaskLists.${index}.id`]}
                    focused={isSettingsFocusTarget(focusedTarget(), {
                      type: "pinnedTaskList",
                      index,
                      field: "id",
                    })}
                    onInput={(value) => {
                      setForm((current) => ({
                        ...current,
                        project: {
                          ...current.project,
                          pinnedTaskLists: current.project.pinnedTaskLists.map(
                            (currentTaskList, currentIndex) =>
                              currentIndex === index
                                ? { ...currentTaskList, id: value }
                                : currentTaskList,
                          ),
                        },
                      }));
                    }}
                  />
                </box>
              )}
            />
          </AccordionSection>
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

export function parseTeamworkProjectId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

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

export function isSettingsFocusTarget(
  current: SettingsFocusTarget,
  expected: SettingsFocusTarget,
): boolean {
  return JSON.stringify(current) === JSON.stringify(expected);
}

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

export function getSettingsFormError(state: SettingsFormState): string | null {
  return Object.values(validateSettingsForm(state))[0] ?? null;
}

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
