import { initProjectConfig } from "../../config/manager.ts";

/** Creates a project-level WTC config file in the current working directory. */
export async function configInit(startDir = process.cwd()): Promise<void> {
  const path = await initProjectConfig(startDir);
  console.log(`Created project config: ${path}`);
}
