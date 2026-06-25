# `src/tui/` — TUI presentation layer

Solid JSX components rendered via `@opentui/solid`. Never contains business logic — calls `src/api/` functions for that.

## Structure

| Path                   | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `app.tsx`              | Root component: routes, providers                               |
| `pages/`               | Top-level route pages (dashboard, teamwork, settings, github)   |
| `components/`          | Reusable UI components                                          |
| `components/layout/`   | Page layout primitives (Card, Page, ListItem, AccordionSection) |
| `components/teamwork/` | Teamwork-specific components (TimerBadge, TaskList)             |
| `components/forms/`    | Form field components (TextField, ActionButton, DynamicList)    |
| `tokens.ts`            | Design tokens (colors, spacing)                                 |

## Conventions

### Calling API functions

Components call `src/api/` functions directly — no additional wrapper layer needed. Side effects (HTTP, file I/O) happen in event handlers or `createEffect`, not during render.

### User messaging

Components use `setMessage()` (from the status bar context) for user-facing feedback instead of `console.log`. Error states render inline in the component.

### Testing

Test logic, not layout. Pure helpers and API functions are tested directly. TUI rendering (box position, styling) is the framework's job and should not be tested.
