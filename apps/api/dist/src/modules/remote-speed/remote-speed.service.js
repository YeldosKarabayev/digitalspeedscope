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
exports.RemoteSpeedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const remote_speed_worker_1 = require("./remote-speed.worker");
let RemoteSpeedService = class RemoteSpeedService {
    prisma;
    worker;
    constructor(prisma, worker) {
        this.prisma = prisma;
        this.worker = worker;
    }
    async createJob(deviceId) {
        const device = await this.prisma.device.findUnique({
            where: { id: deviceId },
            select: { id: true, kind: true, isActive: true },
        });
        if (!device)
            throw new common_1.NotFoundException("Device not found");
        const job = await this.prisma.remoteSpeedJob.create({
            data: { deviceId },
        });
        setImmediate(() => this.worker.process(job.id));
        return { ok: true, jobId: job.id, status: job.status };
    }
    async getJob(id) {
        const job = await this.prisma.remoteSpeedJob.findUnique({
            where: { id },
        });
        if (!job)
            throw new common_1.NotFoundException("Job not found");
        return {
            ok: true,
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            phase: job.phase,
            message: job.message,
            measurementId: job.measurementId,
            error: job.errorMessage,
        };
    }
};
exports.RemoteSpeedService = RemoteSpeedService;
exports.RemoteSpeedService = RemoteSpeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_module_1.PrismaService,
        remote_speed_worker_1.RemoteSpeedWorker])
], RemoteSpeedService);
//# sourceMappingURL=remote-speed.service.js.map