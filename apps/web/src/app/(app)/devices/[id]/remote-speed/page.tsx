"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Wifi,
  ArrowDownCircle,
  ArrowUpCircle,
  Gauge,
  Timer,
  Activity,
  MapPin,
  Router as RouterIcon,
  Waypoints,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MeasurementStatus = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
type RemoteSpeedJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMEOUT";
type SpeedProtocol = "tcp" | "udp";
type SpeedProfile = "auto" | "lite50" | "std100" | "plus150";

type RemoteMeasurement = {
  id: string;
  downloadMbps: number;
  realDownloadMbps?: number | null;
  uploadMbps: number;
  pingMs: number | null;
  jitterMs?: number | null;
  packetLoss?: number | null;
  status: MeasurementStatus;
  createdAt?: string;
};

type HealthSnapshot = {
  ok?: boolean;
  latencyMs?: number | null;
  cpuLoad?: number | null;
  freeMemory?: number | null;
  totalMemory?: number | null;
  uptime?: string | null;
  version?: string | null;
  boardName?: string | null;
  tunnelFound?: boolean;
  tunnelRunning?: boolean | null;
  rxByte?: number | null;
  txByte?: number | null;
  reason?: string | null;
};

type DirectionTestDetails = {
  direction?: "transmit" | "receive";
  durationSec?: number;
  protocol?: SpeedProtocol;
  raw?: string | null;
  localCpuLoad?: number | null;
  remoteCpuLoad?: number | null;
  connectionCount?: number | null;
  uploadMbps?: number | null;
  downloadMbps?: number | null;
  command?: string | null;
};

type FetchTestDetails = {
  url?: string;
  durationSec?: number;
  bytesDownloaded?: number | null;
  throughputMbps?: number | null;
  timedOut?: boolean;
  success?: boolean;
  raw?: string | null;
  command?: string | null;
};

type DiagnosisDetails = {
  suspectedCause?: string | null;
  fetchSmallMbps?: number | null;
  fetchSmallTimedOut?: boolean | null;
  fetchLargeMbps?: number | null;
  fetchLargeTimedOut?: boolean | null;
};

type RemoteSpeedJob = {
  id: string;
  status: RemoteSpeedJobStatus;
  progress?: number | null;
  phase?: string | null;
  message?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;

  targetHost?: string | null;
  protocol?: SpeedProtocol | null;
  direction?: "both" | "transmit" | "receive" | null;
  durationSec?: number | null;

  rawResult?: {
    requestedProfile?: SpeedProfile;
    resolvedProfile?: Exclude<SpeedProfile, "auto">;
    targetMbps?: number;
    queueTargetIp?: string;
    btestTargetHost?: string;

    healthBefore?: HealthSnapshot;
    healthUnderLoad?: HealthSnapshot;

    uploadTest?: DirectionTestDetails;
    downloadTest?: DirectionTestDetails;

    fetchSmall?: FetchTestDetails;
    fetchLarge?: FetchTestDetails;

    final?: {
      uploadMbps?: number;
      downloadMbps?: number;
      realDownloadMbps?: number | null;
      ping?: {
        pingMs?: number | null;
        jitterMs?: number | null;
        packetLoss?: number | null;
      };
      health?: HealthSnapshot;
      profileKey?: string;
      cpuLoad?: number | null;
      latencyMs?: number | null;
      diagnosis?: DiagnosisDetails;
    };

    error?: string;
  } | null;

  measurement?: RemoteMeasurement | null;
};

type DeviceSummary = {
  id: string;
  uid?: string | null;
  name?: string | null;
  lastIp?: string | null;
  queueTargetIp?: string | null;
  point?: {
    id: string;
    name?: string | null;
  } | null;
};

type RemoteSpeedCreateResponse = {
  ok: boolean;
  reused?: boolean;
  reason?: string;
  job: RemoteSpeedJob;
};

type RemoteSpeedListResponse = {
  ok: boolean;
  items: RemoteSpeedJob[];
};

type RemoteSpeedActiveResponse = {
  ok: boolean;
  item: RemoteSpeedJob | null;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatMbps(value?: number | null, digits = 0) {
  if (value == null || !Number.isFinite(value)) return "—";
  return digits > 0 ? value.toFixed(digits) : `${Math.round(value)}`;
}

function formatMs(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}`;
}

function getPrimaryHealth(job: RemoteSpeedJob | null): HealthSnapshot | null {
  return (
    job?.rawResult?.final?.health ??
    job?.rawResult?.healthUnderLoad ??
    job?.rawResult?.healthBefore ??
    null
  );
}

function useAnimatedNumber(target: number, duration = 700) {
  const [value, setValue] = React.useState(target);

  React.useEffect(() => {
    const start = performance.now();
    const from = value;
    const to = target;
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (to - from) * eased;
      setValue(next);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return value;
}

function SpeedArc({
  value,
  max,
  label,
  activeTone = "download",
  sublabel,
  loading,
}: {
  value: number;
  max: number;
  label: string;
  activeTone: "download" | "upload" | "idle";
  sublabel?: string;
  loading?: boolean;
}) {
  const animatedValue = useAnimatedNumber(value, 500);
  const pct = clamp(max > 0 ? animatedValue / max : 0, 0, 1);

  const size = 360;
  const cx = 180;
  const cy = 180;
  const radius = 122;
  const startAngle = 140;
  const endAngle = 400;
  const sweep = endAngle - startAngle;
  const currentAngle = startAngle + sweep * pct;

  const polar = (deg: number, r = radius) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const arcPath = (from: number, to: number) => {
    const start = polar(from);
    const end = polar(to);
    const largeArc = to - from > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const bgPath = arcPath(startAngle, endAngle);
  const fgPath = arcPath(startAngle, currentAngle);

  const needleStart = polar(currentAngle, 28);
  const needleEnd = polar(currentAngle, 95);

  const ticks = [0, 5, 10, 50, 100, 250, 500, 750, 1000];
  const tickMax = 1000;

  const toneClass =
    activeTone === "upload"
      ? "text-slate-200"
      : activeTone === "download"
        ? "text-indigo-300"
        : "text-slate-300";

  const arcStroke =
    activeTone === "upload"
      ? "url(#speedUpload)"
      : activeTone === "download"
        ? "url(#speedDownload)"
        : "rgba(71,85,105,0.95)";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[380px] w-[380px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
          <defs>
            <linearGradient id="speedDownload" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a5b4fc" />
            </linearGradient>
            <linearGradient id="speedUpload" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <radialGradient id="gaugeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(99,102,241,0.12)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0)" />
            </radialGradient>
          </defs>

          <circle cx={cx} cy={cy} r={145} fill="url(#gaugeGlow)" />

          <path
            d={bgPath}
            fill="none"
            stroke="rgba(30,41,59,0.95)"
            strokeWidth={26}
            strokeLinecap="butt"
          />

          <path
            d={fgPath}
            fill="none"
            stroke={arcStroke}
            strokeWidth={26}
            strokeLinecap="butt"
            className="transition-all duration-300"
          />

          {ticks.map((tick) => {
            const tickAngle = startAngle + sweep * (tick / tickMax);
            const p = polar(tickAngle, 92);
            return (
              <text
                key={tick}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-400 text-[11px] font-semibold"
              >
                {tick}
              </text>
            );
          })}

          <line
            x1={needleStart.x}
            y1={needleStart.y}
            x2={needleEnd.x}
            y2={needleEnd.y}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={8}
            strokeLinecap="round"
          />

          <circle cx={cx} cy={cy} r={10} fill="rgba(255,255,255,0.95)" />
          <circle cx={cx} cy={cy} r={16} fill="rgba(15,23,42,0.55)" />
          <circle cx={cx} cy={cy} r={7} fill="rgba(255,255,255,0.95)" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12">
          {loading ? (
            <Loader2 className="mb-3 h-5 w-5 animate-spin text-slate-300" />
          ) : (
            <Gauge className="mb-3 h-5 w-5 text-slate-500" />
          )}

          <div className={cn("text-6xl font-light tracking-tight", toneClass)}>
            {formatMbps(animatedValue, 2)}
          </div>
          <div className="mt-1 text-sm text-slate-400">Mbps</div>
          <div className="mt-3 text-sm text-slate-300">{label}</div>
          {sublabel ? (
            <div className="mt-1 text-center text-xs text-slate-500">{sublabel}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  accent = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "indigo" | "slate" | "amber";
}) {
  const accentClass =
    accent === "indigo"
      ? "text-indigo-300"
      : accent === "amber"
        ? "text-amber-300"
        : "text-slate-300";

  return (
    <div className="flex min-w-[120px] items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/30 px-4 py-3">
      <div className={accentClass}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="text-base font-medium text-slate-100">{value}</div>
      </div>
    </div>
  );
}

function statusLabel(s?: RemoteSpeedJobStatus | null) {
  if (s === "RUNNING") return "Выполняется";
  if (s === "SUCCEEDED") return "Завершено";
  if (s === "FAILED") return "Ошибка";
  if (s === "QUEUED") return "В очереди";
  if (s === "TIMEOUT") return "Таймаут";
  return "Ожидание";
}

function statusBadgeClass(s?: RemoteSpeedJobStatus | null) {
  if (s === "SUCCEEDED") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }
  if (s === "RUNNING" || s === "QUEUED") {
    return "border-indigo-500/25 bg-indigo-500/10 text-indigo-200";
  }
  if (s === "FAILED" || s === "TIMEOUT") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-200";
  }
  return "border-slate-700 bg-slate-900/30 text-slate-300";
}

export default function RemoteSpeedPage() {
  const router = useRouter();
  const params = useParams();

  const deviceId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [job, setJob] = React.useState<RemoteSpeedJob | null>(null);
  const [result, setResult] = React.useState<RemoteMeasurement | null>(null);
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceSummary | null>(null);

  const [profile, setProfile] = React.useState<SpeedProfile>("std100");
  const [protocol, setProtocol] = React.useState<SpeedProtocol>("udp");
  const [durationSec, setDurationSec] = React.useState(12);

  const pollTimerRef = React.useRef<number | null>(null);

  const stopPolling = React.useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const fetchDeviceInfo = React.useCallback(async () => {
    if (!deviceId) return;

    try {
      const res = await apiFetch<DeviceSummary>(`/devices/${deviceId}`, {
        method: "GET",
        timeoutMs: 30000,
      });

      setDeviceInfo(res ?? null);
    } catch {
      setDeviceInfo(null);
    }
  }, [deviceId]);

  const fetchLatestHistory = React.useCallback(async () => {
    if (!deviceId) return;

    try {
      const res = await apiFetch<RemoteSpeedListResponse>(
        `/devices/${deviceId}/remote-speed/jobs`,
        { method: "GET", timeoutMs: 30000 },
      );

      const latest = res.items?.[0] ?? null;
      if (!latest) return;

      setJob(latest);
      if (latest.measurement) {
        setResult(latest.measurement);
      }
    } catch {
      //
    }
  }, [deviceId]);

  const fetchActiveJob = React.useCallback(async () => {
    if (!deviceId) return;

    try {
      const res = await apiFetch<RemoteSpeedActiveResponse>(
        `/devices/${deviceId}/remote-speed/jobs/active`,
        { method: "GET", timeoutMs: 30000 },
      );

      const activeJob = res.item ?? null;

      if (activeJob) {
        setJob(activeJob);
        setRunning(
          activeJob.status === "QUEUED" || activeJob.status === "RUNNING",
        );

        pollTimerRef.current = window.setTimeout(() => {
          void fetchActiveJob();
        }, 1800);
        return;
      }

      setRunning(false);
      stopPolling();
      await fetchLatestHistory();
    } catch (e: any) {
      if (running) {
        pollTimerRef.current = window.setTimeout(() => {
          void fetchActiveJob();
        }, 3500);
        return;
      }

      setRunning(false);
      setError(e?.message ?? "Не удалось получить статус remote test");
      stopPolling();
    }
  }, [deviceId, running, stopPolling, fetchLatestHistory]);

  React.useEffect(() => {
    if (!deviceId) return;
    void fetchLatestHistory();
    void fetchDeviceInfo();
  }, [deviceId, fetchLatestHistory, fetchDeviceInfo]);

  async function runRemoteTest() {
    if (!deviceId) {
      setError("Не удалось определить ID устройства");
      return;
    }

    setError(null);
    setResult(null);
    setJob(null);
    setRunning(true);
    stopPolling();

    try {
      const res = await apiFetch<RemoteSpeedCreateResponse>(
        `/devices/${deviceId}/remote-speed`,
        {
          method: "POST",
          body: JSON.stringify({
            profile,
            protocol,
            durationSec,
          }),
          timeoutMs: 30000,
        },
      );

      setJob(res.job);

      pollTimerRef.current = window.setTimeout(() => {
        void fetchActiveJob();
      }, 1000);
    } catch (e: any) {
      setRunning(false);
      setError(e?.message ?? "Не удалось запустить remote test");
    }
  }

  if (!deviceId) {
    return (
      <div className="grid gap-4">
        <Card className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
          <div className="text-sm text-rose-100">
            Не удалось определить ID устройства из маршрута.
          </div>
        </Card>
      </div>
    );
  }

  const health = getPrimaryHealth(job);

  const syntheticDownload =
    result?.downloadMbps ??
    job?.rawResult?.final?.downloadMbps ??
    null;

  const realDownload =
    job?.rawResult?.final?.realDownloadMbps ??
    job?.rawResult?.fetchSmall?.throughputMbps ??
    result?.realDownloadMbps ??
    null;

  const displayDownload = realDownload ?? syntheticDownload;

  const displayUpload =
    result?.uploadMbps ??
    job?.rawResult?.final?.uploadMbps ??
    null;

  const displayPing =
    job?.rawResult?.final?.ping?.pingMs ??
    health?.latencyMs ??
    result?.pingMs ??
    null;

  const displayJitter =
    job?.rawResult?.final?.ping?.jitterMs ??
    result?.jitterMs ??
    null;

  const displayPointName =
    deviceInfo?.point?.name ??
    "—";

  const displayDeviceName =
    deviceInfo?.name ??
    deviceInfo?.uid ??
    job?.targetHost ??
    "—";

  const displayDeviceIp =
    deviceInfo?.lastIp ??
    deviceInfo?.queueTargetIp ??
    job?.rawResult?.queueTargetIp ??
    "—";

  const phase = job?.phase ?? null;
  const progress = clamp(job?.progress ?? 0, 0, 100);

  const runningUpload =
    phase === "RUNNING" &&
    (job?.message?.toLowerCase().includes("upload") ?? false);

  const runningDownload =
    phase === "RUNNING" &&
    ((job?.message?.toLowerCase().includes("download") ?? false) ||
      (job?.message?.toLowerCase().includes("fetch") ?? false));

  const gaugeValue =
    runningUpload
      ? displayUpload ?? 0
      : runningDownload
        ? displayDownload ?? 0
        : job?.status === "SUCCEEDED"
          ? displayDownload ?? 0
          : 0;

  const gaugeLabel =
    runningUpload
      ? "Выгрузка"
      : runningDownload
        ? "Загрузка"
        : job?.status === "SUCCEEDED"
          ? "Результат загрузки"
          : "Готов к запуску";

  const gaugeTone: "download" | "upload" | "idle" =
    runningUpload
      ? "upload"
      : runningDownload || job?.status === "SUCCEEDED"
        ? "download"
        : "idle";

  const gaugeSubLabel =
    running
      ? `${job?.message ?? "Выполняется тест"} · ${progress}%`
      : job?.status === "FAILED"
        ? "Тест завершился ошибкой"
        : "Нажми кнопку запуска";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-100">
            RemoteSpeed
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Минималистичный speed-test интерфейс: ping · jitter · download · upload
          </div>
        </div>

        <div className="flex items-center gap-2">
          {job?.id ? (
            <Badge
              variant="outline"
              className={cn("rounded-full", statusBadgeClass(job.status))}
            >
              {statusLabel(job.status)}
            </Badge>
          ) : null}

          <Button
            variant="secondary"
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
            onClick={() => router.push(`/devices/${deviceId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            К устройству
          </Button>
        </div>
      </div>

      <Card className="rounded-[28px] border border-slate-800 bg-slate-950/40 p-5 md:p-8">
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-4 py-3">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Точка
            </div>
            <div className="mt-1 text-sm font-medium text-slate-100">
              {displayPointName}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-4 py-3">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
              <RouterIcon className="h-3.5 w-3.5" />
              Устройство
            </div>
            <div className="mt-1 text-sm font-medium text-slate-100">
              {displayDeviceName}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 px-4 py-3">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
              <Waypoints className="h-3.5 w-3.5" />
              IP устройства
            </div>
            <div className="mt-1 text-sm font-medium text-slate-100">
              {displayDeviceIp}
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <StatPill
            icon={<Timer className="h-4 w-4" />}
            label="Ping"
            value={displayPing != null ? `${formatMs(displayPing)} ms` : "—"}
            accent="amber"
          />

          <StatPill
            icon={<Activity className="h-4 w-4" />}
            label="Jitter"
            value={displayJitter != null ? `${formatMs(displayJitter)} ms` : "—"}
          />

          <StatPill
            icon={<ArrowDownCircle className="h-4 w-4" />}
            label="Download"
            value={displayDownload != null ? `${formatMbps(displayDownload, 2)} Mbps` : "—"}
            accent="indigo"
          />

          <StatPill
            icon={<ArrowUpCircle className="h-4 w-4" />}
            label="Upload"
            value={displayUpload != null ? `${formatMbps(displayUpload, 2)} Mbps` : "—"}
          />
        </div>

        <div className="flex justify-center">
          <SpeedArc
            value={gaugeValue}
            max={1000}
            label={gaugeLabel}
            activeTone={gaugeTone}
            sublabel={gaugeSubLabel}
            loading={running}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/30 px-4 py-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Профиль
              </div>
              <select
                value={profile}
                disabled={running}
                onChange={(e) => setProfile(e.target.value as SpeedProfile)}
                className="mt-1 bg-transparent text-sm text-slate-100 outline-none"
              >
                <option value="auto">auto</option>
                <option value="lite50">lite50</option>
                <option value="std100">std100</option>
                <option value="plus150">plus150</option>
              </select>
            </div>

            <div className="h-10 w-px bg-slate-800" />

            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Протокол
              </div>
              <select
                value={protocol}
                disabled={running}
                onChange={(e) => setProtocol(e.target.value as SpeedProtocol)}
                className="mt-1 bg-transparent text-sm text-slate-100 outline-none"
              >
                <option value="udp">UDP</option>
                <option value="tcp">TCP</option>
              </select>
            </div>

            <div className="h-10 w-px bg-slate-800" />

            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Длительность
              </div>
              <input
                type="number"
                min={5}
                max={15}
                value={durationSec}
                disabled={running}
                onChange={(e) => setDurationSec(Number(e.target.value || 12))}
                className="mt-1 w-20 bg-transparent text-sm text-slate-100 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            className={cn(
              "h-11 min-w-[220px] rounded-xl bg-indigo-600 hover:bg-indigo-500",
              running && "pointer-events-none opacity-90",
            )}
            onClick={runRemoteTest}
          >
            {running ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Выполняем…
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                Запустить тест
              </>
            )}
          </Button>

          {error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {job?.status === "FAILED" && job?.errorMessage ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {job.errorMessage}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}