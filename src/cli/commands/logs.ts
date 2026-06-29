import { clearLogFile, getLogPath, logInfo, openLogFile } from "../../api/logs/manager.ts";

export async function logsOpen(): Promise<void> {
  logInfo("cli.logs", "logs.open", "Opening log file");
  await openLogFile();
  console.log(`Log file opened: ${getLogPath()}`);
}

export async function logsClear(): Promise<void> {
  logInfo("cli.logs", "logs.clear", "Clearing log file");
  await clearLogFile();
  console.log("Log file cleared.");
}

export async function logsPath(): Promise<void> {
  console.log(getLogPath());
}
