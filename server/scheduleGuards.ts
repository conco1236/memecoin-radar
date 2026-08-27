export const FIXED_ALERT_TIMES = ["09:00", "13:00", "18:00", "21:00"] as const;
export type FixedAlertTime = (typeof FIXED_ALERT_TIMES)[number];
export const SUPPORTED_TIMEZONES = ["UTC", "Asia/Ho_Chi_Minh", "America/New_York", "Europe/London"] as const;
export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];

function timezoneOffsetMinutes(timezone: SupportedTimezone, date: Date): number {
  if (timezone === "UTC") return 0;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
  return Math.round((asUtc - date.getTime()) / 60000);
}

export function buildDailyUtcCron(times: readonly FixedAlertTime[], timezone: SupportedTimezone = "UTC", referenceDate = new Date()): string {
  const offset = timezoneOffsetMinutes(timezone, referenceDate);
  const hours = Array.from(new Set(times.map(time => ((Number(time.slice(0, 2)) * 60 - offset) / 60 + 24) % 24))).sort((a, b) => a - b).map(hour => String(hour).padStart(2, "0"));
  return `0 0 ${hours.join(",")} * * *`;
}

export function isCronTaskUser(user: { isCron?: boolean; taskUid?: string | null }): boolean {
  return user.isCron === true && Boolean(user.taskUid);
}

export type ScheduledDecision = "orphan" | "disabled" | "no-matches" | "duplicate" | "send";
export function decideScheduledDelivery(input: { preferenceFound: boolean; scheduleEnabled: boolean; alertsEnabled: boolean; matchCount: number; fingerprint: string; lastFingerprint?: string | null }): ScheduledDecision {
  if (!input.preferenceFound) return "orphan";
  if (!input.scheduleEnabled || !input.alertsEnabled) return "disabled";
  if (input.matchCount === 0) return "no-matches";
  if (input.fingerprint === input.lastFingerprint) return "duplicate";
  return "send";
}
