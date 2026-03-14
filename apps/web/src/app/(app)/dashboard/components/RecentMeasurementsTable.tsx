"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardSection } from "./DashboardSection";
import { useRange, RANGE_LABELS } from "@/components/layout/RangeContext";
import { ExternalLink, Filter, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentMeasurements } from "../hooks/useRecentMeasurements";
import { MeasurementStatus } from "@/lib/api-types";


type Quality = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

type MeasurementRow = {
  id: string;
  ts: string; // "29 янв, 21:40"
  device: string; // "MKT-ALM-012"
  city: string; // "Алматы"
  download: number; // Mbps
  upload: number; // Mbps
  ping: number; // ms
  status: Quality;
};

function formatMbps(v: number) {
  return `${v} Мбит/с`;
}
function formatMs(v: number) {
  return `${v} мс`;
}

function statusBadge(status: Quality) {
  switch (status) {
    case "EXCELLENT":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
    case "GOOD":
      return "border-indigo-500/25 bg-indigo-500/10 text-indigo-200";
    case "FAIR":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200";
    case "POOR":
      return "border-rose-500/25 bg-rose-500/10 text-rose-200";
  }
}

function statusLabel(s: MeasurementStatus) {
  if (s === "EXCELLENT") return "Отлично";
  if (s === "GOOD") return "Хорошо";
  if (s === "FAIR") return "Норм";
  return "Плохо";
}

function makeMock(rangeLabel: string): MeasurementRow[] {
  // rangeLabel используется просто в подписи, данные пока mock
  const base: MeasurementRow[] = [
    {
      id: "m1",
      ts: "29 янв, 21:40",
      device: "MKT-ALM-012",
      city: "Алматы",
      download: 940,
      upload: 125,
      ping: 12,
      status: "EXCELLENT",
    },
    {
      id: "m2",
      ts: "29 янв, 21:38",
      device: "MKT-ALM-021",
      city: "Алматы",
      download: 420,
      upload: 98,
      ping: 19,
      status: "GOOD",
    },
    {
      id: "m3",
      ts: "29 янв, 21:36",
      device: "MKT-AST-003",
      city: "Астана",
      download: 210,
      upload: 60,
      ping: 31,
      status: "FAIR",
    },
    {
      id: "m4",
      ts: "29 янв, 21:35",
      device: "MKT-AST-014",
      city: "Астана",
      download: 95,
      upload: 22,
      ping: 58,
      status: "POOR",
    },
    {
      id: "m5",
      ts: "29 янв, 21:33",
      device: "MKT-SHY-002",
      city: "Шымкент",
      download: 310,
      upload: 80,
      ping: 24,
      status: "GOOD",
    },
  ];

  // Лёгкая “динамика” по периоду — просто чтобы было видно, что range влияет
  const mult = rangeLabel === "1ч" ? 1.0 : rangeLabel === "24ч" ? 0.95 : rangeLabel === "7д" ? 0.9 : 0.85;

  return base.map((r) => ({
    ...r,
    download: Math.max(30, Math.round(r.download * mult)),
    upload: Math.max(10, Math.round(r.upload * mult)),
    ping: Math.max(5, Math.round(r.ping / mult)),
  }));
}

export function RecentMeasurementsTable() {
  const { range } = useRange();
  const rangeLabel = RANGE_LABELS[range];

  const { data, loading, error } = useRecentMeasurements();
  const rows = data?.rows ?? [];

  const [refreshSpin, setRefreshSpin] = React.useState(false);

  return (

    <DashboardSection
      title="Последние измерения"
      subtitle={`Период: ${rangeLabel} · обновляется по телеметрии устройств`}
      right={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
          >
            <Filter className="mr-2 h-4 w-4" />
            Фильтры
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setRefreshSpin(true);
              window.setTimeout(() => setRefreshSpin(false), 650);
            }}
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshSpin && "animate-spin")} />
            Обновить
          </Button>

          <Button className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500">
            <ExternalLink className="mr-2 h-4 w-4" />
            Открыть все
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          Загружаем последние измерения…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          Ошибка: {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          Нет измерений за выбранный период.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Время</TableHead>
                <TableHead className="text-slate-400">Устройство</TableHead>
                <TableHead className="text-slate-400">Город</TableHead>
                <TableHead className="text-right text-slate-400">Загрузка</TableHead>
                <TableHead className="text-right text-slate-400">Отдача</TableHead>
                <TableHead className="text-right text-slate-400">Пинг</TableHead>
                <TableHead className="text-right text-slate-400">Статус</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-slate-800 hover:bg-slate-900/40"
                >
                  <TableCell className="text-slate-300">{r.ts}</TableCell>
                  <TableCell className="font-medium text-slate-100">{r.device}</TableCell>
                  <TableCell className="text-slate-300">{r.city}</TableCell>

                  <TableCell className="text-right text-slate-100">{formatMbps(r.download)}</TableCell>
                  <TableCell className="text-right text-slate-100">{formatMbps(r.upload)}</TableCell>
                  <TableCell className="text-right text-slate-100">{formatMs(r.ping)}</TableCell>

                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={cn("rounded-full", statusBadge(r.status))}
                    >
                      {statusLabel(r.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}


      <div className="mt-3 text-xs text-slate-500">
        Подсказка: клик по строке позже будет открывать детали устройства и историю измерений.
      </div>
    </DashboardSection>
  );
}
