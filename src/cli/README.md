# `src/cli/` — CLI presentation layer

Parses CLI arguments via yargs and prints output to stdout. Never contains business logic — calls `src/api/` functions for that.

## Structure

| Path                    | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `parser.ts`             | yargs setup: registers all top-level commands                      |
| `commands/*-command.ts` | yargs command wiring (builder, handler) for each top-level command |
| `commands/*.ts`         | CLI handler functions: call api/, format output, print             |

## Conventions

### Handler pattern

Each handler function accepts a plain args object, calls the API layer, and prints a display-safe result:

```typescript
export async function teamworkTimerList(args: { json: boolean }): Promise<void> {
  const timers = await getMyTimers();
  console.log(formatTimerListOutput(timers, { json: args.json }));
}
```

### Output

All user-facing output goes through `console.log`. Pure formatting functions live alongside the handler and include a format example in their doc comment.

### Yargs wiring

Command modules in `*-command.ts` files define the yargs tree. Each module:

- Declares positional args and options in `builder`
- Calls the handler function in `handler`, passing destructured args
- Parent commands with subcommands get `handler: () => {}`
