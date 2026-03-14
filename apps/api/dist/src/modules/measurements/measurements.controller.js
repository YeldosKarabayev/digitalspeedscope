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
exports.MeasurementsController = void 0;
const common_1 = require("@nestjs/common");
const measurements_service_1 = require("./measurements.service");
const range_dto_1 = require("../common/dto/range.dto");
const measurements_query_dto_1 = require("./dto/measurements.query.dto");
const common_2 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
let MeasurementsController = class MeasurementsController {
    service;
    constructor(service) {
        this.service = service;
    }
    recent(q) {
        return this.service.recent(q.range ?? "24h");
    }
    list(q) {
        return this.service.list(q);
    }
    async run() {
        return this.service.runManualTest();
    }
};
exports.MeasurementsController = MeasurementsController;
__decorate([
    (0, common_1.Get)("recent"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [range_dto_1.RangeQueryDto]),
    __metadata("design:returntype", void 0)
], MeasurementsController.prototype, "recent", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [measurements_query_dto_1.MeasurementsQueryDto]),
    __metadata("design:returntype", void 0)
], MeasurementsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)("run"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MeasurementsController.prototype, "run", null);
exports.MeasurementsController = MeasurementsController = __decorate([
    (0, common_2.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OPERATOR", "VIEWER"),
    (0, common_1.Controller)("measurements"),
    __metadata("design:paramtypes", [measurements_service_1.MeasurementsService])
], MeasurementsController);
//# sourceMappingURL=measurements.controller.js.map