import { TEAMWORK_BASE_URL } from "./consts.ts";

export interface TeamworkTaskReference {
  /** Numeric Teamwork task ID. */
  id: number;
  /** Browser URL for the Teamwork task. */
  url: string;
}

export function getTeamworkTaskReference(value: string): TeamworkTaskReference {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Teamwork task ID or URL is required.");

  if (/^\d+$/.test(trimmed)) {
    const id = Number(trimmed);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Teamwork task ID is invalid.");

    return { id, url: `${TEAMWORK_BASE_URL}/app/tasks/${id}` };
  }

  try {
    const url = new URL(trimmed);
    const teamworkUrl = new URL(TEAMWORK_BASE_URL);
    if (url.hostname !== teamworkUrl.hostname) {
      throw new Error("Teamwork task URL must use the configured Teamwork site.");
    }

    const match = url.pathname.match(/\/tasks\/(\d+)/);
    if (!match?.[1]) throw new Error("Teamwork task URL must include a task ID.");

    return { id: Number(match[1]), url: url.toString() };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Teamwork")) throw error;
    throw new Error("Teamwork task must be a numeric ID or Teamwork task URL.");
  }
}
