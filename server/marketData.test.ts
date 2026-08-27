import { describe, expect, it } from "vitest";
import { scorePair } from "./marketData";

describe("memecoin research scoring", () => {
  it("raises risk and explains thin liquidity", () => {
    const result = scorePair({ liquidity: { usd: 900 }, volume: { h24: 300 }, priceChange: { h24: 4 }, txns: { h24: { buys: 2, sells: 2 } } }, 10);
    expect(result.risk).toBeGreaterThan(60);
    expect(result.riskReasons.some(reason => reason.includes("Thanh khoản thấp"))).toBe(true);
  });

  it("flags extreme momentum rather than treating it as pure opportunity", () => {
    const result = scorePair({ liquidity: { usd: 150000 }, volume: { h24: 500000 }, priceChange: { h24: 400 }, txns: { h24: { buys: 90, sells: 10 } } }, 20);
    expect(result.riskReasons.some(reason => reason.includes("cực đoan"))).toBe(true);
    expect(result.potential).toBeLessThan(100);
  });

  it("keeps missing holder and contract evidence visible", () => {
    const result = scorePair({}, 30);
    expect(result.riskReasons).toEqual(expect.arrayContaining([
      expect.stringContaining("holder concentration"),
      expect.stringContaining("Contract warning"),
    ]));
  });
});
