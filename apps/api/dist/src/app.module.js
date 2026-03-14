"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const map_module_1 = require("./modules/map/map.module");
const measurements_module_1 = require("./modules/measurements/measurements.module");
const prisma_module_1 = require("./prisma/prisma.module");
const portal_module_1 = require("./modules/portal/portal.module");
const auth_module_1 = require("./modules/auth/auth.module");
const devices_module_1 = require("./modules/devices/devices.module");
const mikrotik_module_1 = require("./modules/mikrotik/mikrotik.module");
const test_controller_1 = require("./test.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            mikrotik_module_1.MikrotikModule,
            devices_module_1.DevicesModule,
            auth_module_1.AuthModule,
            prisma_module_1.PrismaModule,
            dashboard_module_1.DashboardModule,
            map_module_1.MapModule,
            measurements_module_1.MeasurementsModule,
            portal_module_1.PortalModule,
        ],
        controllers: [test_controller_1.TestController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map