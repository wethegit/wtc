import { tokens } from "../tokens.ts";

/**
 * Bottom status strip for global hints and contextual state.
 *
 * Today this is intentionally static because the MVP has only global actions.
 * Future feature screens should make this component data-driven, for example by
 * passing status segments and active key hints from the current route. Keep this
 * component as the single place that owns status bar styling so pages only
 * describe what should be shown.
 */
export function StatusBar() {
  return (
    <box
      position="absolute"
      bottom={0}
      left={0}
      width="100%"
      paddingX={1}
      backgroundColor={tokens.surfaceOverlay}
    >
      <text fg={tokens.textDim}>ctrl/cmd+p commands · q quit</text>
    </box>
  );
}
