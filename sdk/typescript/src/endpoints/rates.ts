import type { HttpClient } from "../http";
import type {
  ExchangeRate,
  HistoryRatesOptions,
  LatestByQuoteOptions,
  LatestRateOptions,
  RecentRatesOptions,
  SDKResponse,
} from "../types";
import { createQueryString } from "../utils";

export class RatesResource {
  constructor(private readonly http: HttpClient) {}

  latest(options: LatestRateOptions = {}): Promise<SDKResponse<ExchangeRate>> {
    return this.http.get(`/api/v1/rates/latest${createQueryString(options)}`);
  }

  latestByQuote(quote: string, options: LatestByQuoteOptions = {}): Promise<SDKResponse<ExchangeRate>> {
    return this.http.get(`/api/v1/rates/${encodeURIComponent(quote)}/latest${createQueryString(options)}`);
  }

  recent(options: RecentRatesOptions = {}): Promise<SDKResponse<ExchangeRate[]>> {
    return this.http.get(`/api/v1/rates/recent${createQueryString(options)}`);
  }

  history(options: HistoryRatesOptions = {}): Promise<SDKResponse<ExchangeRate[]>> {
    return this.http.get(`/api/v1/rates/history${createQueryString(options)}`);
  }
}
