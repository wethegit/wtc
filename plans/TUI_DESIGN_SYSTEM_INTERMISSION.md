# TUI Design System Intermission

## Goal

Introduce the Figma component system into the OpenTUI Solid interface while keeping the work incremental, reviewable, and grounded in exported design specs.

This is an intermission before continuing the main product roadmap. The work should improve the existing reusable TUI components first so pages update naturally through shared primitives.

## Source Material

- Component system exports: `_specs/designs/component-system/`
- Page exports: `_specs/designs/pages/`
- Figma token export: `_specs/designs/component-system/tokens.json`
- Optional CSS exports: requested per component and per state before implementation.

## Design Translation Rules

- Figma component names should drive TUI component names where practical.
- Prefer Figma names over existing implementation-specific names when renaming improves clarity.
- Example: rename the current `ActionButton` concept toward `Button` instead of preserving `ActionButton` long term.
- Keep terminal constraints explicit: SVGs and CSS do not render directly in OpenTUI; translate them into tokens, glyphs, borders, layout, and text attributes.
- Use screenshots for visual intent and CSS for exact state details.
- Do not match designs from screenshots alone unless CSS is unavailable and the user explicitly approves proceeding without it.

## Workflow Rules

Work one component and one variant/state at a time.

For every component variant/state:

1. Decide the component and exact variant/state to tackle.
2. Ask the user for the CSS for that component and variant/state.
3. Translate the CSS into OpenTUI-compatible styling.
4. Update the reusable component.
5. Roll it out to pages if the component is not already used there.
6. Stop for visual review.
7. Apply feedback fixes.
8. Repeat review/fix until approved.
9. Move to the next variant/state or next component.

Do not batch multiple components in one implementation pass unless the user explicitly asks for it.

## Naming Migration

Use Figma naming as the target naming system, but migrate safely:

- Prefer adding/renaming one component at a time.
- Update imports at the same time as a component rename.
- Avoid compatibility wrappers unless there is a concrete need.
- Keep filenames kebab-case, for example `button.tsx`.
- Keep exported component/type names PascalCase, for example `Button` and `ButtonProps`.

## Initial Component Order

1. Button
2. Field
3. Page Header
4. Page Footer
5. Section Head
6. Subsection Head
7. Subsection Field Group
8. Tab
9. Dialog Modal
10. List Item
11. Icons

This order can change if a page rollout exposes a better dependency order.

## Token Strategy

- Treat Figma `tokens.json` as source/reference data, not runtime configuration for now.
- Translate Figma colors into `src/tui/tokens.ts` semantic roles.
- Add new semantic tokens only when a component needs them.
- Keep raw colors in a palette section and make components consume semantic tokens.
- If CSS exports include spacing/type values, translate those into TUI layout constants or semantic tokens only when reused.

## Icon Strategy

- SVGs are acceptable as source assets/reference.
- OpenTUI text UI should use terminal-friendly glyphs, ASCII, Unicode symbols, or documented Nerd Font glyphs if we decide to accept that dependency.
- Add a small TUI icon map only when the first icon-bearing component is implemented.
- Keep icon names aligned with Figma icon names where practical.

## Rollout Strategy

- Start with existing reusable components so pages update automatically.
- If a Figma component does not map to an existing primitive, add the smallest reusable primitive that matches the design.
- Apply the system first to pages represented in the exports: Settings and Teamwork.
- Preserve behavior while changing presentation.

## Verification

After each approved component/variant pass:

- `bun run check`
- `bun run lint`
- `bun run fmt:check`
- Manual TUI visual review against the relevant Figma export.

## First Step

Start with `Button` default/primary state.

Before implementation, ask for the CSS for the exact Button state being implemented.
