# Shared Supabase Guardrails

Savvy Rilla FX API shares one Supabase database with Gorilla Ledger and EAMU FX. Treat the database as shared platform infrastructure.

## Applications sharing the database

| Application | Domain | Database posture |
| --- | --- | --- |
| Savvy Rilla FX API | `fx.savvyrilla.tech` | FX market data, public API, admin rate management |
| Gorilla Ledger | `gl.savvyrilla.tech` | Personal/business ledger and finance tracking |
| EAMU FX | `eamu.savvyrilla.tech` | East African Monetary Union FX intelligence |

## Change classification

### Green: application-only

Safe to implement within the FX app after normal testing.

Examples:

- UI-only changes
- Documentation changes
- API response formatting that does not alter database writes
- Client-side chart improvements
- Read-only query refactoring that preserves output shape

### Yellow: shared database

Requires compatibility review before implementation.

Examples:

- Adding a nullable column to an FX-owned table
- Adding a new FX-owned table
- Adding a new index
- Adding a new read-only view
- Changing admin insert/update logic
- Updating rate ingestion logic

### Red: platform-level

Requires coordinated planning and testing across FX, Gorilla Ledger, and EAMU FX.

Examples:

- Renaming or deleting tables
- Renaming or deleting columns
- Changing `auth` configuration
- Changing shared RLS policies
- Changing shared PostgreSQL functions or triggers
- Changing shared storage buckets
- Modifying service-role usage patterns
- Changing database-wide permissions

## Standing migration rules

1. Prefer additive migrations.
2. Avoid destructive migrations unless there is a rollback and compatibility plan.
3. Do not rename tables or columns directly; add the new structure first, migrate data, update apps, then deprecate later.
4. Keep FX admin writes limited to FX-owned tables.
5. Keep public API endpoints read-only.
6. Do not expose service-role keys to client-side code.
7. Do not weaken RLS policies to make a feature work quickly.
8. Document every new table, view, function, trigger, and cron dependency.
9. Test all affected applications before deploying database changes.
10. Keep `.env.local` and production secrets out of source control and ZIP handoffs.

## Recommended naming convention

Until the database is separated into PostgreSQL schemas, FX-specific database objects should use the `fx_` prefix wherever practical.

Examples:

```text
fx_daily_rates
fx_daily_rates_default
fx_sources
fx_market_health
fx_api_usage
fx_cron_runs
```

Shared platform objects should use a clear shared prefix if introduced later:

```text
shared_audit_logs
shared_feature_flags
shared_notifications
shared_api_keys
```

## Pre-change checklist

Before any database-affecting change, answer these questions:

```text
1. Which tables, views, functions, triggers, policies, or buckets are affected?
2. Is the affected object FX-only, shared, or unknown?
3. Could Gorilla Ledger depend on it?
4. Could EAMU FX depend on it?
5. Is the change additive or destructive?
6. Is rollback possible?
7. Have production environment variables and secrets remained untouched?
8. Have the relevant endpoints been tested after the change?
```

## Post-change checklist

After deploying a database-affecting change:

```text
1. Verify https://fx.savvyrilla.tech loads correctly.
2. Verify /api/health returns a healthy response.
3. Verify /api/v1/rates/latest?base=SSP works.
4. Verify admin rate management still works if the change affects admin flows.
5. Spot-check gl.savvyrilla.tech if any shared object was touched.
6. Spot-check eamu.savvyrilla.tech if any shared object was touched.
7. Record the change in the project notes or changelog.
```
