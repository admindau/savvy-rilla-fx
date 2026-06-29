import type { HttpClient } from "../http";
import type { MarketInsights, MarketSummary, SDKResponse, SummaryOptions } from "../types";
import { createQueryString } from "../utils";

export class SummaryResource {
  constructor(private readonly http: HttpClient) {}

  market(options: SummaryOptions = {}): Promise<SDKResponse<MarketSummary>> {
    return this.http.get(`/api/v1/summary/market${createQueryString(options)}`);
  }

  insights(options: SummaryOptions = {}): Promise<SDKResponse<MarketInsights>> {
    return this.http.get(`/api/v1/summary/insights${createQueryString(options)}`);
  }
}
