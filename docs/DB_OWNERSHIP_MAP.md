# Database Ownership Map

This document records database objects referenced by Savvy Rilla FX API and the expected ownership posture for each object.

## Current FX application references

| Object | Type | Referenced by | Ownership posture | Notes |
| --- | --- | --- | --- | --- |
| `fx_daily_rates` | Table | Public API, dashboard, admin, export, summaries | FX-owned | Main live historical FX rates table. Admin insert/delete operations target this table. |
| `fx_daily_rates_default` | Table | Dashboard, latest rates fallback | FX-owned | Fallback/default rates used when no live `fx_daily_rates` rows exist. |
| `fx_sources` | Table | Admin manual-rate route | FX-owned | Source lookup for `SAVVY_FEED` and any future FX source identifiers. |
| `currencies` | Table | Public currencies endpoint, health check | Shared-risk / FX-used | Used by FX. Treat carefully because currency metadata may also be useful to EAMU FX and future finance apps. |

## Current route-to-table map

| Route/file | Database objects |
| --- | --- |
| `app/api/v1/currencies/route.ts` | `currencies` |
| `app/api/v1/rates/latest/route.ts` | `fx_daily_rates`, `fx_daily_rates_default` |
| `app/api/v1/rates/[quote]/latest/route.ts` | `fx_daily_rates` |
| `app/api/v1/rates/history/route.ts` | `fx_daily_rates` |
| `app/api/v1/rates/recent/route.ts` | `fx_daily_rates` |
| `app/api/v1/export/rates/route.ts` | `fx_daily_rates` |
| `app/api/v1/summary/market/route.ts` | `fx_daily_rates` |
| `app/api/admin/chart-data/route.ts` | `fx_daily_rates` |
| `app/api/admin/recent-rates/route.ts` | `fx_daily_rates` |
| `app/api/admin/delete-rate/route.ts` | `fx_daily_rates` |
| `app/api/admin/manual-rate/route.ts` | `fx_sources`, `fx_daily_rates` |
| `app/api/health/route.ts` | `currencies` |
| `app/dashboard/page.tsx` | `fx_daily_rates_default` |

## Ownership guidance

### FX-owned objects

FX-owned objects may be changed for this application, but still require a review because the database is shared.

Allowed with care:

- Add nullable columns.
- Add indexes.
- Add new FX-prefixed tables.
- Add read-only views.
- Add functions scoped clearly to FX.

Avoid without a compatibility plan:

- Dropping columns.
- Renaming columns.
- Renaming tables.
- Changing column types.
- Replacing table semantics.
- Changing RLS policies without checking all consumers.

### Shared-risk objects

`currencies` is currently classified as shared-risk because it is generic and may be useful across multiple products.

Changes to `currencies` should be treated as yellow or red depending on impact.

Recommended approach:

- Add fields instead of renaming existing fields.
- Keep currency `code` stable.
- Avoid deleting currencies that existing historical records reference.
- Use `is_active` or similar flags instead of hard deletion if lifecycle management is needed later.

## Future recommended schemas

When the platform matures, consider moving from the default `public` schema to logical PostgreSQL schemas:

```text
fx.*
ledger.*
eamu.*
shared.*
```

This should not be rushed. It should be treated as a platform-level migration.
