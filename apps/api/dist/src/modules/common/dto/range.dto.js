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
exports.MapPointsQueryDto = exports.METRIC_KEYS = exports.RangeQueryDto = exports.RANGE_KEYS = void 0;
const class_validator_1 = require("class-validator");
exports.RANGE_KEYS = ["1h", "24h", "7d", "30d"];
class RangeQueryDto {
    range;
}
exports.RangeQueryDto = RangeQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.RANGE_KEYS),
    __metadata("design:type", String)
], RangeQueryDto.prototype, "range", void 0);
exports.METRIC_KEYS = ["download", "upload", "ping"];
class MapPointsQueryDto extends RangeQueryDto {
    metric;
    city;
}
exports.MapPointsQueryDto = MapPointsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.METRIC_KEYS),
    __metadata("design:type", String)
], MapPointsQueryDto.prototype, "metric", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MapPointsQueryDto.prototype, "city", void 0);
//# sourceMappingURL=range.dto.js.map