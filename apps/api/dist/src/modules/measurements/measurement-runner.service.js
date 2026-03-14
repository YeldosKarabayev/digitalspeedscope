"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeasurementRunnerService = void 0;
const common_1 = require("@nestjs/common");
const node_child_process_1 = require("node:child_process");
function toMbpsFromBandwidthBytesPerSec(bw) {
    const n = typeof bw === "number" ? bw : Number(bw);
    if (!Number.isFinite(n) || n <= 0)
        return 0;
    return Math.round((n * 8) / 1_000_000);
}
let MeasurementRunnerService = class MeasurementRunnerService {
    run() {
        return new Promise((resolve, reject) => {
            (0, node_child_process_1.execFile)("speedtest", ["--accept-license", "--accept-gdpr", "-f", "json"], { timeout: 60_000 }, (err, stdout, stderr) => {
                if (err) {
                    return reject(new Error(`speedtest failed: ${err.message}\n${String(stderr ?? "")}`));
                }
                let json;
                try {
                    json = JSON.parse(String(stdout));
                }
                catch {
                    return reject(new Error(`speedtest output is not JSON:\n${String(stdout)}`));
                }
                const downloadMbps = toMbpsFromBandwidthBytesPerSec(json?.download?.bandwidth);
                const uploadMbps = toMbpsFromBandwidthBytesPerSec(json?.upload?.bandwidth);
                resolve({
                    downloadMbps,
                    uploadMbps,
                    pingMs: Math.round(json?.ping?.latency ?? 0),
                    jitterMs: typeof json?.ping?.jitter === "number" ? json.ping.jitter : undefined,
                    packetLoss: typeof json?.packetLoss === "number" ? json.packetLoss : undefined,
                    isp: json?.isp,
                    ip: json?.interface?.externalIp,
                    serverId: String(json?.server?.id ?? ""),
                    serverName: json?.server?.name,
                    serverLocation: json?.server?.location,
                    serverCountry: json?.server?.country,
                    resultUrl: json?.result?.url,
                });
            });
        });
    }
};
exports.MeasurementRunnerService = MeasurementRunnerService;
exports.MeasurementRunnerService = MeasurementRunnerService = __decorate([
    (0, common_1.Injectable)()
], MeasurementRunnerService);
//# sourceMappingURL=measurement-runner.service.js.map