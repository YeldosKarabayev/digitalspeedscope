"use client";

import * as React from "react";
import { useRange, RANGE_LABELS } from "@/components/layout/RangeContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Activity, Wifi, Globe, Server, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import { ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type RunResponse = {
    ok: boolean;
    measurementId: string;
    status: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
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
    createdAt?: string;
};

type PhaseKey = "idle" | "connect" | "ping" | "download" | "upload" | "final";

function phaseLabel(phase: PhaseKey) {
    switch (phase) {
        case "connect": return "Подключение";
        case "ping": return "Задержка";
        case "download": return "Загрузка";
        case "upload": return "Отдача";
        case "final": return "Финализация";
        default: return "Ожидание";
    }
}

function statusLabel(s: RunResponse["status"]) {
    if (s === "EXCELLENT") return "Отлично";
    if (s === "GOOD") return "Хорошо";
    if (s === "FAIR") return "Норм";
    return "Плохо";
}

function statusBadgeClass(s: RunResponse["status"]) {
    if (s === "EXCELLENT") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
    if (s === "GOOD") return "border-indigo-500/25 bg-indigo-500/10 text-indigo-200";
    if (s === "FAIR") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
    return "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}

/** Простая "анимация прогресса" + фразы */
function usePhases(running: boolean) {
    const [p, setP] = React.useState(0);
    const [label, setLabel] = React.useState("Готов к запуску");
    const [phase, setPhase] = React.useState<PhaseKey>("idle");

    React.useEffect(() => {
        if (!running) {
            setP(0);
            setLabel("Готов к запуску");
            setPhase("idle");
            return;
        }

        let alive = true;
        const phases: Array<{ t: number; p: number; phase: PhaseKey; label: string }> = [
            { t: 250, p: 8, phase: "connect", label: "Подключаемся к серверу…" },
            { t: 900, p: 28, phase: "ping", label: "Измеряем задержку…" },
            { t: 1800, p: 62, phase: "download", label: "Измеряем загрузку…" },
            { t: 3200, p: 86, phase: "upload", label: "Измеряем отдачу…" },
            { t: 5200, p: 96, phase: "final", label: "Обрабатываем результаты…" },
        ];

        let i = 0;
        const tick = () => {
            if (!alive) return;
            const cur = phases[i];
            if (!cur) return;

            window.setTimeout(() => {
                if (!alive) return;
                setP(cur.p);
                setPhase(cur.phase);
                setLabel(cur.label);
                i += 1;
                if (i < phases.length) tick();
            }, cur.t);
        };

        tick();
        return () => {
            alive = false;
        };
    }, [running]);

    return { p, label, phase };
}


export default function SpeedTestScreen() {
    const router = useRouter();
    const { range } = useRange();
    const rangeLabel = RANGE_LABELS[range];

    const [running, setRunning] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [result, setResult] = React.useState<RunResponse | null>(null);

    const { p, label, phase } = usePhases(running);
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

    const [live, setLive] = React.useState({ dl: 0, ul: 0, ping: 0 });

    React.useEffect(() => {
        if (!running) {
            setLive({ dl: 0, ul: 0, ping: 0 });
            return;
        }

        let alive = true;
        const t = window.setInterval(() => {
            if (!alive) return;

            setLive((prev) => {
                // “псевдо-реалистичные” прыжки по фазам
                const basePing = phase === "ping" ? 12 : phase === "download" ? 14 : phase === "upload" ? 16 : 15;
                const ping = clamp(Math.round(basePing + (Math.random() - 0.45) * 10), 6, 80);

                const dlTarget =
                    phase === "download" ? 320 :
                        phase === "upload" ? 360 :
                            phase === "final" ? 380 : 120;

                const ulTarget =
                    phase === "upload" ? 180 :
                        phase === "final" ? 190 : 60;

                const dl = clamp(Math.round(prev.dl + (dlTarget - prev.dl) * 0.22 + (Math.random() - 0.5) * 8), 0, 1000);
                const ul = clamp(Math.round(prev.ul + (ulTarget - prev.ul) * 0.22 + (Math.random() - 0.5) * 6), 0, 1000);

                return { dl, ul, ping };
            });
        }, 180);

        return () => {
            alive = false;
            window.clearInterval(t);
        };
    }, [running, phase]);


    async function runTest() {
        setError(null);
        setResult(null);
        setRunning(true);

        try {
            const json = await apiFetch<RunResponse>("/measurements/run", {
                method: "POST",
                body: JSON.stringify({}),
            });

            setResult(json);
        } catch (e: any) {
            setError(e?.message ?? "Не удалось выполнить измерение");
        } finally {
            setRunning(false);
        }
    }

    // “спидометр”: один показатель, чтобы выглядело премиально
    const gaugeValue = React.useMemo(() => {
        if (running) return clamp(live.dl, 0, 500); // показ в Мбит/с (до 500 “в шкале”)
        if (!result) return 0;
        return clamp(result.downloadMbps, 0, 500);
    }, [running, live.dl, result]);


    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-100">SpeedTest</div>
                    <div className="mt-1 text-xs text-slate-400">
                        Измерение текущего подключения API · Период в аналитике:{" "}
                        <span className="text-slate-200">{rangeLabel}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                        onClick={() => router.push("/measurements")}
                    >
                        Открыть измерения <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
                {/* LEFT: Gauge + CTA */}
                <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                    <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                            <Activity className="h-4 w-4 text-indigo-300" />
                            Тест скорости
                        </div>

                        {result?.status ? (
                            <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(result.status))}>
                                {statusLabel(result.status)}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-900/30 text-slate-300">
                                {running ? "Выполняется…" : "Ожидание"}
                            </Badge>
                        )}
                    </div>

                    <Separator className="my-4 bg-slate-800" />

                    <div className="relative mx-auto grid h-[220px] w-[220px] place-items-center">
                        {/* круг с “премиальным” свечением */}
                        <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-2xl" />
                        <div className="relative grid h-[220px] w-[220px] place-items-center rounded-full border border-slate-800 bg-slate-950/60">
                            <RingProgress value={gaugeValue} />

                            <div className="absolute grid place-items-center text-center">
                                <div className="text-[11px] text-slate-400">
                                    {running ? phaseLabel(phase) : "Download"}
                                </div>

                                <div className="mt-1 text-3xl font-semibold text-slate-100">
                                    {running ? `${gaugeValue}` : result ? `${result.downloadMbps}` : "—"}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                    {running ? label : result ? "Мбит/с" : "Нажми “Запустить”"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/60">
                            <div
                                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${running ? p : result ? 100 : 0}%` }}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px]">
                            <Chip active={running && phase === "ping"}>Ping</Chip>
                            <Chip active={running && phase === "download"}>Download</Chip>
                            <Chip active={running && phase === "upload"}>Upload</Chip>
                            <Chip active={running && phase === "final"}>Finish</Chip>
                        </div>

                        {running ? (
                            <div className="grid grid-cols-3 gap-2">
                                <MiniStat label="DL (live)" value={`${live.dl} Мбит/с`} />
                                <MiniStat label="UL (live)" value={`${live.ul} Мбит/с`} />
                                <MiniStat label="Ping (live)" value={`${live.ping} мс`} />
                            </div>
                        ) : null}
                    </div>


                    <div className="mt-5 grid gap-3">
                        <Button
                            className={cn(
                                "h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500",
                                running && "pointer-events-none opacity-90"
                            )}
                            onClick={runTest}
                        >
                            {running ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Измеряем…
                                </>
                            ) : (
                                <>
                                    <Wifi className="mr-2 h-4 w-4" />
                                    {result ? "Повторить измерение" : "Запустить измерение"}
                                </>
                            )}
                        </Button>

                        {error ? (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                                    <div className="min-w-0">
                                        <div className="font-medium">Ошибка измерения</div>
                                        <div className="mt-1 text-rose-100/80 break-words">{error}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500">
                                Под капотом: Ookla Speedtest CLI на машине, где запущен API.
                            </div>
                        )}
                    </div>
                </Card>

                {/* RIGHT: Details */}
                <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-200">Детали измерения</div>
                        {result?.measurementId ? (
                            <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-900/30 text-slate-300">
                                ID: {result.measurementId.slice(0, 8)}…
                            </Badge>
                        ) : null}
                    </div>

                    <Separator className="my-4 bg-slate-800" />

                    {!result ? (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-sm text-slate-300">
                            {running ? "Идёт измерение… результаты появятся здесь." : "Запусти измерение, чтобы увидеть детали."}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <MetricTile title="Загрузка" value={`${result.downloadMbps}`} unit="Мбит/с" tone="indigo" />
                                <MetricTile title="Отдача" value={`${result.uploadMbps}`} unit="Мбит/с" tone="emerald" />
                                <MetricTile title="Ping" value={`${result.pingMs}`} unit="мс" tone="amber" />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoTile icon={<Globe className="h-4 w-4 text-slate-400" />} title="Провайдер / IP">
                                    <div className="text-sm text-slate-100">{result.isp ?? "—"}</div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <div className="text-xs text-slate-400">{result.ip ?? "—"}</div>
                                        {result.ip ? <CopyIpButton value={result.ip} /> : null}
                                    </div>

                                </InfoTile>

                                <InfoTile icon={<Server className="h-4 w-4 text-slate-400" />} title="Сервер измерений">
                                    <div className="text-sm text-slate-100">{result.serverName ?? "—"}</div>
                                    <div className="mt-1 text-xs text-slate-400">
                                        {[result.serverLocation, result.serverCountry].filter(Boolean).join(", ") || "—"}
                                    </div>
                                </InfoTile>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <MiniStat label="Jitter" value={result.jitterMs != null ? `${Math.round(result.jitterMs)} мс` : "—"} />
                                <MiniStat label="Packet loss" value={result.packetLoss != null ? `${result.packetLoss}%` : "—"} />
                                <MiniStat label="Статус" value={statusLabel(result.status)} />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/20 px-4 py-3">
                                <div className="text-xs text-slate-400">
                                    {result.createdAt ? `Сохранено: ${new Date(result.createdAt).toLocaleString("ru-RU")}` : "Сохранено в БД"}
                                </div>

                                {result.resultUrl ? (
                                    <Button
                                        variant="secondary"
                                        className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                                        onClick={() => window.open(result.resultUrl!, "_blank")}
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Открыть результат
                                    </Button>
                                ) : null}


                                <Button
                                    variant="secondary"
                                    className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                                    onClick={() => router.push("/measurements")}
                                >
                                    Перейти в “Измерения” <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
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

/** SVG ring progress: выглядит “дорого”, не требует библиотек */
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

function Chip({ active, children }: { active?: boolean; children: React.ReactNode }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5",
                active
                    ? "border-indigo-500/30 bg-indigo-600/15 text-indigo-200"
                    : "border-slate-800 bg-slate-900/30 text-slate-300"
            )}
        >
            {children}
        </span>
    );
}

function CopyIpButton({ value }: { value: string }) {
    const [ok, setOk] = React.useState(false);

    return (
        <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-lg px-2 text-xs text-slate-300 hover:bg-slate-900"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    setOk(true);
                    window.setTimeout(() => setOk(false), 900);
                } catch { }
            }}
        >
            {ok ? <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-300" /> : <Copy className="mr-1 h-4 w-4" />}
            {ok ? "Скопировано" : "Копировать"}
        </Button>
    );
}

