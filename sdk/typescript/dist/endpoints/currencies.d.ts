import type { HttpClient } from "../http";
import type { Currency, ListCurrenciesOptions, SDKResponse } from "../types";
export declare class CurrenciesResource {
    private readonly http;
    constructor(http: HttpClient);
    list(options?: ListCurrenciesOptions): Promise<SDKResponse<Currency[]>>;
}
//# sourceMappingURL=currencies.d.ts.map