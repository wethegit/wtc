import { logError } from "../logs/manager.ts";
import { createTeamworkAuthorizationHeader, getTeamworkApiToken } from "./auth.ts";
import { TEAMWORK_API_BASE_URL } from "./consts.ts";

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
      signal: init.signal ?? AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Teamwork API responded with ${response.status}`);
    }

    if (response.status === 204) return null;

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    logError("teamwork", "client.fetch.error", `Teamwork API call failed: ${path}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
