import { createQueryString } from "../utils";
export class SummaryResource {
    http;
    constructor(http) {
        this.http = http;
    }
    market(options = {}) {
        return this.http.get(`/api/v1/summary/market${createQueryString(options)}`);
    }
    insights(options = {}) {
        return this.http.get(`/api/v1/summary/insights${createQueryString(options)}`);
    }
}
//# sourceMappingURL=summary.js.map