import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "indigo" | "green" | "amber" | "red" | "slate";

export type KpiCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tone?: Tone;

  // изменение показателя (например +12.4%)
  delta?: {
    value: number; // например 12.4
    label?: string; // например "за 24ч"
  };

  // мини-график (простейший)
  spark?: number[]; // 0..100 (любые числа)
};

function toneClasses(tone: Tone) {
  switch (tone) {
    case "indigo":
      return {
        ring: "ring-indigo-500/15",
        iconBg: "bg-indigo-600/15",
        icon: "text-indigo-300",
        glow: "from-indigo-500/25 to-transparent",
      };
    case "green":
      return {
        ring: "ring-emerald-500/15",
        iconBg: "bg-emerald-600/15",
        icon: "text-emerald-300",
        glow: "from-emerald-500/25 to-transparent",
      };
    case "amber":
      return {
        ring: "ring-amber-500/15",
        iconBg: "bg-amber-600/15",
        icon: "text-amber-300",
        glow: "from-amber-500/25 to-transparent",
      };
    case "red":
      return {
        ring: "ring-rose-500/15",
        iconBg: "bg-rose-600/15",
        icon: "text-rose-300",
        glow: "from-rose-500/25 to-transparent",
      };
    default:
      return {
        ring: "ring-slate-500/10",
        iconBg: "bg-slate-600/15",
        icon: "text-slate-200",
        glow: "from-slate-400/20 to-transparent",
      };
  }
}

function formatDelta(v: number) {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  const abs = Math.abs(v);
  // показываем до 1 знака после запятой, если нужно
  const txt = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);
  return `${sign}${txt}%`;
}

function clampSpark(values: number[]) {
  if (!values.length) return values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 50);
  return values.map((v) => ((v - min) / (max - min)) * 100);
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "indigo",
  delta,
  spark,
}: KpiCardProps) {
  const t = toneClasses(tone);

  const deltaPositive = (delta?.value ?? 0) > 0;
  const deltaNegative = (delta?.value ?? 0) < 0;

  const sparkNorm = spark ? clampSpark(spark) : null;

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl border-slate-800 bg-slate-950/40 p-5",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
        "ring-1",
        t.ring
      )}
    >
      {/* мягкий градиент сверху (как в премиум dashboards) */}
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", t.glow)} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-slate-400">{title}</div>

          <div className="mt-2 flex items-end gap-3">
            <div className="text-2xl font-semibold tracking-tight text-slate-100">
              {value}
            </div>

            {delta ? (
              <div
                className={cn(
                  "mb-[2px] inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
                  deltaPositive && "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
                  deltaNegative && "border-rose-500/25 bg-rose-500/10 text-rose-200",
                  !deltaPositive && !deltaNegative && "border-slate-700 bg-slate-900/50 text-slate-300"
                )}
              >
                {formatDelta(delta.value)}
                {delta.label ? <span className="ml-1 text-slate-300/70">· {delta.label}</span> : null}
              </div>
            ) : null}
          </div>

          {subtitle ? (
            <div className="mt-2 text-xs text-slate-500">{subtitle}</div>
          ) : (
            <div className="mt-2 text-xs text-slate-500"> </div>
          )}
        </div>

        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", t.iconBg)}>
          <Icon className={cn("h-5 w-5", t.icon)} />
        </div>
      </div>

      {/* Мини-sparkline (простая, без библиотек) */}
      {sparkNorm && sparkNorm.length >= 8 ? (
        <div className="relative mt-4">
          <div className="flex h-10 items-end gap-1">
            {sparkNorm.slice(-14).map((v, i) => (
              <div
                key={i}
                className={cn(
                  "w-full rounded-sm bg-slate-800/80",
                  tone === "green" && "bg-emerald-900/60",
                  tone === "amber" && "bg-amber-900/60",
                  tone === "red" && "bg-rose-900/60",
                  tone === "indigo" && "bg-indigo-900/55"
                )}
                style={{ height: `${Math.max(6, v)}%` }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
