import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exchangeCodeForToken: vi.fn(), getUserInfo: vi.fn(), createSessionToken: vi.fn(), upsertUser: vi.fn() }));
vi.mock("./_core/sdk.js", () => ({ sdk: mocks }));
vi.mock("./db.js", () => ({ upsertUser: mocks.upsertUser }));

import { registerOAuthRoutes } from "./_core/oauth.js";

function registeredHandler() {
  let handler: ((req: any, res: any) => Promise<void>) | undefined;
  registerOAuthRoutes({ get: (_path: string, callback: any) => { handler = callback; } } as any);
  if (!handler) throw new Error("OAuth callback was not registered");
  return handler;
}

function response() {
  const result: { statusCode?: number; body?: unknown; redirect?: number; sessionCookie?: unknown[] } = {};
  const res = {
    status(code: number) { result.statusCode = code; return res; },
    json(body: unknown) { result.body = body; return res; },
    clearCookie() { return res; },
    cookie(...args: unknown[]) { result.sessionCookie = args; return res; },
    redirect(code: number) { result.redirect = code; return res; },
  } as any;
  return { res, result };
}

describe("OAuth callback route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a callback missing code or state", async () => {
    const handler = registeredHandler();
    const { res, result } = response();
    await handler({ query: {}, headers: {} }, res);
    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({ error: "code and state are required" });
  });

  it("completes a valid callback and creates a session cookie", async () => {
    const handler = registeredHandler();
    mocks.exchangeCodeForToken.mockResolvedValue({ accessToken: "access-token" });
    mocks.getUserInfo.mockResolvedValue({ openId: "user-1", name: "Research User", email: "user@example.com", loginMethod: "oauth" });
    mocks.createSessionToken.mockResolvedValue("session-token");
    const { res, result } = response();
    const state = Buffer.from(JSON.stringify({ redirectUri: "https://example.test/api/oauth/callback", nonce: "expected" })).toString("base64");
    await handler({ query: { code: "code", state }, headers: { cookie: "__Host-oauth_state=expected", "x-forwarded-proto": "https" }, protocol: "https" }, res);
    expect(mocks.exchangeCodeForToken).toHaveBeenCalledWith("code", state);
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "user-1", name: "Research User" }));
    expect(mocks.createSessionToken).toHaveBeenCalledWith("user-1", expect.objectContaining({ expiresInMs: expect.any(Number) }));
    expect(result.sessionCookie?.[0]).toBe("app_session_id");
    expect(result.sessionCookie?.[1]).toBe("session-token");
    expect(result.sessionCookie?.[2]).toEqual(expect.objectContaining({ httpOnly: true, path: "/", sameSite: "none", secure: true }));
    expect(result.redirect).toBe(302);
    expect(result.statusCode).toBeUndefined();
  });

  it("rejects a callback with a mismatched state nonce", async () => {
    const handler = registeredHandler();
    const { res, result } = response();
    const state = Buffer.from(JSON.stringify({ redirectUri: "https://example.test/api/oauth/callback", nonce: "expected" })).toString("base64");
    await handler({ query: { code: "code", state }, headers: { cookie: "__Host-oauth_state=other" } }, res);
    expect(result.statusCode).toBe(403);
    expect(result.body).toEqual({ error: "invalid oauth state" });
    expect(mocks.exchangeCodeForToken).not.toHaveBeenCalled();
  });
});
