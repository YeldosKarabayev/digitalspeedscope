import { Injectable } from "@nestjs/common";
import { MikrotikApiService } from "../mikrotik/mikrotik-api.service";

type Conn = {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
};

type HealthResult = {
  ok: boolean;
  latencyMs: number | null;
  cpuLoad: number | null;
  freeMemory: number | null;
  totalMemory: number | null;
  uptime: string | null;
  version: string | null;
  boardName: string | null;
  tunnelFound: boolean;
  tunnelRunning: boolean | null;
  rxByte: number | null;
  txByte: number | null;
  reason: string | null;
  raw?: {
    resource?: any;
    interface?: any;
  };
};

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class RemoteHealthRunner {
  constructor(private readonly mikrotik: MikrotikApiService) {}

  async run(
    conn: Conn,
    options?: {
      interfaceName?: string;
      interfaceNames?: string[];
      timeoutMs?: number;
      includeRaw?: boolean;
    },
  ): Promise<HealthResult> {
    const startedAt = Date.now();

    try {
      const resourceRaw = await this.mikrotik.exec(
        conn,
        ["/system/resource/print"],
        options?.timeoutMs ?? 8000,
      );

      const latencyMs = Date.now() - startedAt;

      const resourceRow = Array.isArray(resourceRaw)
        ? (resourceRaw[0] ?? null)
        : resourceRaw;

      if (!resourceRow || typeof resourceRow !== "object") {
        return {
          ok: false,
          latencyMs,
          cpuLoad: null,
          freeMemory: null,
          totalMemory: null,
          uptime: null,
          version: null,
          boardName: null,
          tunnelFound: false,
          tunnelRunning: null,
          rxByte: null,
          txByte: null,
          reason: "resource_print_empty",
          ...(options?.includeRaw ? { raw: { resource: resourceRaw } } : {}),
        };
      }

      const cpuLoad = toNumberOrNull((resourceRow as any)["cpu-load"]);
      const freeMemory = toNumberOrNull((resourceRow as any)["free-memory"]);
      const totalMemory = toNumberOrNull((resourceRow as any)["total-memory"]);
      const uptime = ((resourceRow as any).uptime ?? null) as string | null;
      const version = ((resourceRow as any).version ?? null) as string | null;
      const boardName = ((resourceRow as any)["board-name"] ?? null) as string | null;

      let tunnelFound = false;
      let tunnelRunning: boolean | null = null;
      let rxByte: number | null = null;
      let txByte: number | null = null;
      let interfaceRaw: any = null;

      const requestedNames = [
        ...(options?.interfaceName ? [options.interfaceName] : []),
        ...(options?.interfaceNames ?? []),
      ].filter(Boolean);

      if (requestedNames.length > 0) {
        interfaceRaw = await this.mikrotik.exec(
          conn,
          ["/interface/print"],
          options?.timeoutMs ?? 8000,
        );

        const rows = Array.isArray(interfaceRaw) ? interfaceRaw : [interfaceRaw];

        const found = rows.find((row: any) =>
          requestedNames.includes(String(row?.name ?? "")),
        );

        if (found) {
          tunnelFound = true;

          const runningValue = String(found?.running ?? "").toLowerCase();
          tunnelRunning =
            runningValue === "true" ? true : runningValue === "false" ? false : null;

          rxByte = toNumberOrNull(found?.["rx-byte"]);
          txByte = toNumberOrNull(found?.["tx-byte"]);
        }
      }

      const overloaded = cpuLoad != null && cpuLoad >= 85;
      const tooSlow = latencyMs >= 5000;

      return {
        ok: !overloaded && !tooSlow,
        latencyMs,
        cpuLoad,
        freeMemory,
        totalMemory,
        uptime,
        version,
        boardName,
        tunnelFound,
        tunnelRunning,
        rxByte,
        txByte,
        reason: overloaded
          ? "high_cpu"
          : tooSlow
            ? "slow_api"
            : requestedNames.length > 0 && !tunnelFound
              ? "interface_not_found"
              : requestedNames.length > 0 && tunnelRunning === false
                ? "interface_not_running"
                : null,
        ...(options?.includeRaw
          ? { raw: { resource: resourceRaw, interface: interfaceRaw } }
          : {}),
      };
    } catch (e: any) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        cpuLoad: null,
        freeMemory: null,
        totalMemory: null,
        uptime: null,
        version: null,
        boardName: null,
        tunnelFound: false,
        tunnelRunning: null,
        rxByte: null,
        txByte: null,
        reason: e?.message ?? "health_check_failed",
      };
    }
  }
}