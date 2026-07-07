import { logError } from "../logs/manager.ts";
import { createTeamworkAuthorizationHeader, getTeamworkApiToken } from "./auth.ts";
import { TEAMWORK_API_BASE_URL } from "./consts.ts";

const REQUEST_TIMEOUT_MS = 5000;

export class TeamworkApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "TeamworkApiError";
  }
}

/** Fetches a Teamwork v3 API endpoint using stored auth and returns the parsed JSON body. */
export async function fetchTeamworkApiJson(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getTeamworkApiToken();
  if (!token) throw new Error("Teamwork API token is missing.");

  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  headers.set("Authorization", createTeamworkAuthorizationHeader(token));

  try {
    const response = await fetch(`${TEAMWORK_API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 204) return null;

    const text = await response.text();
    if (!response.ok) {
      throw new TeamworkApiError(
        `Teamwork API responded with ${response.status}`,
        response.status,
        text,
      );
    }

    return text ? JSON.parse(text) : null;
  } catch (error) {
    logError("teamwork", "client.fetch.error", `Teamwork API call failed: ${path}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
