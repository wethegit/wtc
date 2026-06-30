import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { useBindings } from "@opentui/keymap/solid";

import {
  clearCache,
  deleteCacheFile,
  type CacheFileInfo,
  listCacheFiles,
} from "../../api/cache/manager.ts";
import { clearLogFile, getLogPath, logInfo } from "../../api/logs/manager.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { ActionButton } from "../components/forms/action-button.tsx";
import { Card } from "../components/layout/card.tsx";
import { Page } from "../components/layout/page.tsx";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

function formatSize(bytes: number): string {
  if (bytes === 0) return "";
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

/** System route for managing logs and cache files. */
export function SystemPage() {
  const dialog = useDialog();
  const { setHints } = useStatusBar();
  const [message, setMessage] = createSignal("Loading...");
  const [logSize, setLogSize] = createSignal(0);
  const [cacheFiles, setCacheFiles] = createSignal<CacheFileInfo[]>([]);

  const refreshLogInfo = async () => {
    const logPath = getLogPath();
    try {
      const fileStat = await Bun.file(logPath).stat();
      setLogSize(fileStat.size);
    } catch {
      setLogSize(0);
    }
  };

  const reload = async () => {
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
    void openUrlInBrowser(getLogPath());
    setMessage("Log file opened.");
  };

  const clearLog = () => {
    logInfo("tui.system", "system.log.clear", "Clearing log file");
    dialog.replace(() => (
      <ConfirmDialog
        title="Clear Log"
        message="Delete all log entries? This cannot be undone."
        confirmLabel="Clear"
        onConfirm={async () => {
          await clearLogFile();
          await refreshLogInfo();
          setMessage("Log file cleared.");
        }}
      />
    ));
  };

  const openCacheFile = (info: CacheFileInfo) => {
    if (!info.exists) return;
    void openUrlInBrowser(info.path);
    setMessage(`Opened: ${info.descriptor.name}`);
  };

  const deleteCacheFileAction = (info: CacheFileInfo) => {
    dialog.replace(() => (
      <ConfirmDialog
        title="Delete Cache File"
        message={`Delete ${info.descriptor.name}?\n${info.descriptor.description}\n\nThis cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          await deleteCacheFile(info.descriptor.name);
          await reload();
          setMessage(`Deleted: ${info.descriptor.name}`);
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
          await clearCache();
          await reload();
          setMessage("All cache cleared.");
        }}
      />
    ));
  };

  useBindings(() => ({
    bindings: [
      {
        key: "ctrl+r",
        desc: "Reload system info",
        group: "System",
        cmd: reload,
      },
      {
        key: "o",
        desc: "Open log file",
        group: "System",
        cmd: openLog,
      },
    ],
  }));

  onMount(() => {
    void reload();
    setHints([
      { key: "O", label: "open log" },
      { key: "^R", label: "reload" },
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
          <ActionButton name="open-log" label="open log" variant="primary" onPress={openLog} />
          <ActionButton name="clear-log" label="clear" onPress={clearLog} />
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
              <box flexDirection="row" alignItems="center" gap={1}>
                <Show when={info.exists}>
                  <ActionButton
                    name={`open-${info.descriptor.name}`}
                    label="open"
                    onPress={() => openCacheFile(info)}
                  />
                </Show>
                <Show when={info.exists}>
                  <ActionButton
                    name={`delete-${info.descriptor.name}`}
                    label="delete"
                    onPress={() => deleteCacheFileAction(info)}
                  />
                </Show>
              </box>
            </box>
          )}
        </For>
        <box flexDirection="row" gap={1} paddingTop={1}>
          <ActionButton
            name="clear-all-cache"
            label="clear all cache"
            variant="primary"
            onPress={clearAllCache}
          />
        </box>
      </Card>
    </Page>
  );
}
