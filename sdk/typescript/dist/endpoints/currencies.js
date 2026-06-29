import { createQueryString } from "../utils";
export class CurrenciesResource {
    http;
    constructor(http) {
        this.http = http;
    }
    list(options = {}) {
        return this.http.get(`/api/v1/currencies${createQueryString(options)}`);
    }
}
//# sourceMappingURL=currencies.js.map