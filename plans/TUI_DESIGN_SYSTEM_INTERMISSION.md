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

1. Button — implemented, awaiting broader visual review
2. Field — implemented, awaiting visual review
3. Page Header — not started
4. Page Footer — not started
5. Section Head — not started
6. Subsection Head — not started
7. Subsection Field Group — not started
8. Tab — not started
9. Dialog Modal — not started
10. List Item — not started
11. Icons — not started

This order can change if a page rollout exposes a better dependency order.

## Token Strategy

- Treat Figma `tokens.json` as the source of truth for TUI colors.
- Keep `src/tui/tokens.ts` as a single token system that mirrors the Figma color tokens with TypeScript-friendly names.
- Do not keep a separate brand palette or contextual aliases such as `surface`, `textDim`, or `warning`.
- Add new color tokens only when they exist in the Figma design system or the user explicitly approves adding one.
- OpenTUI spacing is customizable through layout props such as `padding`, `gap`, `margin`, `width`, and `height`, but the unit is terminal cells rather than pixels.
- Use the Figma spacing scale as source values in multiples of 4 (`sm = 4`, `md = 8`, etc.) and translate to terminal-cell values per component instead of blindly applying pixel values.
- Typography is more limited than web UI: terminal font family and rendering come from the user's terminal, but we can still control text attributes, color, casing, labels, and hierarchy.

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

## Progress Checklist

Use this section as the recovery point for future sessions. Update it after each reviewed component/state.

### Setup

- [x] Create design-system intermission plan.
- [x] Link intermission from `plans/PLAN.md`.
- [x] Exclude `_specs/**` from formatter, linter, and typecheck tooling.
- [x] Add Figma component-system color tokens to `src/tui/tokens.ts`.
- [x] Add WTC brand color tokens to `src/tui/tokens.ts`.
- [x] Add WTC navy background token (`#101820`) to `src/tui/tokens.ts`.
- [x] Remove old palette/contextual token aliases from `src/tui/tokens.ts`.
- [x] Convert TUI code to use the single token system directly.

### Button

Source references:

- Screenshot: `_specs/designs/component-system/button.png`
- CSS requested per state from user before implementation.

Implementation notes:

- [x] Rename `ActionButton` to Figma-aligned `Button`.
- [x] Move `src/tui/components/forms/action-button.tsx` to `src/tui/components/forms/button.tsx`.
- [x] Update all imports/usages to `Button`.
- [x] Simplify away `variant`; Button now uses color options only.
- [x] Use background-color-only buttons; no OpenTUI borders for button styling.
- [x] Make Settings `save` button yellow only when there are unsaved changes.

Implemented states:

- [x] Button default color, default state: background `white65`, text `black`.
- [x] Button default color, focused state: background `focusBlue`, text `black`.
- [x] Button default color, disabled state: background `white46`, text `black`.
- [x] Button yellow color: background `wtcYellow`, text `black`.
- [x] Button secondary color: background `black80`, text `white`.
- [x] Button secondary shares default focused/disabled state behavior.

Current Button decision:

- Button colors are `default`, `yellow`, and `secondary`.
- Focused and disabled states are shared across all colors.
- Secondary is no longer an outlined/bordered variant because OpenTUI borders add layout height and draw as terminal glyphs.

Button rollout completed so far:

- [x] `ConfirmDialog` actions.
- [x] `DynamicList` add/remove actions.
- [x] `SettingsPage` save/reload actions.
- [x] `SystemPage` log/cache actions.
- [x] `GitHubPage` create repo action.

Button follow-up candidates:

- [ ] Review remaining page screenshots for any missing Button usage.
- [ ] Add icon/content slot only if a future CSS state or icon spec requires it.
- [ ] Revisit exact spacing after page-level layout components are updated.

### Field

- [x] Ask user for CSS for `Field` empty, focused, and filled/unfocused states.
- [x] Rename `TextField` to Figma-aligned `Field`.
- [x] Implement shared `Field` empty, focused, and filled/unfocused states.
- [x] Restore full Field input borders and stretch inputs to available container width.
- [x] Roll out to Settings fields through the shared component.
- [ ] Review/fix until approved.
- [ ] Ask user for CSS for next `Field` state.

### Page Header

- [ ] Ask user for CSS for `Page Header` default state.
- [ ] Implement reusable page header styling.
- [ ] Roll out through `Page` if possible.
- [ ] Review/fix until approved.

### Page Footer

- [ ] Ask user for CSS for `Page Footer` default state.
- [ ] Implement reusable page footer/status-bar styling.
- [ ] Review/fix until approved.

### Section Head

- [ ] Ask user for CSS for `Section Head` default state.
- [ ] Implement or update section heading primitive.
- [ ] Review/fix until approved.

### Subsection Head

- [ ] Ask user for CSS for `Subsection Head` default state.
- [ ] Implement or update subsection heading primitive.
- [ ] Review/fix until approved.

### Subsection Field Group

- [ ] Ask user for CSS for `Subsection Field Group` default state.
- [ ] Implement or update grouping primitive.
- [ ] Review/fix until approved.

### Tab

- [ ] Ask user for CSS for `Tab` default state.
- [ ] Implement default state.
- [ ] Review/fix until approved.
- [ ] Ask user for CSS for selected/focused states.

### Dialog Modal

- [ ] Ask user for CSS for `Dialog Modal` default state.
- [ ] Update shared dialog components.
- [ ] Review/fix until approved.

### List Item

- [ ] Ask user for CSS for `List Item` default state.
- [ ] Update shared `ListItem`.
- [ ] Review/fix until approved.

### Icons

- [ ] Confirm icon source files or glyph mapping strategy.
- [ ] Add TUI icon map only when first needed.
- [ ] Review/fix until approved.

## Verification

After each approved component/variant pass:

- `bun run check`
- `bun run lint`
- `bun run fmt:check`
- Manual TUI visual review against the relevant Figma export.

## Current Checkpoint

Button is acceptable for now after switching from variants to color-only background buttons.

Field empty, focused, and filled/unfocused states are implemented in `src/tui/components/forms/field.tsx` and rolled out to Settings.

Next recommended item: visual review of `Field` in Settings, then move to `Page Header` default state.
