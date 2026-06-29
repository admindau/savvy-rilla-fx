import { CurrenciesResource } from "./endpoints/currencies";
import { ExportsResource } from "./endpoints/exports";
import { HealthResource } from "./endpoints/health";
import { RatesResource } from "./endpoints/rates";
import { SummaryResource } from "./endpoints/summary";
import { HttpClient, type SavvyRillaFXClientOptions } from "./http";

export class SavvyRillaFX {
  readonly http: HttpClient;
  readonly health: HealthResource;
  readonly currencies: CurrenciesResource;
  readonly rates: RatesResource;
  readonly summary: SummaryResource;
  readonly exports: ExportsResource;

  constructor(options: SavvyRillaFXClientOptions = {}) {
    this.http = new HttpClient(options);
    this.health = new HealthResource(this.http);
    this.currencies = new CurrenciesResource(this.http);
    this.rates = new RatesResource(this.http);
    this.summary = new SummaryResource(this.http);
    this.exports = new ExportsResource(this.http);
  }
}
