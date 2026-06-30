import { createSignal, For, onMount, Show } from "solid-js";

import {
  clearCache,
  deleteCacheFile,
  type CacheFileInfo,
  listCacheFiles,
} from "../../api/cache/manager.ts";
import { clearLogFile, getLogPath, logInfo } from "../../api/logs/manager.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { Card } from "../components/layout/card.tsx";
import { Page } from "../components/layout/page.tsx";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";
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
  const [message, setMessage] = createSignal("Loading...");
  const [logSize, setLogSize] = createSignal(0);
  const [cacheFiles, setCacheFiles] = createSignal<CacheFileInfo[]>([]);

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
    openUrlInBrowser(getLogPath())
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

  onMount(() => {
    void loadData();
  });

  return (
    <Page title="System" message={<text fg={tokens.textDim}>{message()}</text>}>
      <Card title="Logs">
        <text fg={tokens.textDim}>Location: {getLogPath()}</text>
        <Show when={logSize() > 0}>
          <text fg={tokens.textDim}>Size: {formatSize(logSize())}</text>
        </Show>
        <box flexDirection="row" gap={1} paddingTop={1}>
          <box paddingX={2} backgroundColor={tokens.accent} onMouseUp={openLog}>
            <text fg={tokens.textInverse}>open log</text>
          </box>
          <box paddingX={2} backgroundColor={tokens.surfaceOverlay} onMouseUp={clearLog}>
            <text fg={tokens.text}>clear</text>
          </box>
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
                  <box
                    paddingX={2}
                    backgroundColor={tokens.surfaceOverlay}
                    onMouseUp={() => openCacheFile(info)}
                  >
                    <text fg={tokens.text}>open</text>
                  </box>
                  <box
                    paddingX={2}
                    backgroundColor={tokens.surfaceOverlay}
                    onMouseUp={() => deleteCacheFileAction(info)}
                  >
                    <text fg={tokens.text}>delete</text>
                  </box>
                </box>
              </Show>
            </box>
          )}
        </For>
        <box flexDirection="row" gap={1} paddingTop={1}>
          <box paddingX={2} backgroundColor={tokens.accent} onMouseUp={clearAllCache}>
            <text fg={tokens.textInverse}>clear all cache</text>
          </box>
        </box>
      </Card>
    </Page>
  );
}
