"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MikrotikSpeedRunner = void 0;
const common_1 = require("@nestjs/common");
const mikrotik_api_service_1 = require("../mikrotik/mikrotik-api.service");
function kbpsToMbps(kbps) {
    if (!Number.isFinite(kbps) || kbps <= 0)
        return 0;
    return Math.round(kbps / 1000);
}
let MikrotikSpeedRunner = class MikrotikSpeedRunner {
    api;
    constructor(api) {
        this.api = api;
    }
    async runBandwidthTest(conn, p) {
        const duration = `${Math.max(3, Math.min(p.durationSec ?? 10, 60))}s`;
        const protocol = (p.protocol ?? "tcp").toLowerCase();
        const direction = (p.direction ?? "both").toLowerCase();
        const sentence = [
            "/tool/bandwidth-test",
            `=address=${p.targetHost}`,
            `=duration=${duration}`,
            `=protocol=${protocol}`,
            `=direction=${direction}`,
        ];
        if (p.user)
            sentence.push(`=user=${p.user}`);
        if (p.password)
            sentence.push(`=password=${p.password}`);
        const raw = await this.api.exec({ host: conn.host, port: conn.port, username: conn.username, password: conn.password }, sentence, 70_000);
        let rxKbps = 0;
        let txKbps = 0;
        const rows = [];
        for (const r of Array.isArray(raw) ? raw : [raw]) {
            if (r?.data && Array.isArray(r.data))
                rows.push(...r.data);
            if (r?.data && !Array.isArray(r.data))
                rows.push(r.data);
        }
        for (const row of rows) {
            const rx = Number(row["rx-total-average"] ?? row["rx-average"] ?? row["rx"] ?? 0) ||
                Number(row["rx-bits-per-second"] ?? 0) / 1000;
            const tx = Number(row["tx-total-average"] ?? row["tx-average"] ?? row["tx"] ?? 0) ||
                Number(row["tx-bits-per-second"] ?? 0) / 1000;
            if (rx > rxKbps)
                rxKbps = rx;
            if (tx > txKbps)
                txKbps = tx;
        }
        const downloadMbps = kbpsToMbps(rxKbps);
        const uploadMbps = kbpsToMbps(txKbps);
        return {
            downloadMbps,
            uploadMbps,
            pingMs: 0,
            raw,
        };
    }
};
exports.MikrotikSpeedRunner = MikrotikSpeedRunner;
exports.MikrotikSpeedRunner = MikrotikSpeedRunner = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [mikrotik_api_service_1.MikrotikApiService])
], MikrotikSpeedRunner);
//# sourceMappingURL=mikrotik-speed.runner.js.map