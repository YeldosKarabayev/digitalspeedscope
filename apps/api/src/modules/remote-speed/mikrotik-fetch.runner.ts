import { Injectable, Logger } from "@nestjs/common";
import { Client } from "ssh2";

export class FetchTestError extends Error {
  constructor(
    message: string,
    public readonly raw?: string,
  ) {
    super(message);
    this.name = "FetchTestError";
  }
}

type SshConn = {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
};

export type FetchRunParams = {
  url: string;
  timeoutSec?: number;
  keepResult?: boolean;
};

export type FetchRunResult = {
  url: string;
  durationSec: number;
  bytesDownloaded: number | null;
  throughputMbps: number | null;
  timedOut: boolean;
  success: boolean;
  raw: string;
  command: string;
};

function execSshCommand(conn: SshConn, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const chunks: Buffer[] = [];
    const errs: Buffer[] = [];
    const timeoutMs = conn.timeoutMs ?? 60_000;

    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      try {
        client.end();
      } catch {}

      try {
        client.destroy();
      } catch {}

      fn();
    };

    client
      .on("ready", () => {
        client.exec(command, (err, stream) => {
          if (err) {
            finish(() => reject(err));
            return;
          }

          timer = setTimeout(() => {
            try {
              stream.close();
            } catch {}

            finish(() =>
              reject(new Error(`SSH command timeout after ${timeoutMs}ms`)),
            );
          }, timeoutMs);

          stream.on("data", (data: Buffer) => chunks.push(data));
          stream.stderr.on("data", (data: Buffer) => errs.push(data));

          stream.on("close", () => {
            const stdout = Buffer.concat(chunks).toString("utf8");
            const stderr = Buffer.concat(errs).toString("utf8");

            finish(() => {
              if (stderr.trim()) {
                reject(new Error(stderr.trim()));
                return;
              }

              resolve(stdout);
            });
          });

          stream.on("error", (streamErr) => {
            finish(() => reject(streamErr));
          });
        });
      })
      .on("error", (err) => {
        finish(() => reject(err));
      })
      .connect({
        host: conn.host,
        port: conn.port ?? 22,
        username: conn.username,
        password: conn.password,
        readyTimeout: timeoutMs,
      });
  });
}

function normalizeOutput(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildFetchCommand(params: FetchRunParams): string {
  const keepResult = params.keepResult ?? false;
  return `/tool fetch url="${params.url}" keep-result=${keepResult ? "yes" : "no"}`;
}

function parseDownloadedBytes(raw: string): number | null {
  // Ищем downloaded: 9465KiB / total: 10240KiB
  const match = raw.match(/downloaded:\s*([0-9.]+)\s*(B|KiB|MiB|GiB)/i);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (!Number.isFinite(value)) return null;

  switch (unit) {
    case "b":
      return Math.round(value);
    case "kib":
      return Math.round(value * 1024);
    case "mib":
      return Math.round(value * 1024 * 1024);
    case "gib":
      return Math.round(value * 1024 * 1024 * 1024);
    default:
      return null;
  }
}

function parseDurationSec(raw: string): number | null {
  // duration: 20s
  const m = raw.match(/duration:\s*([0-9.]+)s/i);
  if (!m) return null;

  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class MikrotikFetchRunner {
  private readonly logger = new Logger(MikrotikFetchRunner.name);

  async runFetchTest(
    conn: SshConn,
    params: FetchRunParams,
  ): Promise<FetchRunResult> {
    const command = buildFetchCommand(params);
    const startedAt = Date.now();

    this.logger.debug(`FETCH CMD: ${command}`);

    let raw: string;

    try {
      raw = await execSshCommand(conn, command);
    } catch (e: any) {
      throw new FetchTestError(e?.message ?? "Fetch command failed");
    }

    const normalized = normalizeOutput(raw);
    const durationSec =
      parseDurationSec(normalized) ?? Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    const downloadedBytes = parseDownloadedBytes(normalized);
    const throughputMbps =
      downloadedBytes != null && durationSec > 0
        ? Math.round(((downloadedBytes * 8) / 1_000_000 / durationSec) * 100) / 100
        : null;

    const timedOut =
      /timeout/i.test(normalized) ||
      /timed out/i.test(normalized) ||
      /failure:\s*connection timeout/i.test(normalized);

    const success =
      !timedOut &&
      !/status:\s*failed/i.test(normalized) &&
      !/failure:/i.test(normalized);

    return {
      url: params.url,
      durationSec,
      bytesDownloaded: downloadedBytes,
      throughputMbps,
      timedOut,
      success,
      raw: normalized,
      command,
    };
  }
}