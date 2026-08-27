import { describe, expect, it } from "vitest";
import { getOAuthConfig } from "../client/src/const";

describe("OAuth client configuration", () => {
  it("always exposes a non-empty public portal and app id", () => {
    const config = getOAuthConfig();

    expect(config.oauthPortalUrl).toMatch(/^https:\/\//);
    expect(config.oauthPortalUrl).toContain("manus.im");
    expect(config.appId).toBe("QzE2opuqwqZjsrSsokWQde");
  });
});
