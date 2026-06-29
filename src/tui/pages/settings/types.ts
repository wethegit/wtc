/** Unsaved form state for a project link row. */
export interface ProjectLinkFormState {
  name: string;
  url: string;
}

/** Unsaved form state for a pinned task list row. */
export interface PinnedTaskListFormState {
  name: string;
  id: string;
}

/** Editable Settings page form state grouped by config ownership. */
export interface SettingsFormState {
  /** User-level settings and user-owned secrets. */
  user: {
    workspaceName: string;
    githubRepoOwner: string;
    teamworkApiToken: string;
    githubApiToken: string;
  };
  /** Project-level `.wtc.yaml` settings. */
  project: {
    teamworkProjectId: string;
    links: ProjectLinkFormState[];
    pinnedTaskLists: PinnedTaskListFormState[];
  };
}

/** Settings validation errors keyed by field path (e.g. `"projectLinks.0.name"`). */
export type SettingsFormErrors = Record<string, string>;

/** A focusable control on the Settings page. */
export type SettingsFocusTarget =
  | {
      type: "field";
      name:
        | "workspaceName"
        | "githubRepoOwner"
        | "teamworkApiToken"
        | "githubApiToken"
        | "teamworkProjectId";
    }
  | { type: "projectLink"; index: number; field: "name" | "url" }
  | { type: "pinnedTaskList"; index: number; field: "name" | "id" }
  | {
      type: "listAction";
      list: "projectLinks" | "pinnedTaskLists";
      action: "add" | "remove";
      index?: number;
    }
  | { type: "action"; name: "save" | "reload" };

/** Which accordion sections are expanded on the Settings page. */
export interface SettingsExpandedSections {
  user: boolean;
  project: boolean;
  links: boolean;
  pinnedTaskLists: boolean;
}
