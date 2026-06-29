export class HealthResource {
    http;
    constructor(http) {
        this.http = http;
    }
    check() {
        return this.http.get("/api/health");
    }
}
//# sourceMappingURL=health.js.map