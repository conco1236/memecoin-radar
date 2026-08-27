import { describe, expect, it } from "vitest";
import { normalizeTrpcPath } from "./[...path]";

describe("Vercel tRPC path normalization", () => {
  it("strips the /api/trpc prefix while preserving query parameters", () => {
    expect(normalizeTrpcPath("/api/trpc/tokens.discover?batch=1&input=x")).toBe("/tokens.discover?batch=1&input=x");
  });

  it("returns the root path for the catch-all base", () => {
    expect(normalizeTrpcPath("/api/trpc")).toBe("/");
  });

  it("does not alter unrelated paths", () => {
    expect(normalizeTrpcPath("/health")).toBe("/health");
  });
});
