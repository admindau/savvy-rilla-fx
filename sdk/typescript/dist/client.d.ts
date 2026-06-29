import { CurrenciesResource } from "./endpoints/currencies";
import { ExportsResource } from "./endpoints/exports";
import { HealthResource } from "./endpoints/health";
import { RatesResource } from "./endpoints/rates";
import { SummaryResource } from "./endpoints/summary";
import { HttpClient, type SavvyRillaFXClientOptions } from "./http";
export declare class SavvyRillaFX {
    readonly http: HttpClient;
    readonly health: HealthResource;
    readonly currencies: CurrenciesResource;
    readonly rates: RatesResource;
    readonly summary: SummaryResource;
    readonly exports: ExportsResource;
    constructor(options?: SavvyRillaFXClientOptions);
}
//# sourceMappingURL=client.d.ts.map