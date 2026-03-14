"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
const CODE_TTL_SEC = 60;
const MAX_ATTEMPTS = 5;
const DEV_CODE = "1234";
function hashCode(code) {
    return crypto.createHash("sha256").update(code).digest("hex");
}
let PortalService = class PortalService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async me(deviceKey) {
        const access = await this.prisma.portalAccess.findFirst({
            where: { deviceKey },
            include: { identity: true },
            orderBy: { lastSeenAt: "desc" },
        });
        if (!access)
            return { ok: false };
        await this.prisma.portalAccess.update({
            where: { id: access.id },
            data: { lastSeenAt: new Date() },
        });
        return {
            ok: true,
            phone: access.identity.phone,
            verifiedAt: access.identity.verifiedAt,
        };
    }
    async requestCode(dto, meta) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + CODE_TTL_SEC * 1000);
        const codeHash = hashCode(DEV_CODE);
        await this.prisma.portalSession.create({
            data: {
                phone: dto.phone,
                codeHash,
                expiresAt,
                ip: meta.ip,
                userAgent: meta.ua,
            },
        });
        console.log(`[PORTAL] OTP for ${dto.phone}: ${DEV_CODE}`);
        return { ok: true, expiresInSec: CODE_TTL_SEC };
    }
    async verifyCode(dto, meta) {
        const session = await this.prisma.portalSession.findFirst({
            where: {
                phone: dto.phone,
                verifiedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        });
        if (!session)
            throw new common_1.BadRequestException("Код истёк или не найден");
        if (session.attempts >= MAX_ATTEMPTS)
            throw new common_1.ForbiddenException("Превышено число попыток");
        const ok = hashCode(dto.code) === session.codeHash;
        await this.prisma.portalSession.update({
            where: { id: session.id },
            data: { attempts: { increment: 1 } },
        });
        if (!ok)
            throw new common_1.BadRequestException("Неверный код");
        await this.prisma.portalSession.update({
            where: { id: session.id },
            data: { verifiedAt: new Date() },
        });
        const identity = await this.prisma.portalIdentity.upsert({
            where: { phone: dto.phone },
            update: { verifiedAt: new Date() },
            create: { phone: dto.phone },
        });
        await this.prisma.portalAccess.upsert({
            where: { identityId_deviceKey: { identityId: identity.id, deviceKey: dto.deviceKey } },
            update: { lastSeenAt: new Date(), ip: meta?.ip, userAgent: meta?.ua },
            create: {
                identityId: identity.id,
                deviceKey: dto.deviceKey,
                ip: meta?.ip,
                userAgent: meta?.ua,
            },
        });
        return { ok: true };
    }
};
exports.PortalService = PortalService;
exports.PortalService = PortalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PortalService);
//# sourceMappingURL=portal.service.js.map