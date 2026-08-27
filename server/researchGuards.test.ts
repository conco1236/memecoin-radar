import { describe, expect, it } from "vitest";
import { shouldAlert, watchlistEntryKey } from "./researchGuards";

describe("research guards", () => {
  it("scopes watchlist identity by both user and token", () => {
    expect(watchlistEntryKey(1, "solana:abc")).not.toBe(watchlistEntryKey(2, "solana:abc"));
    expect(watchlistEntryKey(1, "solana:abc")).toBe(watchlistEntryKey(1, "solana:abc"));
  });

  it("alerts on configured potential or watched high risk only when enabled", () => {
    expect(shouldAlert({ enabled: true, potentialScore: 80, riskScore: 20, potentialThreshold: 70, highRiskThreshold: 75, watched: false })).toBe(true);
    expect(shouldAlert({ enabled: true, potentialScore: 40, riskScore: 80, potentialThreshold: 70, highRiskThreshold: 75, watched: true })).toBe(true);
    expect(shouldAlert({ enabled: false, potentialScore: 90, riskScore: 90, potentialThreshold: 70, highRiskThreshold: 75, watched: true })).toBe(false);
  });
});
