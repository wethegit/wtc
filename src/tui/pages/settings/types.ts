export interface ProjectLinkFormState {
  name: string;
  url: string;
}

export interface PinnedTaskListFormState {
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

export interface SettingsExpandedSections {
  user: boolean;
  project: boolean;
  links: boolean;
  pinnedTaskLists: boolean;
}
