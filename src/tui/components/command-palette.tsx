import { createMemo } from "solid-js";
import { useKeymap, useKeymapSelector } from "@opentui/keymap/solid";
import { DialogSelect, type DialogSelectOption } from "./dialog-select.tsx";
import { useDialog } from "./dialog.tsx";

export const COMMAND_PALETTE_COMMAND = "command.palette.show";

type PaletteEntry = ReturnType<ReturnType<typeof useKeymap>["getCommandEntries"]>[number];

function isVisiblePaletteCommand(entry: PaletteEntry) {
  return entry.command.hidden !== true && entry.command.name !== COMMAND_PALETTE_COMMAND;
}

export function CommandPaletteDialog() {
  const dialog = useDialog();
  const keymap = useKeymap();
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
          dialog.clear();
          keymap.dispatchCommand(entry.command.name);
        },
      })),
  );

  return <DialogSelect title="Commands" options={options()} />;
}
