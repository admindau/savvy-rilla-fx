# Savvy Rilla FX TypeScript SDK

Official TypeScript SDK for the Savvy Rilla FX API.

## Install

```bash
pnpm add @savvyrilla/fx
```

## Quick start

```ts
import { SavvyRillaFX } from "@savvyrilla/fx";

const fx = new SavvyRillaFX({
  apiKey: process.env.SAVVY_RILLA_FX_API_KEY,
});

const latest = await fx.rates.latest({ quote: "USD" });
console.log(latest.data);
```

## API

```ts
await fx.health.check();
await fx.currencies.list();
await fx.rates.latest({ base: "SSP", quote: "USD" });
await fx.rates.latestByQuote("USD", { base: "SSP" });
await fx.rates.recent({ base: "SSP", quote: "USD", limit: 30 });
await fx.rates.history({ base: "SSP", quote: "USD", mode: "all" });
await fx.summary.market({ base: "SSP", quote: "USD" });
await fx.summary.insights({ base: "SSP", quote: "USD" });
await fx.exports.rates({ base: "SSP", quote: "USD", format: "csv" });
```

## Configuration

```ts
const fx = new SavvyRillaFX({
  apiKey: "srfx_live_...",
  baseUrl: "https://fx.savvyrilla.tech",
  timeoutMs: 10_000,
  retries: 2,
});
```

## Error handling

```ts
import { SavvyRillaFXError, SavvyRillaFXRateLimitError } from "@savvyrilla/fx";

try {
  await fx.rates.latest();
} catch (error) {
  if (error instanceof SavvyRillaFXRateLimitError) {
    console.log(error.retryAfterSeconds);
  }

  if (error instanceof SavvyRillaFXError) {
    console.log(error.status, error.code, error.requestId);
  }
}
```
