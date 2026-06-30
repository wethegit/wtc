import { appendFile, mkdir } from "node:fs/promises";

import { openUrlInBrowser } from "../../utils/browser.ts";
import { getCachePath } from "../cache/manager.ts";
import { CACHE, getCacheDir } from "../cache/consts.ts";

type LogLevel = "info" | "warn" | "error";
type LogMetadata = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope: string;
  event: string;
  message: string;
  metadata?: LogMetadata;
}

export function getLogPath(): string {
  return getCachePath(CACHE.log);
}

async function writeLog(
  level: LogLevel,
  scope: string,
  event: string,
  message: string,
  metadata?: LogMetadata,
): Promise<void> {
  const path = getLogPath();
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    event,
    message,
    ...(metadata ? { metadata } : {}),
  };

  try {
    await mkdir(getCacheDir(), { recursive: true });
    await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    console.error("Failed to write log entry.");
  }
}

export function logInfo(
  scope: string,
  event: string,
  message: string,
  metadata?: LogMetadata,
): void {
  void writeLog("info", scope, event, message, metadata);
}

export function logWarn(
  scope: string,
  event: string,
  message: string,
  metadata?: LogMetadata,
): void {
  void writeLog("warn", scope, event, message, metadata);
}

export function logError(
  scope: string,
  event: string,
  message: string,
  metadata?: LogMetadata,
): void {
  void writeLog("error", scope, event, message, metadata);
}

export async function clearLogFile(): Promise<void> {
  await mkdir(getCacheDir(), { recursive: true });
  await Bun.write(getLogPath(), "");
}

export async function openLogFile(): Promise<void> {
  await mkdir(getCacheDir(), { recursive: true });
  await appendFile(getLogPath(), "", "utf8");
  await openUrlInBrowser(getLogPath());
}
