import type { ProjectConfig, UserConfig } from "./schema.ts";

// Bun's YAML parser does not preserve comments, so config writes use explicit
// formatters to keep known setting comments in generated files.
export function formatUserConfig(config: UserConfig): string {
  return `# WTC user-level configuration.

# Config file format version. Do not edit unless a migration guide tells you to.
version: ${config.version}

# Friendly workspace label shown in WTC.
workspaceName: ${JSON.stringify(config.workspaceName)}
`;
}

export function formatProjectConfig(config: ProjectConfig): string {
  const links = config.project.links.length
    ? `  links:\n${config.project.links
        .map(
          (link) =>
            `    - name: ${JSON.stringify(link.name)}\n      url: ${JSON.stringify(link.url)}\n`,
        )
        .join("")}`
    : `  links: []\n  # - name: Figma\n  #   url: https://figma.com/...\n`;

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
`;
}
