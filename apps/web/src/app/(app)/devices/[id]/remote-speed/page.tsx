"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Wifi,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Router as RouterIcon,
  Gauge,
  CheckCircle2,
  Clock3,
  ArrowLeft,
  Target,
  TimerReset,
  Waypoints,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type MeasurementStatus =
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "UNKNOWN";

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

type RemoteSpeedJob = {
  id: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  progress?: number | null;
  phase?: string | null;
  message?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;

  targetHost?: string | null;
  protocol?: "tcp" | "udp" | null;
  direction?: "both" | "transmit" | "receive" | null;
  durationSec?: number | null;

  measurement?: RemoteMeasurement | null;
};

type RemoteSpeedCreateResponse = {
  ok: boolean;
  reused?: boolean;
  job: RemoteSpeedJob;
};

type RemoteSpeedListResponse = {
  ok: boolean;
  items: RemoteSpeedJob[];
};

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

function jobStateLabel(job: RemoteSpeedJob | null) {
  if (!job) return "Ожидание";
  if (job.status === "QUEUED") return "В очереди";
  if (job.status === "RUNNING") return "Выполняется";
  if (job.status === "SUCCEEDED") return "Завершено";
  return "Ошибка";
}

function jobPhaseLabel(phase?: string | null) {
  switch (phase) {
    case "QUEUED":
      return "В очереди";
    case "CONNECTING":
      return "Подключение";
    case "PING":
      return "Ping";
    case "TRAFFIC":
      return "Трафик";
    case "BANDWIDTH_TEST":
      return "Bandwidth test";
    case "SAVING":
      return "Сохранение";
    case "DONE":
      return "Готово";
    case "FAILED":
      return "Ошибка";
    default:
      return "Ожидание";
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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

  const [target, setTarget] = React.useState("10.10.20.2");
  const [protocol, setProtocol] = React.useState<"tcp" | "udp">("tcp");
  const [direction, setDirection] = React.useState<"both" | "transmit" | "receive">("both");
  const [durationSec, setDurationSec] = React.useState(20);

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

  const fetchJobs = React.useCallback(async () => {
    if (!deviceId) return;

    const res = await apiFetch<RemoteSpeedListResponse>(
      `/devices/${deviceId}/remote-speed/jobs`,
      { method: "GET", timeoutMs: 15000, }
    );

    const latest = res.items?.[0] ?? null;
    setJob(latest);

    if (latest?.status === "SUCCEEDED" && latest.measurement) {
      setResult(latest.measurement);
      setRunning(false);
      stopPolling();
    } else if (latest?.status === "FAILED") {
      setRunning(false);
      setError(latest.errorMessage ?? "Remote test failed");
      stopPolling();
    } else if (
      latest &&
      (latest.status === "QUEUED" || latest.status === "RUNNING")
    ) {
      pollTimerRef.current = window.setTimeout(() => {
        void fetchJobs();
      }, 2000);
    } else {
      setRunning(false);
      stopPolling();
    }
  }, [deviceId, stopPolling]);

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
            protocol,
            direction,
            durationSec,
          }),
          timeoutMs: 30000,
        }
      );

      setJob(res.job);

      pollTimerRef.current = window.setTimeout(() => {
        void fetchJobs();
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
  const gaugeValue = result ? clamp(result.downloadMbps, 0, 500) : 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-100">RemoteSpeed</div>
          <div className="mt-1 text-xs text-slate-400">
            Удалённая проверка устройства через MikroTik API
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
              <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(result.status))}>
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

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Target host" icon={<Target className="h-4 w-4 text-slate-400" />}>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={running}
                  placeholder="10.10.0.2"
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/30 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500/40"
                />
              </Field>

              <Field label="Duration" icon={<TimerReset className="h-4 w-4 text-slate-400" />}>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={durationSec}
                  disabled={running}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDurationSec(Number.isFinite(next) ? clamp(next, 3, 60) : 20);
                  }}
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/30 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500/40"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Protocol" icon={<Wifi className="h-4 w-4 text-slate-400" />}>
                <select
                  value={protocol}
                  disabled={running}
                  onChange={(e) => setProtocol(e.target.value as "tcp" | "udp")}
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/30 px-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500/40"
                >
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                </select>
              </Field>

              <Field label="Direction" icon={<Waypoints className="h-4 w-4 text-slate-400" />}>
                <select
                  value={direction}
                  disabled={running}
                  onChange={(e) =>
                    setDirection(e.target.value as "both" | "transmit" | "receive")
                  }
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/30 px-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500/40"
                >
                  <option value="both">both</option>
                  <option value="transmit">transmit</option>
                  <option value="receive">receive</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="relative mx-auto mt-5 grid h-[220px] w-[220px] place-items-center">
            <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-2xl" />
            <div className="relative grid h-[220px] w-[220px] place-items-center rounded-full border border-slate-800 bg-slate-950/60">
              <RingProgress value={gaugeValue} />
              <div className="absolute grid place-items-center text-center">
                <div className="text-[11px] text-slate-400">
                  {result ? "Download" : jobPhaseLabel(job?.phase)}
                </div>

                <div className="mt-1 text-3xl font-semibold text-slate-100">
                  {result ? `${result.downloadMbps}` : `${progress}%`}
                </div>

                <div className="mt-1 max-w-[150px] text-xs text-slate-400">
                  {result ? "Мбит/с" : job?.message ?? "Нажми “Запустить”"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/60">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${result ? 100 : progress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Статус" value={job ? jobStateLabel(job) : "Ожидание"} />
              <MiniStat label="Фаза" value={jobPhaseLabel(job?.phase)} />
              <MiniStat label="Прогресс" value={`${result ? 100 : progress}%`} />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <Button
              className={cn(
                "h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500",
                running && "pointer-events-none opacity-90"
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
                    <div className="mt-1 break-words text-rose-100/80">{error}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Проверка выполняется на MikroTik: ping + bandwidth-test.
              </div>
            )}
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

          {!result ? (
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
                    icon={<Wifi className="h-4 w-4 text-slate-400" />}
                    title="Параметры теста"
                  >
                    <div className="text-sm text-slate-100">
                      {job.protocol ?? protocol} / {job.direction ?? direction}
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
                <MetricTile title="Загрузка" value={`${result.downloadMbps}`} unit="Мбит/с" tone="indigo" />
                <MetricTile title="Отдача" value={`${result.uploadMbps}`} unit="Мбит/с" tone="emerald" />
                <MetricTile
                  title="Ping"
                  value={result.pingMs != null ? `${result.pingMs}` : "—"}
                  unit={result.pingMs != null ? "мс" : ""}
                  tone="amber"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Jitter"
                  value={result.jitterMs != null ? `${Math.round(result.jitterMs)} мс` : "—"}
                />
                <MiniStat
                  label="Packet loss"
                  value={result.packetLoss != null ? `${result.packetLoss}%` : "—"}
                />
                <MiniStat label="Статус" value={statusLabel(result.status)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat label="Target" value={job?.targetHost ?? target} />
                <MiniStat label="Protocol" value={job?.protocol ?? protocol} />
                <MiniStat label="Direction" value={job?.direction ?? direction} />
                <MiniStat
                  label="Duration"
                  value={`${job?.durationSec ?? durationSec} сек`}
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-3">
                <div className="flex items-start gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <div>
                    {result.createdAt
                      ? `Измерение сохранено: ${new Date(result.createdAt).toLocaleString("ru-RU")}`
                      : "Измерение сохранено в БД"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3">
                <Button
                  variant="secondary"
                  className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                  onClick={() => router.push(`/devices/${deviceId}`)}
                >
                  Назад к устройству <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </label>
  );
}

function MetricTile({
  title,
  value,
  unit,
  tone,
}: {
  title: string;
  value: string;
  unit: string;
  tone: "indigo" | "emerald" | "amber";
}) {
  const toneCls =
    tone === "indigo"
      ? "border-indigo-500/20 bg-indigo-500/10"
      : tone === "emerald"
        ? "border-emerald-500/20 bg-emerald-500/10"
        : "border-amber-500/20 bg-amber-500/10";

  return (
    <div className={cn("rounded-xl border p-4", toneCls)}>
      <div className="text-xs text-slate-400">{title}</div>
      <div className="mt-1 flex items-end gap-2">
        <div className="text-2xl font-semibold text-slate-100">{value}</div>
        <div className="pb-1 text-xs text-slate-400">{unit}</div>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {icon}
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

function RingProgress({ value, max = 500 }: { value: number; max?: number }) {
  const radius = 92;
  const stroke = 10;
  const c = 2 * Math.PI * radius;
  const pct = clamp(Math.round((clamp(value, 0, max) / max) * 100), 0, 100);
  const offset = c - (pct / 100) * c;

  return (
    <svg width="220" height="220" className="block">
      <defs>
        <linearGradient id="dssGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="1" />
          <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="1" />
        </linearGradient>
      </defs>

      <circle
        cx="110"
        cy="110"
        r={radius}
        fill="none"
        stroke="rgba(148,163,184,0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx="110"
        cy="110"
        r={radius}
        fill="none"
        stroke="url(#dssGradient)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={offset}
        transform="rotate(-90 110 110)"
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  );
}