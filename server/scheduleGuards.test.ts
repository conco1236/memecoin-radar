import { describe, expect, it } from "vitest";
import { buildDailyUtcCron, decideScheduledDelivery, isCronTaskUser } from "./scheduleGuards";

describe("schedule guards", () => {
  it("builds a six-field daily UTC cron from fixed slots", () => {
    expect(buildDailyUtcCron(["18:00", "09:00", "18:00"])).toBe("0 0 09,18 * * *");
  });

  it("converts a Ho Chi Minh local slot to UTC", () => {
    expect(buildDailyUtcCron(["09:00"], "Asia/Ho_Chi_Minh", new Date("2026-01-15T00:00:00Z"))).toBe("0 0 02 * * *");
  });

  it("requires both cron identity and task uid", () => {
    expect(isCronTaskUser({ isCron: true, taskUid: "task-1" })).toBe(true);
    expect(isCronTaskUser({ isCron: false, taskUid: "task-1" })).toBe(false);
    expect(isCronTaskUser({ isCron: true })).toBe(false);
  });

  it.each([
    ["orphan", { preferenceFound: false, scheduleEnabled: true, alertsEnabled: true, matchCount: 1, fingerprint: "a" }],
    ["disabled", { preferenceFound: true, scheduleEnabled: false, alertsEnabled: true, matchCount: 1, fingerprint: "a" }],
    ["no-matches", { preferenceFound: true, scheduleEnabled: true, alertsEnabled: true, matchCount: 0, fingerprint: "" }],
    ["duplicate", { preferenceFound: true, scheduleEnabled: true, alertsEnabled: true, matchCount: 1, fingerprint: "a", lastFingerprint: "a" }],
    ["send", { preferenceFound: true, scheduleEnabled: true, alertsEnabled: true, matchCount: 1, fingerprint: "a", lastFingerprint: "b" }],
  ] as const)("returns %s decision", (expected, input) => {
    expect(decideScheduledDelivery(input)).toBe(expected);
  });
});
