import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestCodeDto } from "./dto/request-code.dto";
import { VerifyCodeDto } from "./dto/verify-code.dto";
import { SmsService } from "./sms.service";
import { MikrotikService } from "../mikrotik/mikrotik.service";
import * as crypto from "crypto";

const OTP_TTL_SEC = 120;
const ACCESS_TTL_SEC = 8 * 60 * 60;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly mikrotikService: MikrotikService,
  ) { }

  async me(params: {
    deviceKey: string;
    pointId: string;
    clientMac?: string;
    clientIp?: string;
  }) {
    if (!params.deviceKey || !params.pointId) {
      return { ok: false };
    }

    const access = await this.prisma.portalAccess.findFirst({
      where: {
        deviceKey: params.deviceKey,
        pointId: params.pointId,
        expiresAt: { gt: new Date() },
      },
      include: {
        identity: true,
        point: true,
      },
      orderBy: { lastSeenAt: "desc" },
    });

    if (!access) return { ok: false };

    if (params.clientMac && access.clientMac && access.clientMac !== params.clientMac) {
      return { ok: false };
    }

    // Автоматически даём доступ в MikroTik заново на текущий IP/MAC
    if (params.clientIp) {
      await this.mikrotikService.authorizeClient({
        pointId: params.pointId,
        clientIp: params.clientIp,
        clientMac: params.clientMac ?? access.clientMac ?? undefined,
        phone: access.identity.phone,
        ttlSeconds: ACCESS_TTL_SEC,
      });
    }

    await this.prisma.portalAccess.update({
      where: { id: access.id },
      data: {
        lastSeenAt: new Date(),
        clientIp: params.clientIp ?? access.clientIp,
        clientMac: params.clientMac ?? access.clientMac,
        expiresAt: new Date(Date.now() + ACCESS_TTL_SEC * 1000),
      },
    });

    return {
      ok: true,
      phone: access.identity.phone,
      verifiedAt: access.identity.verifiedAt,
      expiresAt: access.expiresAt,
      pointId: access.pointId,
    };
  }

  async requestCode(dto: RequestCodeDto, meta: { ip?: string; ua?: string }) {
    if (!dto.pointId) {
      throw new BadRequestException("pointId обязателен");
    }

    const point = await this.prisma.point.findUnique({
      where: { id: dto.pointId },
      include: { device: true },
    });

    if (!point) {
      throw new BadRequestException("Точка не найдена");
    }

    const recent = await this.prisma.portalSession.findFirst({
      where: {
        phone: dto.phone,
        pointId: dto.pointId,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
        createdAt: {
          gt: new Date(Date.now() - RESEND_COOLDOWN_SEC * 1000),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      throw new HttpException(
        "Код уже отправлен. Попробуйте позже.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code =
      process.env.NODE_ENV === "production"
        ? generateOtp()
        : process.env.PORTAL_DEV_CODE || "1234";

    const expiresAt = new Date(Date.now() + OTP_TTL_SEC * 1000);

    // Сначала пробуем отправить SMS
    const smsResult = await this.smsService.sendOtp(dto.phone, code);

    // Только если SMS ушла успешно — сохраняем session
    await this.prisma.portalSession.create({
      data: {
        phone: dto.phone,
        codeHash: hashCode(code),
        expiresAt,
        pointId: dto.pointId,
        clientIp: dto.clientIp,
        clientMac: dto.clientMac,
        ip: meta.ip,
        userAgent: meta.ua,
      },
    });

    await this.logEvent({
      pointId: dto.pointId,
      phone: dto.phone,
      event: "OTP_REQUEST",
      status: "OK",
      message: `OTP sent via ${smsResult.provider}${smsResult.providerMessageId ? `, messageId=${smsResult.providerMessageId}` : ""}`,
      clientIp: dto.clientIp,
      clientMac: dto.clientMac,
      requestIp: meta.ip,
    });

    return { ok: true, expiresInSec: OTP_TTL_SEC };
  }

  async verifyCode(dto: VerifyCodeDto, meta: { ip?: string; ua?: string }) {
    const point = await this.prisma.point.findUnique({
      where: { id: dto.pointId },
      include: { device: true },
    });

    if (!point) {
      throw new BadRequestException("Точка не найдена");
    }

    const session = await this.prisma.portalSession.findFirst({
      where: {
        phone: dto.phone,
        pointId: dto.pointId,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!session) {
      throw new BadRequestException("Код истёк или не найден");
    }

    if (session.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new ForbiddenException("Превышено число попыток");
    }

    const ok = hashCode(dto.code.trim()) === session.codeHash;

    await this.prisma.portalSession.update({
      where: { id: session.id },
      data: { attempts: { increment: 1 } },
    });

    if (!ok) {
      await this.logEvent({
        pointId: dto.pointId,
        phone: dto.phone,
        event: "OTP_VERIFY",
        status: "FAIL",
        message: "Invalid OTP",
        clientIp: dto.clientIp,
        clientMac: dto.clientMac,
        requestIp: meta.ip,
      });

      throw new BadRequestException("Неверный код");
    }

    const verifiedAt = new Date();
    const accessExpiresAt = new Date(Date.now() + ACCESS_TTL_SEC * 1000);

    await this.prisma.portalSession.update({
      where: { id: session.id },
      data: { verifiedAt },
    });

    const identity = await this.prisma.portalIdentity.upsert({
      where: { phone: dto.phone },
      update: { verifiedAt },
      create: {
        phone: dto.phone,
        verifiedAt,
      },
    });

    await this.mikrotikService.authorizeClient({
      pointId: dto.pointId,
      clientIp: dto.clientIp,
      clientMac: dto.clientMac,
      phone: dto.phone,
      ttlSeconds: ACCESS_TTL_SEC,
    });

    const existingAccess = await this.prisma.portalAccess.findFirst({
      where: {
        identityId: identity.id,
        pointId: dto.pointId,
        deviceKey: dto.deviceKey,
      },
    });

    if (existingAccess) {
      await this.prisma.portalAccess.update({
        where: { id: existingAccess.id },
        data: {
          clientIp: dto.clientIp,
          clientMac: dto.clientMac,
          ip: meta.ip,
          userAgent: meta.ua,
          grantedAt: verifiedAt,
          expiresAt: accessExpiresAt,
          lastSeenAt: verifiedAt,
        },
      });
    } else {
      await this.prisma.portalAccess.create({
        data: {
          identityId: identity.id,
          pointId: dto.pointId,
          deviceKey: dto.deviceKey,
          clientIp: dto.clientIp,
          clientMac: dto.clientMac,
          ip: meta.ip,
          userAgent: meta.ua,
          firstSeenAt: verifiedAt,
          lastSeenAt: verifiedAt,
          grantedAt: verifiedAt,
          expiresAt: accessExpiresAt,
        },
      });
    }

    await this.logEvent({
      pointId: dto.pointId,
      phone: dto.phone,
      event: "ACCESS_GRANTED",
      status: "OK",
      message: "Internet access granted",
      clientIp: dto.clientIp,
      clientMac: dto.clientMac,
      requestIp: meta.ip,
    });

    return {
      ok: true,
      expiresInSec: ACCESS_TTL_SEC,
      pointId: dto.pointId,
    };
  }

  async getPoints() {
    return this.prisma.point.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
  }

  private async logEvent(params: {
    pointId?: string;
    phone?: string;
    event: string;
    status: string;
    message?: string;
    clientIp?: string;
    clientMac?: string;
    requestIp?: string;
  }) {
    await this.prisma.portalAuditLog.create({
      data: {
        pointId: params.pointId,
        phone: params.phone,
        event: params.event,
        status: params.status,
        message: params.message,
        clientIp: params.clientIp,
        clientMac: params.clientMac,
        requestIp: params.requestIp,
      },
    });
  }
}