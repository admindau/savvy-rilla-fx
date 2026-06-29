import { createQueryString } from "../utils";
export class RatesResource {
    http;
    constructor(http) {
        this.http = http;
    }
    latest(options = {}) {
        return this.http.get(`/api/v1/rates/latest${createQueryString(options)}`);
    }
    latestByQuote(quote, options = {}) {
        return this.http.get(`/api/v1/rates/${encodeURIComponent(quote)}/latest${createQueryString(options)}`);
    }
    recent(options = {}) {
        return this.http.get(`/api/v1/rates/recent${createQueryString(options)}`);
    }
    history(options = {}) {
        return this.http.get(`/api/v1/rates/history${createQueryString(options)}`);
    }
}
//# sourceMappingURL=rates.js.map