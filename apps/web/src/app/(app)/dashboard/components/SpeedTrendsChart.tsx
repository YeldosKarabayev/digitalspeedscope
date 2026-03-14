"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardSection } from "./DashboardSection";
import { useDashboardTrends } from "../hooks/useDashboardTrends";
import { useRange } from "@/components/layout/RangeContext";


type RangeKey = "1h" | "24h" | "7d" | "30d";

type TrendPoint = {
  t: string; // label (e.g. 12:00 or 27 Jan)
  download: number; // Mbps
  upload: number; // Mbps
  ping: number; // ms
};



// function makeMock(range: RangeKey): TrendPoint[] {
//   // Простые моки (потом заменим на API)
//   const count = range === "1h" ? 12 : range === "24h" ? 24 : range === "7d" ? 14 : 30;

//   const points: TrendPoint[] = [];
//   let dl = range === "30d" ? 320 : 300;
//   let ul = range === "30d" ? 180 : 165;
//   let pg = 24;

//   for (let i = 0; i < count; i++) {
//     // небольшая “живость”
//     dl += (Math.random() - 0.45) * 18;
//     ul += (Math.random() - 0.45) * 10;
//     pg += (Math.random() - 0.5) * 2.2;

//     const label =
//       range === "1h"
//         ? `${(i * 5).toString().padStart(2, "0")}м`
//         : range === "24h"
//         ? `${i.toString().padStart(2, "0")}:00`
//         : range === "7d"
//         ? `Д${i + 1}`
//         : `День ${i + 1}`;

//     points.push({
//       t: label,
//       download: Math.max(120, Math.round(dl)),
//       upload: Math.max(60, Math.round(ul)),
//       ping: Math.max(5, Math.round(pg)),
//     });
//   }

//   return points;
// }

function formatMbps(v: number) {
  return `${v} Мбит/с`;
}

function formatMs(v: number) {
  return `${v} мс`;
}

function RangePills({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
}) {
  const items: { k: RangeKey; label: string }[] = [
    { k: "1h", label: "1ч" },
    { k: "24h", label: "24ч" },
    { k: "7d", label: "7д" },
    { k: "30d", label: "30д" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/30 p-1">
      {items.map((it) => (
        <Button
          key={it.k}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(it.k)}
          className={cn(
            "h-8 rounded-lg px-3 text-xs text-slate-300 hover:bg-slate-900 hover:text-slate-100",
            value === it.k && "bg-slate-900 text-slate-100"
          )}
        >
          {it.label}
        </Button>
      ))}
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const dl = payload.find((p) => p.dataKey === "download")?.value ?? null;
  const ul = payload.find((p) => p.dataKey === "upload")?.value ?? null;
  const pg = payload.find((p) => p.dataKey === "ping")?.value ?? null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/95 px-3 py-2 shadow-lg">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-300">Загрузка</span>
          <span className="font-medium text-slate-100">{formatMbps(dl)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-300">Отдача</span>
          <span className="font-medium text-slate-100">{formatMbps(ul)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-slate-300">Пинг</span>
          <span className="font-medium text-slate-100">{formatMs(pg)}</span>
        </div>
      </div>
    </div>
  );
}

export function SpeedTrendsChart() {
  // const [range, setRange] = React.useState<RangeKey>("24h");
  // const data = React.useMemo(() => makeMock(range), [range]);
  const { range, setRange } = useRange();
  const { data, loading, error } = useDashboardTrends();
  const chartData = data?.points ?? [];


  // Y-оси разные (Mbps и ms). Ping отображаем на правой оси.
  // Чтобы визуально было “как SaaS”, делаем area линии.
  return (
    <DashboardSection
      title="Динамика скорости"
      subtitle="Загрузка / Отдача / Пинг по выбранному периоду"
      right={<RangePills value={range} onChange={setRange} />}
      className="p-5"
    >
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          Загружаем график…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          Ошибка: {error}
        </div>
      ) : chartData.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          Нет данных для графика за выбранный период.
        </div>
      ) : (
        <>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="4 6" strokeOpacity={0.15} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={16}
                />

                {/* Левая ось для Mbps */}
                <YAxis
                  yAxisId="mbps"
                  tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v) => `${v}`}
                />

                {/* Правая ось для ping */}
                <YAxis
                  yAxisId="ping"
                  orientation="right"
                  tick={{ fill: "rgba(148,163,184,0.9)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v) => `${v}`}
                />

                <Tooltip content={<CustomTooltip />} cursor={{ strokeOpacity: 0.15 }} />

                {/* Загрузка */}
                <Area
                  yAxisId="mbps"
                  type="monotone"
                  dataKey="download"
                  stroke="rgba(34,197,94,0.9)"
                  fill="rgba(34,197,94,0.12)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                {/* Отдача */}
                <Area
                  yAxisId="mbps"
                  type="monotone"
                  dataKey="upload"
                  stroke="rgba(99,102,241,0.9)"
                  fill="rgba(99,102,241,0.12)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />

                {/* Пинг */}
                <Area
                  yAxisId="ping"
                  type="monotone"
                  dataKey="ping"
                  stroke="rgba(245,158,11,0.9)"
                  fill="rgba(245,158,11,0.08)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Легенда вручную (как в Figma/Cloudflare) */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <LegendDot className="bg-emerald-500/90" label="Загрузка" />
        <LegendDot className="bg-indigo-500/90" label="Отдача" />
        <LegendDot className="bg-amber-500/90" label="Пинг" />
      </div>
    </DashboardSection>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", className)} />
      <span>{label}</span>
    </div>
  );
}
