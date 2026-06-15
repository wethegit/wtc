# Phase 3 — Config Setup

**Status: Planned**

Phase 3 establishes WTC's configuration foundation before GitHub, AWS Amplify, and Teamwork integrations depend on it.

## Goal

Create a reliable layered config system with:

- User-level config at `~/.config/wtc/wtc.json`
- Project-level config discovered from the nearest ancestor `.wtc.json`
- A CLI command for inspecting resolved config
- A TUI Settings page for viewing and editing config
- Tests around config loading, validation, discovery, merging, and saving

## Decisions

- `version` is the file format version, not the WTC application version.
- User config filename is `wtc.json`.
- Project config discovery walks upward from the launch directory and uses the nearest `.wtc.json`.
- The Phase 3 user-level placeholder field is `workspaceName`.
- The Phase 3 project-level field is `teamworkProjectId`.
- Settings page edits save explicitly; they do not persist on every keystroke.
- Future migrations should read old versions in memory and write the upgraded format only on explicit save.

## Scope

### In Scope

- User config file creation and validation
- Project config file discovery and validation
- Final resolved config object with file paths
- CLI inspection via `wtc settings`
- Settings TUI route that shows user and project config
- Editing user `workspaceName`
- Editing project `teamworkProjectId`
- Explicit save action in the Settings TUI
- Pure tests for config logic

### Out Of Scope

- Encrypted secrets UI
- GitHub token setup
- Teamwork API key setup
- AWS profile discovery
- TUI rendering/layout tests
- Complex config migrations beyond `version: 1`

## Config Files

### User Config

Path:

```txt
~/.config/wtc/wtc.json
```

Initial schema:

```json
{
  "version": 1,
  "workspaceName": ""
}
```

### Project Config

Path:

```txt
.wtc.json
```

Discovery:

- Start from the directory where `wtc` was launched.
- Walk upward until `.wtc.json` is found.
- Stop at the filesystem root.
- If no file exists, project config is absent.
- Save operations from the Settings TUI should write to the nearest discovered `.wtc.json`.
- If no project config exists, save should create `.wtc.json` in the launch directory.

Initial schema:

```json
{
  "version": 1,
  "teamworkProjectId": null
}
```

## Versioning

`version` tracks the persisted config file format. It does not track the WTC binary version.

Phase 3 should start with `version: 1` for both user and project config files.

Increment the config version only when the persisted shape changes incompatibly or meaningfully, for example:

- Renaming a persisted field
- Moving fields into nested sections
- Changing `teamworkProjectId` from `number | null` to another persisted shape
- Adding a required field without a default
- Changing secret or encryption layout later

Do not increment the config version for:

- Adding optional fields with defaults
- Changing UI labels
- Changing runtime behavior that does not alter the file format

Recommended schema naming:

```ts
export const UserConfigV1Schema = z.object({ ... });
export const ProjectConfigV1Schema = z.object({ ... });

export const UserConfigSchema = UserConfigV1Schema;
export const ProjectConfigSchema = ProjectConfigV1Schema;
```

When a future v2 exists, loaders should migrate v1 in memory and only rewrite the upgraded format when the user explicitly saves.

## Resolved Config

The final config should keep user and project config separate instead of flattening everything into one object. This makes CLI output clearer and avoids ambiguity when two layers eventually have overlapping keys.

```ts
interface ResolvedConfig {
  user: UserConfig;
  project: ProjectConfig | null;
  paths: {
    userConfigPath: string;
    projectConfigPath: string | null;
    projectConfigSearchStart: string;
  };
}
```

## CLI Behavior

### Command

```bash
wtc settings
```

### Output

The command should print:

- User config path
- Project config search start
- Project config path, or `not found`
- Final resolved config as formatted JSON

Example:

```txt
User config: /home/marlon/.config/wtc/wtc.json
Project search start: /home/marlon/dev/example
Project config: /home/marlon/dev/example/.wtc.json

{
  "user": {
    "version": 1,
    "workspaceName": "Marlon"
  },
  "project": {
    "version": 1,
    "teamworkProjectId": 12345
  }
}
```

## TUI Behavior

### Settings Page

The Settings page should replace the current placeholder route.

It should show:

- User config section
- Project config section
- Config file paths
- Unsaved changes indicator
- Save action
- Reload action

### Editable Fields

User config:

- `workspaceName`

Project config:

- `teamworkProjectId`

### Save Model

Use explicit save.

The page should keep form state locally while editing. Nothing should be written until the user triggers Save.

Initial key hints:

- `ctrl/cmd+p` command palette
- `ctrl+s` save settings
- `r` reload settings
- `q` quit

The status bar should become contextual enough to show these hints on the Settings page.

## Implementation Steps

### Step 1 — Define Config Schemas

File: `src/config/schema.ts`

Add separate schemas:

- `UserConfigV1Schema`
- `ProjectConfigV1Schema`
- `UserConfigSchema`
- `ProjectConfigSchema`
- `ConfigPaths` type
- `ResolvedConfig` type

Keep `version: 1` on both file formats.

Use zod defaults for missing optional fields where appropriate.

### Step 2 — Refactor Config Manager

File: `src/config/manager.ts`

Add functions:

```ts
export function getUserConfigPath(): string;
export async function getProjectConfigPath(startDir: string): Promise<string | null>;
export async function initUserConfig(): Promise<void>;
export async function loadUserConfig(): Promise<UserConfig>;
export async function saveUserConfig(config: UserConfig): Promise<void>;
export async function loadProjectConfig(startDir: string): Promise<ProjectConfig | null>;
export async function saveProjectConfig(config: ProjectConfig, startDir: string): Promise<string>;
export async function loadResolvedConfig(startDir: string): Promise<ResolvedConfig>;
```

Notes:

- `saveProjectConfig` should write to a discovered `.wtc.json` when one exists.
- If no project file exists, create `.wtc.json` in `startDir`.
- Avoid using `process.cwd()` directly inside core helpers except as a thin CLI/TUI default. Tests should pass explicit directories.

### Step 3 — Preserve Secret Helpers Carefully

Current `saveSecrets` and `loadSecrets` are based on the older single config shape.

For Phase 3, either:

- remove them if unused, or
- move them behind a future-compatible user config shape only if encrypted secrets should stay in the same user config file.

Recommendation: defer encrypted secrets and remove or park old single-file secret helpers during the refactor unless there is a current caller.

### Step 4 — Add CLI Command

Files:

- `src/cli/parser.ts`
- `src/cli/commands/settings.ts`

Add:

```bash
wtc settings
```

The handler should:

- call `loadResolvedConfig(process.cwd())`
- print paths
- print resolved config JSON

Keep output deterministic for tests.

### Step 5 — Build Settings Page Logic

File: `src/tui/pages/settings.tsx`

Replace placeholder UI with a real Settings page.

The page should:

- load resolved config on mount
- store editable form state in Solid signals
- show load errors in page content or dialog
- save on explicit action
- show whether changes are unsaved

Avoid visual rendering tests. Extract pure helpers for tests if needed:

```ts
export function parseTeamworkProjectId(value: string): number | null;
export function buildSettingsFormState(config: ResolvedConfig): SettingsFormState;
export function applySettingsFormState(state: SettingsFormState): {
  user: UserConfig;
  project: ProjectConfig;
};
```

### Step 6 — Wire Settings Keybindings

Use `useBindings()` inside `SettingsPage`.

Bindings:

- `ctrl+s` or `mod+s` saves
- `r` reloads
- existing global `ctrl/cmd+p` remains from the app shell

Do not add ad-hoc `renderer.keyInput` listeners.

### Step 7 — Make Status Bar Contextual

File: `src/tui/components/status-bar.tsx`

Move from hard-coded text to props:

```ts
interface StatusBarHint {
  key: string;
  label: string;
}

interface StatusBarProps {
  hints: StatusBarHint[];
  message?: string;
}
```

App shell or route state should pass hints.

Initial route hints:

- Dashboard/GitHub: `ctrl/cmd+p commands`, `q quit`
- Settings: `ctrl/cmd+p commands`, `ctrl+s save`, `r reload`, `q quit`

### Step 8 — Update Command Palette Metadata

Keep the existing Settings navigation command.

Consider adding command palette actions only if they can be scoped cleanly to the Settings page:

- `Save Settings`
- `Reload Settings`

Do not overbuild app-wide command state yet.

## Testing Strategy

Test logic only.

### Config Tests

File: `tests/config/schema.test.ts`

Cover:

- valid user config
- valid project config
- defaults
- invalid `version`
- invalid `teamworkProjectId`

File: `tests/config/manager.test.ts`

Cover:

- creates user config at overridden test path
- loads user config
- saves user config
- discovers nearest ancestor `.wtc.json`
- returns null when no project config exists
- creates project config in start directory when saving with no discovered file
- loads resolved config with both layers
- loads resolved config with missing project layer

### CLI Tests

Optional for Phase 3 unless subprocess helpers already exist.

If added, invoke the binary/script as a subprocess and assert output includes paths and JSON.

### TUI Tests

No OpenTUI rendering tests.

Only test extracted pure helpers:

- project ID parsing
- form state construction
- form state to config conversion

## Verification Checklist

Before committing implementation work:

- [ ] `bun run fmt:check`
- [ ] `bun run lint`
- [ ] `bun run check`
- [ ] `bun test`
- [ ] `bun run build`
- [ ] `./dist/wtc-linux-x64 --version`
- [ ] `wtc settings` prints user path, project path/search info, and resolved JSON
- [ ] TUI Settings page loads without blocking startup
- [ ] TUI Settings page can edit `workspaceName`
- [ ] TUI Settings page can edit `teamworkProjectId`
- [ ] TUI Settings page saves only on explicit save
