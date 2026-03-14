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
exports.TestController = void 0;
const common_1 = require("@nestjs/common");
const mikrotik_api_service_1 = require("./modules/mikrotik/mikrotik-api.service");
let TestController = class TestController {
    mikrotik;
    constructor(mikrotik) {
        this.mikrotik = mikrotik;
    }
    async testMikrotik() {
        const result = await this.mikrotik.exec({
            host: "192.168.88.1",
            port: 8728,
            username: "dss-api",
            password: "StrongPassword123",
            timeoutMs: 10_000,
        }, ["/system/resource/print"]);
        return result;
    }
};
exports.TestController = TestController;
__decorate([
    (0, common_1.Get)("mikrotik"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TestController.prototype, "testMikrotik", null);
exports.TestController = TestController = __decorate([
    (0, common_1.Controller)("test"),
    __metadata("design:paramtypes", [mikrotik_api_service_1.MikrotikApiService])
], TestController);
//# sourceMappingURL=test.controller.js.map