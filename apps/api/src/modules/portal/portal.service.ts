import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestCodeDto } from "./dto/request-code.dto";
import { VerifyCodeDto } from "./dto/verify-code.dto";
import * as crypto from "crypto";

const CODE_TTL_SEC = 60;
const MAX_ATTEMPTS = 5;
const DEV_CODE = "1234"; // MVP

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) { }

  async me(deviceKey: string) {
    const access = await this.prisma.portalAccess.findFirst({
      where: { deviceKey },
      include: { identity: true },
      orderBy: { lastSeenAt: "desc" },
    });

    if (!access) return { ok: false };

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


  async requestCode(dto: RequestCodeDto, meta: { ip?: string; ua?: string }) {
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

    // DEV: логируем код
    console.log(`[PORTAL] OTP for ${dto.phone}: ${DEV_CODE}`);

    return { ok: true, expiresInSec: CODE_TTL_SEC };
  }

  async verifyCode(dto: VerifyCodeDto, meta?: { ip?: string; ua?: string }) {
    const session = await this.prisma.portalSession.findFirst({
      where: {
        phone: dto.phone,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) throw new BadRequestException("Код истёк или не найден");
    if (session.attempts >= MAX_ATTEMPTS) throw new ForbiddenException("Превышено число попыток");

    const ok = hashCode(dto.code) === session.codeHash;

    await this.prisma.portalSession.update({
      where: { id: session.id },
      data: { attempts: { increment: 1 } },
    });

    if (!ok) throw new BadRequestException("Неверный код");

    // помечаем OTP как подтвержденный
    await this.prisma.portalSession.update({
      where: { id: session.id },
      data: { verifiedAt: new Date() },
    });

    // 1) identity (навсегда по телефону)
    const identity = await this.prisma.portalIdentity.upsert({
      where: { phone: dto.phone },
      update: { verifiedAt: new Date() },
      create: { phone: dto.phone },
    });

    // 2) access (навсегда по устройству)
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

}
