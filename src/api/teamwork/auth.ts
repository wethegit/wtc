// Keep one stable OS-secret identity so CLI and TUI auth flows read/write the
// same Teamwork API token without ever storing it in YAML config files.
const TEAMWORK_SECRET_SERVICE = "wtc";
const TEAMWORK_TOKEN_SECRET_NAME = "teamwork-api-token";

/** Safe-to-display auth state. The token value itself must never be surfaced. */
export type TeamworkAuthStatus = "configured" | "missing";

/** Returns the stored Teamwork API token, or null when not configured. */
export async function getTeamworkApiToken(): Promise<string | null> {
  return await Bun.secrets.get({
    service: TEAMWORK_SECRET_SERVICE,
    name: TEAMWORK_TOKEN_SECRET_NAME,
  });
}

/** Stores a Teamwork API token in OS secrets. */
export async function setTeamworkApiToken(token: string): Promise<void> {
  const value = token.trim();
  if (!value) throw new Error("Teamwork API token cannot be empty.");

  await Bun.secrets.set({
    service: TEAMWORK_SECRET_SERVICE,
    name: TEAMWORK_TOKEN_SECRET_NAME,
    value,
  });
}

/** Deletes the stored Teamwork API token. Returns false when no token existed. */
export async function deleteTeamworkApiToken(): Promise<boolean> {
  return Bun.secrets.delete({
    service: TEAMWORK_SECRET_SERVICE,
    name: TEAMWORK_TOKEN_SECRET_NAME,
  });
}

/** Returns whether a Teamwork API token is configured, without exposing the value. */
export async function getTeamworkAuthStatus(): Promise<TeamworkAuthStatus> {
  return (await getTeamworkApiToken()) ? "configured" : "missing";
}

/** Teamwork Basic auth expects the API token in the username position. */
export function createTeamworkAuthorizationHeader(token: string): string {
  return `Basic ${btoa(`${token}:password`)}`;
}
