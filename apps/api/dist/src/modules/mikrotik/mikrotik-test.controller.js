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
exports.MikrotikTestController = void 0;
const common_1 = require("@nestjs/common");
const mikrotik_api_service_1 = require("./mikrotik-api.service");
let MikrotikTestController = class MikrotikTestController {
    mikrotik;
    constructor(mikrotik) {
        this.mikrotik = mikrotik;
    }
    async test() {
        const res = await this.mikrotik.exec({
            host: "192.168.88.1",
            port: 8728,
            username: "dss-api",
            password: "StrongPassword123",
        }, ["/system/resource/print"], 10_000);
        return { ok: true, raw: res, data: res?.data ?? null };
    }
};
exports.MikrotikTestController = MikrotikTestController;
__decorate([
    (0, common_1.Get)("mikrotik"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MikrotikTestController.prototype, "test", null);
exports.MikrotikTestController = MikrotikTestController = __decorate([
    (0, common_1.Controller)("test"),
    __metadata("design:paramtypes", [mikrotik_api_service_1.MikrotikApiService])
], MikrotikTestController);
//# sourceMappingURL=mikrotik-test.controller.js.map