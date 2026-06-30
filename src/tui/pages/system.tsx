import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import {
  clearCache,
  deleteCacheFile,
  type CacheFileInfo,
  listCacheFiles,
} from "../../api/cache/manager.ts";
import { clearLogFile, getLogPath, logInfo, openLogFile } from "../../api/logs/manager.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { ActionButton } from "../components/forms/action-button.tsx";
import { Card } from "../components/layout/card.tsx";
import { Page } from "../components/layout/page.tsx";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

type SystemFocusTarget =
  | { type: "button"; name: "open-log" }
  | { type: "button"; name: "clear-log" }
  | { type: "file-action"; name: string; action: "open" }
  | { type: "file-action"; name: string; action: "delete" }
  | { type: "button"; name: "clear-all-cache" };

const FIRST_FOCUS: SystemFocusTarget = { type: "button", name: "open-log" };

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryColor(category: "cache" | "state" | "log") {
  switch (category) {
    case "cache":
      return tokens.warning;
    case "state":
      return tokens.info;
    case "log":
      return tokens.textDim;
  }
}

function isSystemFocusTarget(a: SystemFocusTarget, b: SystemFocusTarget): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getSystemFocusOrder(files: CacheFileInfo[]): SystemFocusTarget[] {
  const order: SystemFocusTarget[] = [
    { type: "button", name: "open-log" },
    { type: "button", name: "clear-log" },
  ];
  for (const file of files) {
    if (!file.exists) continue;
    order.push({ type: "file-action", name: file.descriptor.name, action: "open" });
    order.push({ type: "file-action", name: file.descriptor.name, action: "delete" });
  }
  order.push({ type: "button", name: "clear-all-cache" });
  return order;
}

function getNextSystemFocus(
  current: SystemFocusTarget,
  files: CacheFileInfo[],
  direction: 1 | -1,
): SystemFocusTarget {
  const order = getSystemFocusOrder(files);
  if (!order.length) return FIRST_FOCUS;
  const currentIndex = order.findIndex((t) => isSystemFocusTarget(t, current));
  const fallbackIndex = direction === 1 ? 0 : order.length - 1;
  const nextIndex =
    currentIndex === -1 ? fallbackIndex : (currentIndex + direction + order.length) % order.length;
  return order[nextIndex] ?? FIRST_FOCUS;
}

/** System route for managing logs and cache files. */
export function SystemPage() {
  const dialog = useDialog();
  const { setHints } = useStatusBar();
  const [message, setMessage] = createSignal("Loading...");
  const [logSize, setLogSize] = createSignal(0);
  const [cacheFiles, setCacheFiles] = createSignal<CacheFileInfo[]>([]);
  const [focusedTarget, setFocusedTarget] = createSignal<SystemFocusTarget>(FIRST_FOCUS);

  const refreshLogInfo = async () => {
    try {
      const fileStat = await Bun.file(getLogPath()).stat();
      setLogSize(fileStat.size);
    } catch {
      setLogSize(0);
    }
  };

  const loadData = async () => {
    setMessage("Loading system info...");
    try {
      const files = await listCacheFiles();
      setCacheFiles(files);
      await refreshLogInfo();
      setMessage("System info loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load system info.");
    }
  };

  const openLog = () => {
    openLogFile()
      .then(() => {
        setMessage("Log file opened.");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Failed to open log file.");
      });
  };

  const clearLog = () => {
    logInfo("tui.system", "system.log.clear", "Clearing log file");
    dialog.replace(() => (
      <ConfirmDialog
        title="Clear Log"
        message="Delete all log entries? This cannot be undone."
        confirmLabel="Clear"
        onConfirm={async () => {
          try {
            await clearLogFile();
            await refreshLogInfo();
            setMessage("Log file cleared.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to clear log.");
          }
        }}
      />
    ));
  };

  const openCacheFile = (info: CacheFileInfo) => {
    if (!info.exists) return;
    openUrlInBrowser(info.path)
      .then(() => {
        setMessage(`Opened: ${info.descriptor.name}`);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Failed to open cache file.");
      });
  };

  const deleteCacheFileAction = (info: CacheFileInfo) => {
    dialog.replace(() => (
      <ConfirmDialog
        title="Delete Cache File"
        message={`Delete ${info.descriptor.name}?\n${info.descriptor.description}\n\nThis cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await deleteCacheFile(info.descriptor.name);
            await loadData();
            setMessage(`Deleted: ${info.descriptor.name}`);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to delete cache file.");
          }
        }}
      />
    ));
  };

  const clearAllCache = () => {
    dialog.replace(() => (
      <ConfirmDialog
        title="Clear All Cache"
        message="Delete every cache file? This cannot be undone."
        confirmLabel="Clear All"
        onConfirm={async () => {
          try {
            await clearCache();
            await loadData();
            setMessage("All cache cleared.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to clear cache.");
          }
        }}
      />
    ));
  };

  const pressFocused = () => {
    const target = focusedTarget();

    if (target.type === "button") {
      if (target.name === "open-log") {
        openLog();
      } else if (target.name === "clear-log") {
        clearLog();
      } else if (target.name === "clear-all-cache") {
        clearAllCache();
      }
      return;
    }

    if (target.type === "file-action") {
      const file = cacheFiles().find((f) => f.descriptor.name === target.name);
      if (!file) return;
      if (target.action === "open") {
        openCacheFile(file);
      } else if (target.action === "delete") {
        deleteCacheFileAction(file);
      }
    }
  };

  useBindings(() => ({
    enabled: !dialog.active(),
    bindings: [
      {
        key: "tab",
        desc: "Next action",
        group: "System",
        cmd: () => {
          setFocusedTarget((target) => getNextSystemFocus(target, cacheFiles(), 1));
        },
      },
      {
        key: "shift+tab",
        desc: "Previous action",
        group: "System",
        cmd: () => {
          setFocusedTarget((target) => getNextSystemFocus(target, cacheFiles(), -1));
        },
      },
      {
        key: "down",
        desc: "Next action",
        group: "System",
        cmd: () => {
          setFocusedTarget((target) => getNextSystemFocus(target, cacheFiles(), 1));
        },
      },
      {
        key: "up",
        desc: "Previous action",
        group: "System",
        cmd: () => {
          setFocusedTarget((target) => getNextSystemFocus(target, cacheFiles(), -1));
        },
      },
      {
        key: "return",
        desc: "Execute focused action",
        group: "System",
        cmd: pressFocused,
      },
    ],
  }));

  onMount(() => {
    void loadData();
    setHints([
      { key: "↵", label: "execute" },
      { key: "⇥", label: "next" },
      { key: "⇧⇥", label: "prev" },
    ]);
  });

  onCleanup(() => setHints([]));

  return (
    <Page title="System" message={<text fg={tokens.textDim}>{message()}</text>}>
      <Card title="Logs">
        <text fg={tokens.textDim}>Location: {getLogPath()}</text>
        <Show when={logSize() > 0}>
          <text fg={tokens.textDim}>Size: {formatSize(logSize())}</text>
        </Show>
        <box flexDirection="row" gap={1} paddingTop={1}>
          <ActionButton
            name="open-log"
            label="open log"
            variant="primary"
            focused={isSystemFocusTarget(focusedTarget(), { type: "button", name: "open-log" })}
            onPress={openLog}
          />
          <ActionButton
            name="clear-log"
            label="clear"
            focused={isSystemFocusTarget(focusedTarget(), { type: "button", name: "clear-log" })}
            onPress={clearLog}
          />
        </box>
      </Card>

      <Card title="Cache Files">
        <For each={cacheFiles()}>
          {(info) => (
            <box
              flexDirection="row"
              justifyContent="space-between"
              paddingY={1}
              border={["bottom"]}
              borderColor={tokens.border}
            >
              <box flexDirection="column" flexGrow={1} gap={0}>
                <text fg={tokens.text}>{info.descriptor.name}</text>
                <Show when={!!info.descriptor.ttlDisplay}>
                  <text fg={tokens.textDim}> [{info.descriptor.ttlDisplay}]</text>
                </Show>
                <text fg={categoryColor(info.descriptor.category)}>{info.descriptor.category}</text>
                <text fg={tokens.textDim}>{info.descriptor.description}</text>
                <Show when={info.exists}>
                  <text fg={tokens.textDim}>Size: {formatSize(info.sizeBytes)}</text>
                </Show>
              </box>
              <Show when={info.exists}>
                <box flexDirection="row" alignItems="center" gap={1}>
                  <ActionButton
                    name={`open-${info.descriptor.name}`}
                    label="open"
                    focused={isSystemFocusTarget(focusedTarget(), {
                      type: "file-action",
                      name: info.descriptor.name,
                      action: "open",
                    })}
                    onPress={() => openCacheFile(info)}
                  />
                  <ActionButton
                    name={`delete-${info.descriptor.name}`}
                    label="delete"
                    focused={isSystemFocusTarget(focusedTarget(), {
                      type: "file-action",
                      name: info.descriptor.name,
                      action: "delete",
                    })}
                    onPress={() => deleteCacheFileAction(info)}
                  />
                </box>
              </Show>
            </box>
          )}
        </For>
        <box flexDirection="row" gap={1} paddingTop={1}>
          <ActionButton
            name="clear-all-cache"
            label="clear all cache"
            variant="primary"
            focused={isSystemFocusTarget(focusedTarget(), {
              type: "button",
              name: "clear-all-cache",
            })}
            onPress={clearAllCache}
          />
        </box>
      </Card>
    </Page>
  );
}
