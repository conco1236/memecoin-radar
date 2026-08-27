# Locale QA

- Vietnamese screenshot `/`: header, hero, statistics, filters, empty state, and research notice render in Vietnamese. The Telegram control correctly shows the login prompt when unauthenticated.
- English screenshot `/?lang=en`: header, hero, statistics, filters, table headers, empty state, and detail placeholder render in English. The sparkline and score tooltip paths are locale-aware in source.
- Validation: `pnpm check`, `pnpm test` (7 tests), and `pnpm build` passed after the final locale/auth changes.
- Scope note: Telegram delivery is guarded by authentication and uses configured server-side secrets; there is no buy/sell execution.
