"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  RefreshCw,
  Router as RouterIcon,
  ShieldCheck,
  Waypoints,
  Wifi,
  Activity,
  Cpu,
  TimerReset,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type MeasurementStatus = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
type RemoteSpeedJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMEOUT";
type SpeedProtocol = "tcp" | "udp";
type SpeedProfile = "auto" | "lite50" | "std100" | "plus150";

type RemoteMeasurement = {
  id: string;
  downloadMbps: number;
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

    healthBefore?: HealthSnapshot;
    healthUnderLoad?: HealthSnapshot;

    uploadTest?: DirectionTestDetails;
    downloadTest?: DirectionTestDetails;

    final?: {
      uploadMbps?: number;
      downloadMbps?: number;
      health?: HealthSnapshot;
      profileKey?: string;
      cpuLoad?: number | null;
      latencyMs?: number | null;
    };

    error?: string;
  } | null;

  measurement?: RemoteMeasurement | null;
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

function formatMbps(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}`;
}

function formatMs(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}`;
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function formatTunnelState(value?: boolean | null) {
  if (value === true) return "UP";
  if (value === false) return "DOWN";
  return "—";
}

function statusLabel(s: MeasurementStatus) {
  if (s === "EXCELLENT") return "Отлично";
  if (s === "GOOD") return "Хорошо";
  if (s === "FAIR") return "Норм";
  if (s === "POOR") return "Плохо";
  return "Неизвестно";
}

function statusBadgeClass(s: MeasurementStatus) {
  if (s === "EXCELLENT") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (s === "GOOD") return "border-indigo-500/25 bg-indigo-500/10 text-indigo-200";
  if (s === "FAIR") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  if (s === "POOR") return "border-rose-500/25 bg-rose-500/10 text-rose-200";
  return "border-slate-700 bg-slate-900/30 text-slate-300";
}

function profileLabel(profile?: string | null) {
  if (profile === "lite50") return "lite50";
  if (profile === "std100") return "std100";
  if (profile === "plus150") return "plus150";
  if (profile === "auto") return "auto";
  return "—";
}

function protocolLabel(protocol?: SpeedProtocol | null) {
  if (protocol === "udp") return "UDP";
  if (protocol === "tcp") return "TCP";
  return "—";
}

function jobStateLabel(job: RemoteSpeedJob | null) {
  if (!job) return "Ожидание";
  if (job.status === "QUEUED") return "В очереди";
  if (job.status === "RUNNING") return "Выполняется";
  if (job.status === "SUCCEEDED") return "Завершено";
  if (job.status === "TIMEOUT") return "Таймаут";
  return "Ошибка";
}

function jobPhaseLabel(phase?: string | null) {
  switch (phase) {
    case "QUEUED":
      return "В очереди";
    case "PREPARING":
      return "Подготовка";
    case "HEALTH_CHECK":
      return "Проверка устройства";
    case "QUEUE_ATTACH":
      return "Подключение очереди";
    case "RUNNING":
      return "Тест скорости";
    case "QUEUE_DETACH":
      return "Снятие очереди";
    case "COLLECTING":
      return "Сохранение";
    case "COOLING":
      return "Стабилизация";
    case "DONE":
      return "Готово";
    case "FAILED":
      return "Ошибка";
    default:
      return "Ожидание";
  }
}

function toneCard(
  tone: "indigo" | "emerald" | "amber" | "slate" = "slate",
) {
  if (tone === "indigo") {
    return "border-indigo-500/20 bg-indigo-500/10";
  }
  if (tone === "emerald") {
    return "border-emerald-500/20 bg-emerald-500/10";
  }
  if (tone === "amber") {
    return "border-amber-500/20 bg-amber-500/10";
  }
  return "border-slate-800 bg-slate-900/20";
}

function Field({
  label,
  children,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function InfoTile({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
      <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
        {icon}
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function MetricTile({
  title,
  value,
  unit,
  tone = "slate",
}: {
  title: string;
  value: string;
  unit?: string;
  tone?: "indigo" | "emerald" | "amber" | "slate";
}) {
  return (
    <div className={cn("rounded-2xl border p-4", toneCard(tone))}>
      <div className="text-xs font-medium text-slate-400">{title}</div>
      <div className="mt-2 flex items-end gap-2">
        <div className="text-3xl font-semibold tracking-tight text-slate-50">
          {value}
        </div>
        {unit ? <div className="pb-1 text-sm text-slate-400">{unit}</div> : null}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

function getPrimaryHealth(job: RemoteSpeedJob | null): HealthSnapshot | null {
  return (
    job?.rawResult?.final?.health ??
    job?.rawResult?.healthUnderLoad ??
    job?.rawResult?.healthBefore ??
    null
  );
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

  const [target, setTarget] = React.useState("10.20.20.2");
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
      // Молча игнорируем: это вторичный запрос.
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
        }, 2500);
        return;
      }

      setRunning(false);
      stopPolling();
      await fetchLatestHistory();
    } catch (e: any) {
      if (running) {
        pollTimerRef.current = window.setTimeout(() => {
          void fetchActiveJob();
        }, 4000);
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
  }, [deviceId, fetchLatestHistory]);

  async function runRemoteTest() {
    if (!deviceId) {
      setError("Не удалось определить ID устройства");
      return;
    }

    if (!target.trim()) {
      setError("Укажи target host");
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
            target: target.trim(),
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
      }, 1200);
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

  const progress = clamp(job?.progress ?? 0, 0, 100);
  const health = getPrimaryHealth(job);

  const displayDownload =
    result?.downloadMbps ??
    job?.rawResult?.final?.downloadMbps ??
    null;

  const displayUpload =
    result?.uploadMbps ??
    job?.rawResult?.final?.uploadMbps ??
    null;

  const displayLatency =
    health?.latencyMs ??
    result?.pingMs ??
    null;

  const displayCpu =
    job?.rawResult?.final?.cpuLoad ??
    health?.cpuLoad ??
    null;

  const resolvedProfile =
    job?.rawResult?.final?.profileKey ??
    job?.rawResult?.resolvedProfile ??
    profile;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-100">RemoteSpeed</div>
          <div className="mt-1 text-xs text-slate-400">
            Удалённая проверка устройства через MikroTik health-check + dual bandwidth-test
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
              <RouterIcon className="h-4 w-4 text-indigo-300" />
              Remote test
            </div>

            {result?.status ? (
              <Badge
                variant="outline"
                className={cn("rounded-full", statusBadgeClass(result.status))}
              >
                {statusLabel(result.status)}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="rounded-full border-slate-700 bg-slate-900/30 text-slate-300"
              >
                {jobStateLabel(job)}
              </Badge>
            )}
          </div>

          <Separator className="my-4 bg-slate-800" />

          <div className="grid gap-4">
            <Field
              label="Target host"
              icon={<RouterIcon className="h-4 w-4 text-slate-400" />}
            >
              <input
                value={target}
                disabled={running}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="10.20.20.2"
                className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/30 px-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500/40"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Profile"
                icon={<Waypoints className="h-4 w-4 text-slate-400" />}
              >
                <select
                  value={profile}
                  disabled={running}
                  onChange={(e) => setProfile(e.target.value as SpeedProfile)}
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/30 px-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500/40"
                >
                  <option value="auto">auto</option>
                  <option value="lite50">lite50</option>
                  <option value="std100">std100</option>
                  <option value="plus150">plus150</option>
                </select>
              </Field>

              <Field
                label="Protocol"
                icon={<Wifi className="h-4 w-4 text-slate-400" />}
              >
                <select
                  value={protocol}
                  disabled={running}
                  onChange={(e) => setProtocol(e.target.value as SpeedProtocol)}
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/30 px-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500/40"
                >
                  <option value="udp">UDP</option>
                  <option value="tcp">TCP</option>
                </select>
              </Field>
            </div>

            <Field
              label="Duration"
              icon={<TimerReset className="h-4 w-4 text-slate-400" />}
            >
              <input
                type="number"
                min={5}
                max={15}
                value={durationSec}
                disabled={running}
                onChange={(e) => setDurationSec(Number(e.target.value || 12))}
                className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/30 px-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500/40"
              />
            </Field>

            {job ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-200">
                    {jobPhaseLabel(job.phase)}
                  </div>
                  <div className="text-xs text-slate-400">{progress}%</div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  {job.message ?? "—"}
                </div>
              </div>
            ) : null}

            <div className="mt-1 grid gap-3">
              <Button
                className={cn(
                  "h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500",
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
                    {result ? "Запустить снова" : "Запустить remote test"}
                  </>
                )}
              </Button>

              {error ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div className="min-w-0">
                      <div className="font-medium">Ошибка remote test</div>
                      <div className="mt-1 break-words text-rose-100/80">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Проверка выполняется на MikroTik: health-check + dual bandwidth-test
                  (upload → download).
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-200">Детали remote test</div>

            {job?.id ? (
              <Badge
                variant="outline"
                className="rounded-full border-slate-700 bg-slate-900/30 text-slate-300"
              >
                Job: {job.id.slice(0, 8)}…
              </Badge>
            ) : null}
          </div>

          <Separator className="my-4 bg-slate-800" />

          {!result && !job?.rawResult?.final ? (
            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-sm text-slate-300">
                {running
                  ? "Идёт удалённая проверка устройства…"
                  : "Запусти remote test, чтобы увидеть измерение."}
              </div>

              {job ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoTile
                    icon={<Clock3 className="h-4 w-4 text-slate-400" />}
                    title="Состояние job"
                  >
                    <div className="text-sm text-slate-100">{jobStateLabel(job)}</div>
                    <div className="mt-1 text-xs text-slate-400">{job.message ?? "—"}</div>
                  </InfoTile>

                  <InfoTile
                    icon={<Gauge className="h-4 w-4 text-slate-400" />}
                    title="Фаза / прогресс"
                  >
                    <div className="text-sm text-slate-100">{jobPhaseLabel(job.phase)}</div>
                    <div className="mt-1 text-xs text-slate-400">{progress}%</div>
                  </InfoTile>

                  <InfoTile
                    icon={<Waypoints className="h-4 w-4 text-slate-400" />}
                    title="Профиль / протокол"
                  >
                    <div className="text-sm text-slate-100">
                      {profileLabel(job.rawResult?.resolvedProfile ?? profile)} /{" "}
                      {protocolLabel(job.protocol ?? protocol)}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {job.durationSec ?? durationSec} сек
                    </div>
                  </InfoTile>

                  <InfoTile
                    icon={<RouterIcon className="h-4 w-4 text-slate-400" />}
                    title="Цель"
                  >
                    <div className="text-sm text-slate-100">{job.targetHost ?? target}</div>
                  </InfoTile>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile
                  title="Загрузка"
                  value={formatMbps(displayDownload)}
                  unit={displayDownload != null ? "Мбит/с" : ""}
                  tone="indigo"
                />
                <MetricTile
                  title="Отдача"
                  value={formatMbps(displayUpload)}
                  unit={displayUpload != null ? "Мбит/с" : ""}
                  tone="emerald"
                />
                <MetricTile
                  title="Latency"
                  value={formatMs(displayLatency)}
                  unit={displayLatency != null ? "мс" : ""}
                  tone="amber"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="CPU" value={formatPercent(displayCpu)} />
                <MiniStat label="Профиль" value={profileLabel(resolvedProfile)} />
                <MiniStat
                  label="Туннель"
                  value={formatTunnelState(job?.rawResult?.healthUnderLoad?.tunnelRunning)}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <InfoTile
                  icon={<ShieldCheck className="h-4 w-4 text-slate-400" />}
                  title="Health before"
                >
                  <div className="grid gap-2 text-sm text-slate-100">
                    <div>Latency: {formatMs(job?.rawResult?.healthBefore?.latencyMs)} мс</div>
                    <div>CPU: {formatPercent(job?.rawResult?.healthBefore?.cpuLoad)}</div>
                    <div>
                      Tunnel: {formatTunnelState(job?.rawResult?.healthBefore?.tunnelRunning)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {job?.rawResult?.healthBefore?.reason ?? "—"}
                    </div>
                  </div>
                </InfoTile>

                <InfoTile
                  icon={<Activity className="h-4 w-4 text-slate-400" />}
                  title="Health under load"
                >
                  <div className="grid gap-2 text-sm text-slate-100">
                    <div>Latency: {formatMs(job?.rawResult?.healthUnderLoad?.latencyMs)} мс</div>
                    <div>CPU: {formatPercent(job?.rawResult?.healthUnderLoad?.cpuLoad)}</div>
                    <div>
                      Tunnel: {formatTunnelState(job?.rawResult?.healthUnderLoad?.tunnelRunning)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {job?.rawResult?.healthUnderLoad?.reason ?? "—"}
                    </div>
                  </div>
                </InfoTile>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <InfoTile
                  icon={<Wifi className="h-4 w-4 text-slate-400" />}
                  title="Upload test"
                >
                  <div className="grid gap-2 text-sm text-slate-100">
                    <div>Direction: {job?.rawResult?.uploadTest?.direction ?? "transmit"}</div>
                    <div>Protocol: {protocolLabel(job?.rawResult?.uploadTest?.protocol ?? protocol)}</div>
                    <div>Remote CPU: {formatPercent(job?.rawResult?.uploadTest?.remoteCpuLoad)}</div>
                    <div>Connections: {job?.rawResult?.uploadTest?.connectionCount ?? "—"}</div>
                  </div>
                </InfoTile>

                <InfoTile
                  icon={<Cpu className="h-4 w-4 text-slate-400" />}
                  title="Download test"
                >
                  <div className="grid gap-2 text-sm text-slate-100">
                    <div>Direction: {job?.rawResult?.downloadTest?.direction ?? "receive"}</div>
                    <div>Protocol: {protocolLabel(job?.rawResult?.downloadTest?.protocol ?? protocol)}</div>
                    <div>Remote CPU: {formatPercent(job?.rawResult?.downloadTest?.remoteCpuLoad)}</div>
                    <div>Connections: {job?.rawResult?.downloadTest?.connectionCount ?? "—"}</div>
                  </div>
                </InfoTile>
              </div>

              {result ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Сохранённое измерение
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <MiniStat label="Download" value={`${result.downloadMbps} Мбит/с`} />
                    <MiniStat label="Upload" value={`${result.uploadMbps} Мбит/с`} />
                    <MiniStat label="Ping / latency" value={result.pingMs != null ? `${result.pingMs} мс` : "—"} />
                    <MiniStat label="Статус" value={statusLabel(result.status)} />
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <MiniStat
                      label="Jitter"
                      value={
                        result.jitterMs != null ? `${result.jitterMs} мс` : "—"
                      }
                    />
                    <MiniStat
                      label="Packet loss"
                      value={
                        result.packetLoss != null ? `${result.packetLoss}%` : "—"
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {running ? (
            <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-100">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Воркeр выполняет health-check, затем upload и download тесты по очереди.
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}