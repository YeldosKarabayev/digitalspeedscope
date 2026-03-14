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
exports.RemoteSpeedWorker = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
let RemoteSpeedWorker = class RemoteSpeedWorker {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async process(jobId) {
        await this.prisma.remoteSpeedJob.update({
            where: { id: jobId },
            data: { status: "RUNNING", phase: "connect", progress: 10 },
        });
        await new Promise((r) => setTimeout(r, 2000));
        const measurement = await this.prisma.measurement.create({
            data: {
                deviceId: (await this.prisma.remoteSpeedJob.findUnique({ where: { id: jobId } })).deviceId,
                downloadMbps: 350,
                uploadMbps: 180,
                pingMs: 14,
                status: "GOOD",
            },
        });
        await this.prisma.remoteSpeedJob.update({
            where: { id: jobId },
            data: {
                status: "SUCCEEDED",
                progress: 100,
                phase: "done",
                measurementId: measurement.id,
            },
        });
    }
};
exports.RemoteSpeedWorker = RemoteSpeedWorker;
exports.RemoteSpeedWorker = RemoteSpeedWorker = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_module_1.PrismaService])
], RemoteSpeedWorker);
//# sourceMappingURL=remote-speed.worker.js.map