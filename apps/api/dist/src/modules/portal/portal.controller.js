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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalController = void 0;
const common_1 = require("@nestjs/common");
const portal_service_1 = require("./portal.service");
const request_code_dto_1 = require("./dto/request-code.dto");
const verify_code_dto_1 = require("./dto/verify-code.dto");
const common_2 = require("@nestjs/common");
let PortalController = class PortalController {
    service;
    constructor(service) {
        this.service = service;
    }
    request(dto, req) {
        return this.service.requestCode(dto, {
            ip: req.ip,
            ua: req.headers["user-agent"],
        });
    }
    verify(dto, req) {
        return this.service.verifyCode(dto, {
            ip: req.ip,
            ua: req.headers["user-agent"],
        });
    }
    me(deviceKey) {
        return this.service.me(deviceKey);
    }
};
exports.PortalController = PortalController;
__decorate([
    (0, common_1.Post)("request-code"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_code_dto_1.RequestCodeDto, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "request", null);
__decorate([
    (0, common_1.Post)("verify-code"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_code_dto_1.VerifyCodeDto, Object]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "verify", null);
__decorate([
    (0, common_2.Get)("me"),
    __param(0, (0, common_2.Query)("deviceKey")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PortalController.prototype, "me", null);
exports.PortalController = PortalController = __decorate([
    (0, common_1.Controller)("portal"),
    __metadata("design:paramtypes", [portal_service_1.PortalService])
], PortalController);
//# sourceMappingURL=portal.controller.js.map