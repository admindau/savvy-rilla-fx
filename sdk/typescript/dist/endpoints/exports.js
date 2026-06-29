import { createQueryString } from "../utils";
export class ExportsResource {
    http;
    constructor(http) {
        this.http = http;
    }
    rates(options = {}) {
        return this.http.get(`/api/v1/export/rates${createQueryString(options)}`);
    }
}
//# sourceMappingURL=exports.js.map