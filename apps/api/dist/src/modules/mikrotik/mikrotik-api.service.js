"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MikrotikApiService = void 0;
const common_1 = require("@nestjs/common");
const mikro_routeros_1 = require("mikro-routeros");
function sentenceToQuery(sentence) {
    const command = sentence[0];
    const params = {};
    for (const part of sentence.slice(1)) {
        if (!part.startsWith("="))
            continue;
        const s = part.slice(1);
        const idx = s.indexOf("=");
        if (idx <= 0)
            continue;
        const key = s.slice(0, idx);
        const value = s.slice(idx + 1);
        params[key] = value;
    }
    return { command, params };
}
let MikrotikApiService = class MikrotikApiService {
    async exec(params, sentence, timeoutMs = 30_000) {
        const timeout = params.timeoutMs ?? 30_000;
        const client = new mikro_routeros_1.RouterOSClient(params.host, params.port ?? 8728, timeout);
        try {
            await client.connect();
            await client.login(params.username, params.password);
            const { command, params: q } = sentenceToQuery(sentence);
            const result = await client.runQuery(command, q);
            return result;
        }
        finally {
            try {
                client.close();
            }
            catch { }
        }
    }
};
exports.MikrotikApiService = MikrotikApiService;
exports.MikrotikApiService = MikrotikApiService = __decorate([
    (0, common_1.Injectable)()
], MikrotikApiService);
//# sourceMappingURL=mikrotik-api.service.js.map