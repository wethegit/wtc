import { describe, expect, mock, test, afterEach } from "bun:test";

import {
  createMockFetch,
  mockTeamworkAuthModule,
  useTempCacheDir,
} from "../../helpers/teamwork.ts";
import { TEAMWORK_API_BASE_URL, TEAMWORK_BASE_URL } from "../../../src/api/teamwork/consts.ts";

mock.module("../../../src/api/teamwork/auth.ts", mockTeamworkAuthModule);

const { createTeamworkAuthorizationHeader } = await import("../../../src/api/teamwork/auth.ts");
const { getTeamworkCurrentUser, getTeamworkCurrentUserId } =
  await import("../../../src/api/teamwork/user.ts");

const originalFetch = globalThis.fetch;

const ME_RESPONSE = {
  person: {
    id: 238814,
    name: "Marlon Marcello",
    email: "marlon@wethecollective.com",
    avatarUrl: "https://example.com/avatar.png",
  },
};

describe("teamwork current user", () => {
  useTempCacheDir();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetches current user with Teamwork auth", async () => {
    const requestedUrls: string[] = [];
    let authorization = "";

    globalThis.fetch = createMockFetch((url, init) => {
      requestedUrls.push(url);
      authorization = new Headers(init?.headers).get("Authorization") ?? "";

      return new Response(JSON.stringify(ME_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const user = await getTeamworkCurrentUser();

    expect(user).toEqual({
      id: 238814,
      name: "Marlon Marcello",
      email: "marlon@wethecollective.com",
      avatarUrl: "https://example.com/avatar.png",
      url: `${TEAMWORK_BASE_URL}/app/profile/238814`,
    });
    expect(requestedUrls).toEqual([`${TEAMWORK_API_BASE_URL}/me.json`]);
    expect(authorization).toBe(createTeamworkAuthorizationHeader("token-123"));
  });

  test("returns cached user without fetching", async () => {
    let fetchCount = 0;

    globalThis.fetch = createMockFetch(() => {
      fetchCount++;
      return new Response(JSON.stringify(ME_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await getTeamworkCurrentUser();
    expect(fetchCount).toBe(1);

    const user = await getTeamworkCurrentUser();
    expect(fetchCount).toBe(1);
    expect(user.id).toBe(238814);
  });

  test("falls back to stale cache on network error", async () => {
    globalThis.fetch = createMockFetch(() => {
      return new Response(JSON.stringify(ME_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await getTeamworkCurrentUser();

    globalThis.fetch = createMockFetch(() => {
      throw new Error("Network failure");
    });

    const user = await getTeamworkCurrentUser();
    expect(user.id).toBe(238814);
    expect(user.name).toBe("Marlon Marcello");
  });

  test("returns user ID from convenience wrapper", async () => {
    globalThis.fetch = createMockFetch(() => {
      return new Response(JSON.stringify(ME_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const userId = await getTeamworkCurrentUserId();
    expect(userId).toBe(238814);
  });
});
