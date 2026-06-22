/** Opens a URL in the default system browser (macOS `open`, Linux `xdg-open`, Windows `start`). */
export async function openUrlInBrowser(url: string): Promise<void> {
  const command =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  const processRef = Bun.spawn(command, { stdout: "ignore", stderr: "ignore" });
  const exitCode = await processRef.exited;

  if (exitCode !== 0) throw new Error(`Failed to open URL: ${url}`);
}
