import { onMount } from "solid-js";
import { render, useRenderer } from "@opentui/solid";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider, useBindings } from "@opentui/keymap/solid";
import { checkForUpdate } from "../utils/update-check.ts";
import { APP_VERSION } from "../version.ts";
import { DialogProvider, useDialog } from "./components/dialog.tsx";
import { UpdateDialog } from "./components/update-dialog.tsx";
import { Dashboard } from "./pages/dashboard.tsx";
import { StatusBar } from "./components/status-bar.tsx";
import { tokens } from "./tokens.ts";

const REPO = "wethegit/wtc";

function AppContent(props: { version: string }) {
  const dialog = useDialog();
  const renderer = useRenderer();

  useBindings(() => ({
    bindings: [
      {
        key: "q",
        cmd: "quit",
        run: () => renderer.destroy(),
      },
    ],
  }));

  onMount(() => {
    checkForUpdate(props.version).then((info) => {
      if (info.updateAvailable) {
        dialog.replace(() => (
          <UpdateDialog
            currentVersion={props.version}
            latestVersion={info.latestVersion}
            repo={REPO}
          />
        ));
      }
    });
  });

  return (
    <box flexDirection="column" flexGrow={1}>
      <Dashboard version={props.version} />
      <StatusBar />
    </box>
  );
}

function AppShell(props: { version: string }) {
  const renderer = useRenderer();
  const keymap = createDefaultOpenTuiKeymap(renderer);

  return (
    <KeymapProvider keymap={keymap}>
      <DialogProvider>
        <AppContent version={props.version} />
      </DialogProvider>
    </KeymapProvider>
  );
}

export async function launchSolidApp(version = APP_VERSION): Promise<void> {
  await render(() => <AppShell version={version} />, {
    exitOnCtrlC: true,
    backgroundColor: tokens.bg,
  });
}
