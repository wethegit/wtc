import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider, useBindings, useKeymapSelector } from "@opentui/keymap/solid";

type KeymapRenderer = Parameters<typeof createDefaultOpenTuiKeymap>[0];

export function createKeymap(renderer: KeymapRenderer) {
  return createDefaultOpenTuiKeymap(renderer);
}

export { KeymapProvider, useBindings, useKeymapSelector };
export type { KeymapRenderer };
