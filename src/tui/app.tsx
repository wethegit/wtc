import { createSignal, ErrorBoundary, Match, onMount, Switch } from "solid-js";
import { render, useKeyboard, useRenderer } from "@opentui/solid";
import { registerModBindings } from "@opentui/keymap/addons";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider, useBindings, useKeymap } from "@opentui/keymap/solid";

import { checkForUpdate } from "../utils/update-check.ts";
import { loadTuiState } from "../state/manager.ts";
import type { Route, TuiStateEntry } from "../state/schema.ts";

import { DialogProvider, useDialog } from "./components/dialog.tsx";
import { UpdateDialog } from "./components/update-dialog.tsx";
import { COMMAND_PALETTE_COMMAND, CommandPaletteDialog } from "./components/command-palette.tsx";
import { Dashboard } from "./pages/dashboard.tsx";
import { GitHubPage } from "./pages/github.tsx";
import { SettingsPage } from "./pages/settings.tsx";
import { TeamworkPage } from "./pages/teamwork.tsx";
import { StateProvider, useTuiState } from "./components/state-provider.tsx";
import { StatusBarProvider } from "./components/status-bar.tsx";
import { tokens } from "./tokens.ts";

function RouteErrorFallback(props: { error: unknown }) {
  const message = props.error instanceof Error ? props.error.message : "Unexpected TUI error.";

  return (
    <box flexDirection="column" gap={1} padding={1} backgroundColor={tokens.surfaceOverlay}>
      <text fg={tokens.danger}>Something went wrong while rendering this page.</text>
      <text fg={tokens.textDim}>{message}</text>
      <text fg={tokens.textDim}>Use the command palette to navigate elsewhere.</text>
    </box>
  );
}

/** Main TUI screen controller rendered inside the app providers. */
function Home() {
  const dialog = useDialog();
  const keymap = useKeymap();
  const renderer = useRenderer();
  const tuiState = useTuiState();
  const [route, setRoute] = createSignal<Route>(tuiState.state.lastRoute);

  const navigate = (newRoute: Partial<Route>) => {
    const current = route();
    const page = newRoute.page ?? current.page;
    const tab =
      newRoute.tab ?? (newRoute.page && newRoute.page !== current.page ? "index" : current.tab);
    const nextRoute = { page, tab };

    setRoute(nextRoute);
    tuiState.updateState({ lastRoute: nextRoute });
  };

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
        run: () => {
          if (dialog.active()) return;
          dialog.replace(() => <CommandPaletteDialog />);
        },
      },
      {
        name: "github.open",
        title: "Open GitHub",
        desc: "Repository workflows",
        category: "Navigation",
        run: () => {
          navigate({ page: "github" });
          dialog.clear();
        },
      },
      {
        name: "teamwork.open",
        title: "Open Teamwork",
        desc: "My assigned work",
        category: "Navigation",
        run: () => {
          navigate({
            page: "teamwork",
            tab: "my-work",
          });
          dialog.clear();
        },
      },
      {
        name: "teamwork.project.open",
        title: "Open Teamwork Project",
        desc: "Project-specific Teamwork context",
        category: "Navigation",
        run: () => {
          navigate({ page: "teamwork", tab: "project" });
          dialog.clear();
        },
      },
      {
        name: "teamwork.timers.open",
        title: "Open Teamwork Timers",
        desc: "Local timer tracking",
        category: "Navigation",
        run: () => {
          navigate({ page: "teamwork", tab: "timers" });
          dialog.clear();
        },
      },
      {
        name: "settings.open",
        title: "Open Settings",
        desc: "Configuration and setup",
        category: "Navigation",
        run: () => {
          navigate({ page: "settings" });
          dialog.clear();
        },
      },
    ].map((command) => ({
      namespace: "palette",
      ...command,
    }));

  // Palette commands are registered as keymap commands instead of local arrays
  // so other UI can query the same action registry and stay in sync with active
  // route/focus conditions later.
  useBindings(() => ({
    commands: commands(),
  }));

  // Global bindings live at the app shell level. Feature screens should add
  // their own scoped bindings with `useBindings()` when they need local actions.
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
        key: "ctrl+c",
        desc: "Quit",
        group: "Global",
        cmd: quit,
      },
    ],
  }));

  // `useBindings()` is the primary key path. This fallback handles terminals or
  // keyboard protocols that report modifier keys differently and guarantees that
  // Ctrl+C tears down the renderer even when focus is inside an input.
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
      if (!dialog.active()) {
        keymap.dispatchCommand(COMMAND_PALETTE_COMMAND);
      }
    }
  });

  onMount(() => {
    // The update check is non-blocking. If a newer release exists, it enters the
    // same dialog stack used by app actions so modal behavior stays consistent.
    checkForUpdate().then((info) => {
      if (info.updateAvailable) {
        dialog.replace(() => <UpdateDialog latestVersion={info.latestVersion} />);
      }
    });
  });

  return (
    <box flexDirection="column" flexGrow={1} backgroundColor={tokens.bg}>
      <ErrorBoundary fallback={RouteErrorFallback}>
        <Switch fallback={<Dashboard />}>
          <Match when={route().page === "github"}>
            <GitHubPage />
          </Match>
          <Match when={route().page === "teamwork"}>
            <TeamworkPage
              activeTab={route().tab}
              onTabChange={(tab: string) => navigate({ tab })}
            />
          </Match>
          <Match when={route().page === "settings"}>
            <SettingsPage />
          </Match>
        </Switch>
      </ErrorBoundary>
    </box>
  );
}

/** Root provider tree for the Solid OpenTUI app. */
function App(props: { dir: string; initialState: TuiStateEntry }) {
  const renderer = useRenderer();
  const keymap = createDefaultOpenTuiKeymap(renderer);
  registerModBindings(keymap);

  return (
    // Provider order matters: the keymap needs the OpenTUI renderer, and dialogs
    // need the keymap so they can register modal Escape/Return bindings.
    <KeymapProvider keymap={keymap}>
      <DialogProvider>
        <StatusBarProvider
          globalHints={[
            { key: "ctrl+p", label: "commands" },
            { key: "ctrl+c", label: "quit" },
          ]}
        >
          <StateProvider dir={props.dir} initialState={props.initialState}>
            <Home />
          </StateProvider>
        </StatusBarProvider>
      </DialogProvider>
    </KeymapProvider>
  );
}

/**
 * Starts the interactive TUI.
 *
 * The CLI entrypoint calls this when `wtc` is executed without arguments. The
 * renderer disables OpenTUI's default Ctrl+C handling because the app shell owns
 * graceful teardown through global key bindings.
 */
export async function runTUI(): Promise<void> {
  const dir = process.cwd();
  const initialState = await loadTuiState(dir);

  await render(() => <App dir={dir} initialState={initialState} />, {
    exitOnCtrlC: false,
    backgroundColor: tokens.bg,
    useKittyKeyboard: {},
  });
}
