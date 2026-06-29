import { CurrenciesResource } from "./endpoints/currencies";
import { ExportsResource } from "./endpoints/exports";
import { HealthResource } from "./endpoints/health";
import { RatesResource } from "./endpoints/rates";
import { SummaryResource } from "./endpoints/summary";
import { HttpClient } from "./http";
export class SavvyRillaFX {
    http;
    health;
    currencies;
    rates;
    summary;
    exports;
    constructor(options = {}) {
        this.http = new HttpClient(options);
        this.health = new HealthResource(this.http);
        this.currencies = new CurrenciesResource(this.http);
        this.rates = new RatesResource(this.http);
        this.summary = new SummaryResource(this.http);
        this.exports = new ExportsResource(this.http);
    }
}
//# sourceMappingURL=client.js.map