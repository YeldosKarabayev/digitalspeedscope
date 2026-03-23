import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MikrotikApiService } from "./mikrotik-api.service";

type ExecWordsParams = {
  host: string;
  sentence: string[];
  port?: number;
  username?: string;
  password?: string;
  timeoutMs?: number;
};

type AddSimpleQueueParams = {
  host: string;
  name: string;
  target: string;
  maxLimitMbps: number;
  port?: number;
  username?: string;
  password?: string;
  timeoutMs?: number;
};

@Injectable()
export class MikrotikService {
  exec(arg0: { host: string; command: string; }) {
      throw new Error("Method not implemented.");
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly mikrotikApiService: MikrotikApiService,
  ) {}

  async execWords(params: ExecWordsParams) {
    const host = params.host?.trim();
    if (!host) {
      throw new BadRequestException("host is required");
    }

    if (!params.sentence?.length) {
      throw new BadRequestException("sentence is required");
    }

    const username = params.username ?? process.env.MIKROTIK_USERNAME ?? "admin";
    const password = params.password ?? process.env.MIKROTIK_PASSWORD;

    if (!password) {
      throw new InternalServerErrorException(
        "MikroTik password is not configured",
      );
    }

    return this.mikrotikApiService.exec(
      {
        host,
        port: params.port ?? Number(process.env.MIKROTIK_API_PORT ?? 8728),
        username,
        password,
        timeoutMs: params.timeoutMs ?? 15_000,
      },
      params.sentence,
      params.timeoutMs ?? 15_000,
    );
  }

  async addSimpleQueue(params: AddSimpleQueueParams) {
    return this.execWords({
      host: params.host,
      port: params.port,
      username: params.username,
      password: params.password,
      timeoutMs: params.timeoutMs,
      sentence: [
        "/queue/simple/add",
        `=name=${params.name}`,
        `=target=${params.target}`,
        `=max-limit=${params.maxLimitMbps}M/${params.maxLimitMbps}M`,
      ],
    });
  }

  async findSimpleQueueByName(params: {
    host: string;
    name: string;
    port?: number;
    username?: string;
    password?: string;
    timeoutMs?: number;
  }) {
    const result = await this.execWords({
      host: params.host,
      port: params.port,
      username: params.username,
      password: params.password,
      timeoutMs: params.timeoutMs,
      sentence: ["/queue/simple/print"],
    });

    if (!Array.isArray(result)) {
      return null;
    }

    const found = result.find((item: any) => item?.name === params.name);
    return found ?? null;
  }

  async removeSimpleQueueByName(params: {
    host: string;
    name: string;
    port?: number;
    username?: string;
    password?: string;
    timeoutMs?: number;
  }) {
    const found = await this.findSimpleQueueByName(params);
    if (!found?.[".id"]) {
      return { removed: false };
    }

    await this.execWords({
      host: params.host,
      port: params.port,
      username: params.username,
      password: params.password,
      timeoutMs: params.timeoutMs,
      sentence: ["/queue/simple/remove", `=.id=${found[".id"]}`],
    });

    return { removed: true, id: found[".id"] };
  }

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