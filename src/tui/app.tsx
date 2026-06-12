import { createSignal, onMount } from "solid-js";
import { render, useRenderer } from "@opentui/solid";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider, useBindings } from "@opentui/keymap/solid";
import { checkForUpdate } from "../utils/update-check.ts";
import { APP_VERSION } from "../version.ts";
import { DialogProvider, useDialog } from "./components/dialog.tsx";
import { UpdateDialog } from "./components/update-dialog.tsx";
import { CommandPalette, type CommandEntry } from "./components/command-palette.tsx";
import { Dashboard } from "./pages/dashboard.tsx";
import { GitHubPage } from "./pages/github.tsx";
import { SettingsPage } from "./pages/settings.tsx";
import { StatusBar } from "./components/status-bar.tsx";
import { tokens } from "./tokens.ts";

const REPO = "wethegit/wtc";
type Route = "home" | "github" | "settings";

function AppContent(props: { version: string }) {
  const dialog = useDialog();
  const renderer = useRenderer();
  const [route, setRoute] = createSignal<Route>("home");

  const commands = (): CommandEntry[] => [
    {
      id: "github.open",
      title: "Open GitHub",
      description: "Repository workflows",
      onSelect: () => setRoute("github"),
    },
    {
      id: "settings.open",
      title: "Open Settings",
      description: "Configuration and setup",
      onSelect: () => setRoute("settings"),
    },
  ];

  const openCommandPalette = () => {
    dialog.replace(() => <CommandPalette entries={commands()} onClose={() => dialog.clear()} />);
  };

  useBindings(() => ({
    bindings: [
      {
        key: "mod+p",
        desc: "Command palette",
        group: "Global",
        cmd: openCommandPalette,
      },
      {
        key: "ctrl+p",
        desc: "Command palette",
        group: "Global",
        cmd: openCommandPalette,
      },
      {
        key: "q",
        desc: "Quit",
        group: "Global",
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
      {route() === "github" ? (
        <GitHubPage />
      ) : route() === "settings" ? (
        <SettingsPage />
      ) : (
        <Dashboard version={props.version} />
      )}
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
