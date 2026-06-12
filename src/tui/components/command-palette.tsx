import { createMemo } from "solid-js";
import { useKeymap, useKeymapSelector } from "@opentui/keymap/solid";
import { DialogSelect, type DialogSelectOption } from "./dialog-select.tsx";
import { useDialog } from "./dialog.tsx";

/**
 * Command name used to open the global command palette.
 *
 * Register a keybinding that points at this command, or dispatch it directly via
 * `keymap.dispatchCommand(COMMAND_PALETTE_COMMAND)`. The app shell owns the
 * command implementation so feature modules can stay decoupled from the dialog
 * implementation.
 */
export const COMMAND_PALETTE_COMMAND = "command.palette.show";

type PaletteEntry = ReturnType<ReturnType<typeof useKeymap>["getCommandEntries"]>[number];

function isVisiblePaletteCommand(entry: PaletteEntry) {
  return entry.command.hidden !== true && entry.command.name !== COMMAND_PALETTE_COMMAND;
}

/**
 * Dialog that lists reachable keymap commands for quick navigation and actions.
 *
 * To make a command appear here, register it with `useBindings()` and add
 * `namespace: "palette"` to the command object. The palette queries only
 * reachable commands, so commands can still be hidden by keymap conditions,
 * focus targets, or `hidden: true`.
 *
 * Open this dialog through the keymap command registered by the app shell:
 * `keymap.dispatchCommand(COMMAND_PALETTE_COMMAND)`. If a component already has
 * dialog context, it can also call `dialog.replace(() => <CommandPaletteDialog />)`.
 */
export function CommandPaletteDialog() {
  const dialog = useDialog();
  const keymap = useKeymap();
  // `useKeymapSelector` tracks keymap state changes, so the palette refreshes
  // when commands become reachable or unreachable while it is open.
  const entries = useKeymapSelector((keymap) =>
    keymap.getCommandEntries({
      namespace: "palette",
      visibility: "reachable",
      filter: (command) => command.hidden !== true && command.name !== COMMAND_PALETTE_COMMAND,
    }),
  );

  const options = createMemo<DialogSelectOption<string>[]>(() =>
    entries()
      .filter(isVisiblePaletteCommand)
      .map((entry) => ({
        title: typeof entry.command.title === "string" ? entry.command.title : entry.command.name,
        description: typeof entry.command.desc === "string" ? entry.command.desc : undefined,
        category: typeof entry.command.category === "string" ? entry.command.category : undefined,
        value: entry.command.name,
        onSelect: () => {
          // Close the palette before dispatching so route-changing commands do
          // not leave stale dialog UI on top of the next screen.
          dialog.clear();
          keymap.dispatchCommand(entry.command.name);
        },
      })),
  );

  return <DialogSelect title="Commands" options={options()} />;
}
