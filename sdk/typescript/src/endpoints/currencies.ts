import type { HttpClient } from "../http";
import type { Currency, ListCurrenciesOptions, SDKResponse } from "../types";
import { createQueryString } from "../utils";

export class CurrenciesResource {
  constructor(private readonly http: HttpClient) {}

  list(options: ListCurrenciesOptions = {}): Promise<SDKResponse<Currency[]>> {
    return this.http.get(`/api/v1/currencies${createQueryString(options)}`);
  }
}
