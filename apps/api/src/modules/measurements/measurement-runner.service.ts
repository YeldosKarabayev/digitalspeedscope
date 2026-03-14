import { Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";

function toMbpsFromBandwidthBytesPerSec(bw: unknown) {
  const n = typeof bw === "number" ? bw : Number(bw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // speedtest CLI: bandwidth = BYTES/sec -> Mbps
  return Math.round((n * 8) / 1_000_000);
}

@Injectable()
export class MeasurementRunnerService {
  run() {
    return new Promise<{
      downloadMbps: number;
      uploadMbps: number;
      pingMs: number;
      jitterMs?: number;
      packetLoss?: number;
      isp?: string;
      ip?: string;
      serverId?: string;
      serverName?: string;
      serverLocation?: string;
      serverCountry?: string;
      resultUrl?: string;
    }>((resolve, reject) => {
      execFile(
        "speedtest",
        ["--accept-license", "--accept-gdpr", "-f", "json"],
        { timeout: 60_000 },
        (err, stdout, stderr) => {
          if (err) {
            return reject(
              new Error(`speedtest failed: ${err.message}\n${String(stderr ?? "")}`)
            );
          }

          let json: any;
          try {
            json = JSON.parse(String(stdout));
          } catch {
            return reject(new Error(`speedtest output is not JSON:\n${String(stdout)}`));
          }

          const downloadMbps = toMbpsFromBandwidthBytesPerSec(json?.download?.bandwidth);
          const uploadMbps = toMbpsFromBandwidthBytesPerSec(json?.upload?.bandwidth);

          resolve({
            downloadMbps,
            uploadMbps,
            pingMs: Math.round(json?.ping?.latency ?? 0),
            jitterMs: typeof json?.ping?.jitter === "number" ? json.ping.jitter : undefined,
            packetLoss: typeof json?.packetLoss === "number" ? json.packetLoss : undefined,
            isp: json?.isp,
            ip: json?.interface?.externalIp,
            serverId: String(json?.server?.id ?? ""),
            serverName: json?.server?.name,
            serverLocation: json?.server?.location,
            serverCountry: json?.server?.country,
            resultUrl: json?.result?.url,
          });
        }
      );
    });
  }
}
