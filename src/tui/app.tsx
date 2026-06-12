import { createSignal, onMount } from "solid-js";
import { render, useKeyboard, useRenderer } from "@opentui/solid";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider, useBindings, useKeymap } from "@opentui/keymap/solid";

import { checkForUpdate } from "../utils/update-check.ts";

import { DialogProvider, useDialog } from "./components/dialog.tsx";
import { UpdateDialog } from "./components/update-dialog.tsx";
import { COMMAND_PALETTE_COMMAND, CommandPaletteDialog } from "./components/command-palette.tsx";
import { Dashboard } from "./pages/dashboard.tsx";
import { GitHubPage } from "./pages/github.tsx";
import { SettingsPage } from "./pages/settings.tsx";
import { StatusBar } from "./components/status-bar.tsx";
import { tokens } from "./tokens.ts";

type Route = "home" | "github" | "settings";

function Home() {
  const dialog = useDialog();
  const keymap = useKeymap();
  const renderer = useRenderer();
  const [route, setRoute] = createSignal<Route>("home");

  const quit = () => {
    renderer.destroy();
    process.exit(0);
  };

  const commands = () =>
    [
      {
        name: COMMAND_PALETTE_COMMAND,
        title: "Show command palette",
        category: "System",
        hidden: true,
        run: () => dialog.replace(() => <CommandPaletteDialog />),
      },
      {
        name: "github.open",
        title: "Open GitHub",
        desc: "Repository workflows",
        category: "Navigation",
        run: () => {
          setRoute("github");
          dialog.clear();
        },
      },
      {
        name: "settings.open",
        title: "Open Settings",
        desc: "Configuration and setup",
        category: "Navigation",
        run: () => {
          setRoute("settings");
          dialog.clear();
        },
      },
    ].map((command) => ({
      namespace: "palette",
      ...command,
    }));

  useBindings(() => ({
    commands: commands(),
  }));

  useBindings(() => ({
    bindings: [
      {
        key: "mod+p",
        desc: "Command palette",
        group: "Global",
        cmd: COMMAND_PALETTE_COMMAND,
      },
      {
        key: "ctrl+p",
        desc: "Command palette",
        group: "Global",
        cmd: COMMAND_PALETTE_COMMAND,
      },
      {
        key: "q",
        desc: "Quit",
        group: "Global",
        cmd: quit,
      },
      {
        key: "ctrl+c",
        desc: "Quit",
        group: "Global",
        cmd: quit,
      },
    ],
  }));

  useKeyboard((key) => {
    if (key.name === "c" && key.ctrl) {
      key.preventDefault();
      key.stopPropagation();
      quit();
      return;
    }

    if (key.name === "p" && (key.ctrl || key.meta || key.super)) {
      key.preventDefault();
      key.stopPropagation();
      keymap.dispatchCommand(COMMAND_PALETTE_COMMAND);
    }
  });

  onMount(() => {
    checkForUpdate().then((info) => {
      if (info.updateAvailable) {
        dialog.replace(() => <UpdateDialog latestVersion={info.latestVersion} />);
      }
    });
  });

  return (
    <box flexDirection="column" flexGrow={1} backgroundColor={tokens.bg}>
      {route() === "github" ? (
        <GitHubPage />
      ) : route() === "settings" ? (
        <SettingsPage />
      ) : (
        <Dashboard />
      )}
      <StatusBar />
    </box>
  );
}

function App() {
  const renderer = useRenderer();
  const keymap = createDefaultOpenTuiKeymap(renderer);

  return (
    <KeymapProvider keymap={keymap}>
      <DialogProvider>
        <Home />
      </DialogProvider>
    </KeymapProvider>
  );
}

export async function runTUI(): Promise<void> {
  await render(() => <App />, {
    exitOnCtrlC: false,
    backgroundColor: tokens.bg,
    useKittyKeyboard: {},
  });
}
