import type { ProjectConfig, UserConfig } from "./schema.ts";

// Bun's YAML parser does not preserve comments, so config writes use explicit
// formatters to keep known setting comments in generated files.

/**
 * Formats user config as YAML with self-documenting comments.
 *
 * Example output:
 * ```yaml
 * # WTC user-level configuration.
 * version: 1
 * workspaceName: "WTC"
 * ```
 */
export function formatUserConfig(config: UserConfig): string {
  return `# WTC user-level configuration.

# Config file format version. Do not edit unless a migration guide tells you to.
version: ${config.version}

# Friendly workspace label shown in WTC.
workspaceName: ${JSON.stringify(config.workspaceName)}
`;
}

/**
 * Formats project config as YAML with self-documenting comments.
 *
 * Example output:
 * ```yaml
 * version: 1
 * project:
 *   links:
 *     - name: Figma
 *       url: https://figma.com/...
 * teamwork:
 *   projectId: "362632"
 *   pinnedTaskLists:
 *     - name: General Tasks
 *       id: 1597639
 * ```
 */
export function formatProjectConfig(config: ProjectConfig): string {
  const links = config.project.links.length
    ? `  links:\n${config.project.links
        .map(
          (link) =>
            `    - name: ${JSON.stringify(link.name)}\n      url: ${JSON.stringify(link.url)}\n`,
        )
        .join("")}`
    : `  links: []\n  # - name: Figma\n  #   url: https://figma.com/...\n`;

  const pinnedTaskLists = config.teamwork.pinnedTaskLists.length
    ? `  pinnedTaskLists:\n${config.teamwork.pinnedTaskLists
        .map(
          (taskList) => `    - name: ${JSON.stringify(taskList.name)}\n      id: ${taskList.id}\n`,
        )
        .join("")}`
    : `  pinnedTaskLists: []\n  # - name: General Tasks\n  #   id: 1597639\n`;

  return `# WTC project-level configuration.

# Config file format version. Do not edit unless a migration guide tells you to.
version: ${config.version}

project:
  # Important links for this project, such as Figma, staging, docs, or dashboards.
${links}

teamwork:
  # Teamwork project ID linked to this repository.
  # Leave empty until this repo is linked to Teamwork.
  projectId: ${config.teamwork.projectId ?? ""}

  # Project-level task lists to surface in the Teamwork Project tab.
${pinnedTaskLists}
`;
}
