import {
    BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MikrotikApiService } from "./mikrotik-api.service";

@Injectable()
export class MikrotikService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mikrotikApiService: MikrotikApiService,
  ) {}

  async authorizeClient(params: {
    pointId: string;
    clientIp?: string;
    clientMac?: string;
    phone: string;
    ttlSeconds: number;
  }) {
    const point = await this.prisma.point.findUnique({
      where: { id: params.pointId },
      include: { device: true },
    });

    if (!point) {
      throw new NotFoundException("Точка не найдена");
    }

    if (!point.device) {
      throw new NotFoundException("У точки не найдено устройство");
    }

    if (!point.device.mikrotikHost) {
      throw new InternalServerErrorException("У устройства не указан mikrotikHost");
    }

    if (!point.device.mikrotikUsername) {
      throw new InternalServerErrorException("У устройства не указан mikrotikUsername");
    }

    if (!point.device.mikrotikSecretRef) {
      throw new InternalServerErrorException("У устройства не указан mikrotikSecretRef");
    }

    if (!params.clientIp && !params.clientMac) {
      throw new BadRequestException("Нет clientIp или clientMac для авторизации");
    }

    const password = point.device.mikrotikSecretRef;
    const listName = "portal_allowed";

    if (params.clientIp) {
      await this.mikrotikApiService.exec(
        {
          host: point.device.mikrotikHost,
          port: point.device.mikrotikPort ?? 8728,
          username: point.device.mikrotikUsername,
          password,
        },
        [
          "/ip/firewall/address-list/add",
          `=list=${listName}`,
          `=address=${params.clientIp}`,
          `=comment=portal:${params.phone}:${params.clientMac ?? "no-mac"}`,
          `=timeout=${params.ttlSeconds}s`,
        ],
      );
    }

    return {
      ok: true,
      pointId: params.pointId,
      clientIp: params.clientIp,
      clientMac: params.clientMac,
      ttlSeconds: params.ttlSeconds,
    };
  }
}