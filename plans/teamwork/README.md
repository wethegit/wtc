# Teamwork Plan

Teamwork work is split into focused subphase documents so `plans/PLAN.md` stays readable.

## Subphases

- [5.1 Teamwork Foundation](5.1-foundation.md): auth, project config, Teamwork route, project metadata, and shared Teamwork HTTP client.
- [5.2 Pinned Project Task Lists](5.2-pinned-project-task-lists.md): project-configured task lists that surface recurring tasks like meetings, code reviews, documentation, and project management.
- [5.3 My Work Tasks](5.3-my-work-tasks.md): tasks assigned to the current user across Teamwork.
- [5.4 Timers and Time Tracking](5.4-timers-and-time-tracking.md): active timers, timer actions, task timer indicators, and timesheet access.
- [5.5 Branch and PR Workflow](5.5-branch-and-pr-workflow.md): create branches and draft PRs from Teamwork tasks with timer prompts and useful PR body links.

## Implementation Order

1. Finish Teamwork foundation enough that project metadata and auth status are reliable.
2. Add pinned project task lists to project config and display their tasks in the Project tab.
3. Add shared task list selection behavior and task actions.
4. Add My Work assigned-task view.
5. Add timer read/actions and timer state indicators.
6. Add branch and PR workflows from selected tasks.

## Feature Workflow

Build Teamwork features in the TUI first, then add CLI equivalents after the data shape and user interaction are clear. The TUI is the proving ground for browsing, selection, prompts, and configuration UX; the CLI should mirror workflows once they can be expressed cleanly with IDs, URLs, flags, or current project context.

For each feature:

1. Add or refine the domain API and config shape.
2. Surface the workflow in the TUI.
3. Add selection/actions or Settings editing when the feature needs user interaction.
4. Add the CLI equivalent once the TUI workflow is understood.
5. Keep CLI commands scriptable, with prompts only as an optional TTY enhancement.

## Shared Rules

- Use `get*` for Teamwork read APIs even when data may come from cache.
- Keep shared HTTP behavior in `src/teamwork/client.ts`.
- Do not create one-off private helpers for endpoint workflows unless they represent meaningful domain behavior or are reused.
- Test Teamwork logic and HTTP boundaries, not TUI rendering.
- User-facing key labels should use arrow glyphs such as `↑`, `↓`, `←`, and `→`.

## CLI Hierarchy

Use CLI equivalents after the corresponding TUI workflow exists and the command can be expressed with an ID, URL, flags, or current project context.

- `wtc teamwork project`: show current Teamwork project context.
- `wtc teamwork task-list pinned`: list configured pinned task lists and their tasks.
- `wtc teamwork task-list pin <taskListId> --name "General Tasks"`: add a pinned task list to `.wtc.yaml`.
- `wtc teamwork task-list unpin <taskListId>`: remove a pinned task list from `.wtc.yaml`.
- `wtc teamwork task open <taskId|taskUrl>`: open a task in the browser.
- `wtc teamwork task branch <taskId|taskUrl>`: start the branch workflow from a task.
- `wtc teamwork timer list`: list timers.
- `wtc teamwork timer start <taskId|taskUrl>`: start a timer for a task.
- `wtc teamwork timer pause`: pause the current timer.
- `wtc teamwork timesheet open`: open the user's timesheet in the browser.
