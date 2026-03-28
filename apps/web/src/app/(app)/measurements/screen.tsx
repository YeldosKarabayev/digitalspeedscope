"use client";

import * as React from "react";
import { useRange, RANGE_LABELS } from "@/components/layout/RangeContext";
import { useMeasurements, type MeasurementsFilters } from "./hooks/useMeasurements";
import type { MeasurementStatus } from "@/lib/api-types";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const CITIES = ["Все города", "Алматы", "Астана", "Шымкент"] as const;

const STATUS_ITEMS: Array<{ value: MeasurementStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Все статусы" },
  { value: "EXCELLENT", label: "Отлично" },
  { value: "GOOD", label: "Хорошо" },
  { value: "FAIR", label: "Норм" },
  { value: "POOR", label: "Плохо" },
];

function statusLabel(s: MeasurementStatus) {
  if (s === "EXCELLENT") return "Отлично";
  if (s === "GOOD") return "Хорошо";
  if (s === "FAIR") return "Норм";
  return "Плохо";
}

function statusBadgeClass(s: MeasurementStatus) {
  if (s === "EXCELLENT") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (s === "GOOD") return "border-indigo-500/25 bg-indigo-500/10 text-indigo-200";
  if (s === "FAIR") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

function fmtTs(iso: string) {
  const d = new Date(iso);
  // локально и коротко, без библиотек
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm} ${hh}:${mi}`;
}

export default function MeasurementsScreen() {
  const { range } = useRange();
  const rangeLabel = RANGE_LABELS[range];

  const [limit] = React.useState(30);
  const [offset, setOffset] = React.useState(0);

  const [filters, setFilters] = React.useState<MeasurementsFilters>({
    q: "",
    city: "Все города",
    status: "ALL",
  });

  // debounce для поиска (чтобы не дергать API на каждый символ)
  const [qDebounced, setQDebounced] = React.useState(filters.q);
  React.useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(filters.q), 250);
    return () => window.clearTimeout(t);
  }, [filters.q]);

  const effectiveFilters = React.useMemo(
    () => ({ ...filters, q: qDebounced }),
    [filters, qDebounced]
  );

  // при смене range / фильтров — сбрасываем на 1-ю страницу
  React.useEffect(() => {
    setOffset(0);
  }, [range, effectiveFilters.city, effectiveFilters.status, effectiveFilters.q]);

  const { data, loading, error } = useMeasurements({
    limit,
    offset,
    filters: effectiveFilters,
  });

  const total = data?.total ?? 0;
  const rows = data?.rows ?? [];

  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="grid gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-100">Измерения</div>
          <div className="mt-1 text-xs text-slate-400">
            Период: {rangeLabel} · Найдено:{" "}
            <span className="text-slate-200">{total}</span>
          </div>
        </div>

        <Button
          variant="secondary"
          className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
          onClick={() => {
            // простой “refetch” — меняем offset на текущее значение (хук перезапустится от range/filters),
            // но чтобы гарантировать — делаем микро-прыжок.
            setOffset((v) => v);
          }}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
              placeholder="Поиск: устройство, провайдер, точка, город…"
              className="h-10 rounded-xl border-slate-800 bg-slate-900/30 pl-10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          <Select
            value={filters.city}
            onValueChange={(v) => setFilters((s) => ({ ...s, city: v }))}
          >
            <SelectTrigger className="h-10 rounded-xl border-slate-800 bg-slate-900/30 text-slate-100">
              <SelectValue placeholder="Город" />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(v) =>
              setFilters((s) => ({ ...s, status: v as MeasurementsFilters["status"] }))
            }
          >
            <SelectTrigger className="h-10 rounded-xl border-slate-800 bg-slate-900/30 text-slate-100">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
              {STATUS_ITEMS.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            className="h-10 rounded-xl text-slate-200 hover:bg-slate-900"
            onClick={() => setFilters({ q: "", city: "Все города", status: "ALL" })}
          >
            Сбросить
          </Button>
        </div>

        <Separator className="my-4 bg-slate-800" />

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-800">
          {loading ? (
            <div className="p-4 text-sm text-slate-300">Загружаем измерения…</div>
          ) : error ? (
            <div className="p-4 text-sm text-rose-200">
              Ошибка API: <span className="text-rose-100">{error}</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm text-slate-300">
              Нет данных по выбранным фильтрам.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Время</TableHead>
                  <TableHead className="text-slate-400">Статус</TableHead>
                  <TableHead className="text-slate-400">Устройство</TableHead>
                  <TableHead className="text-slate-400">Точка</TableHead>
                  <TableHead className="text-right text-slate-400">DL</TableHead>
                  <TableHead className="text-right text-slate-400">Real DL</TableHead>
                  <TableHead className="text-right text-slate-400">UL</TableHead>
                  <TableHead className="text-right text-slate-400">Ping</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="border-slate-800 hover:bg-slate-900/30">
                    <TableCell className="whitespace-nowrap text-slate-200">
                      {fmtTs(r.ts)}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("rounded-full", statusBadgeClass(r.status))}
                      >
                        {statusLabel(r.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-slate-200">
                      <div className="font-medium">{r.deviceUid}</div>
                      <div className="text-xs text-slate-400">{r.isp ?? "—"}</div>
                    </TableCell>

                    <TableCell className="text-slate-200">
                      <div className="font-medium">{r.pointName ?? "—"}</div>
                      <div className="text-xs text-slate-400">{r.city ?? "—"}</div>
                    </TableCell>

                    <TableCell className="text-right font-medium text-slate-100">
                      {r.download} <span className="text-xs text-slate-400">Мбит/с</span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-100">
                      {r.realDownload != null ? (
                        <>
                          {r.realDownload} <span className="text-xs text-slate-400">Мбит/с</span>
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-100">
                      {r.upload} <span className="text-xs text-slate-400">Мбит/с</span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-100">
                      {r.ping} <span className="text-xs text-slate-400">мс</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Страница <span className="text-slate-200">{page}</span> из{" "}
            <span className="text-slate-200">{pageCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
              onClick={() => setOffset((v) => Math.max(0, v - limit))}
              disabled={!canPrev || loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>

            <Button
              variant="secondary"
              className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
              onClick={() => setOffset((v) => v + limit)}
              disabled={!canNext || loading}
            >
              Вперед
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
