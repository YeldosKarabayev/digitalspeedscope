"use client";

import * as React from "react";
import { loadYmaps } from "@/lib/ymaps";
import { useRange, RANGE_LABELS, type RangeKey } from "@/components/layout/RangeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Filter, RefreshCw, Layers, MapPinned, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMapPoints } from "./hooks/useMapPoints";


type Metric = "download" | "upload" | "ping";
type City = "Алматы" | "Астана" | "Шымкент" | "Все города";

type Point = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  download: number;
  realDownload: number | null;
  upload: number;
  ping: number;
  isp?: string;
  deviceUid?: string;
  lastSeen: string;
};


// const MOCK_POINTS: Point[] = [
//   {
//     id: "p1",
//     name: "Алматы · Центр",
//     city: "Алматы",
//     lat: 43.238949,
//     lng: 76.889709,
//     download: 940,
//     upload: 125,
//     ping: 12,
//     isp: "DigitalNet",
//     deviceUid: "MKT-ALM-012",
//     lastSeen: "29 янв, 21:40",
//   },
//   {
//     id: "p2",
//     name: "Алматы · Восток",
//     city: "Алматы",
//     lat: 43.25654,
//     lng: 76.92848,
//     download: 420,
//     upload: 98,
//     ping: 19,
//     isp: "KazFiber",
//     deviceUid: "MKT-ALM-021",
//     lastSeen: "29 янв, 21:38",
//   },
//   {
//     id: "p3",
//     name: "Алматы · Юг",
//     city: "Алматы",
//     lat: 43.205,
//     lng: 76.85,
//     download: 95,
//     upload: 22,
//     ping: 58,
//     isp: "CityLink",
//     deviceUid: "MKT-ALM-034",
//     lastSeen: "29 янв, 21:35",
//   },
//   {
//     id: "p4",
//     name: "Астана · Левый берег",
//     city: "Астана",
//     lat: 51.1282,
//     lng: 71.4304,
//     download: 310,
//     upload: 80,
//     ping: 24,
//     isp: "DigitalNet",
//     deviceUid: "MKT-AST-014",
//     lastSeen: "29 янв, 21:33",
//   },
//   {
//     id: "p5",
//     name: "Шымкент · Центр",
//     city: "Шымкент",
//     lat: 42.3155,
//     lng: 69.5869,
//     download: 210,
//     upload: 60,
//     ping: 31,
//     isp: "KazFiber",
//     deviceUid: "MKT-SHY-002",
//     lastSeen: "29 янв, 21:31",
//   },
// ];

function metricLabel(metric: Metric) {
  if (metric === "download") return "Загрузка";
  if (metric === "upload") return "Отдача";
  return "Пинг";
}

function getDownloadValue(point: Point) {
  if (point.realDownload != null) return point.realDownload;
  if (point.download != null) return point.download;
  return null;
}

function formatMetric(metric: Metric, point: Point) {
  if (metric === "download") {
    const value = getDownloadValue(point);
    return value != null ? `${value} Мбит/с` : "—";
  }

  if (metric === "upload") return `${point.upload} Мбит/с`;
  return `${point.ping} мс`;
}

/** Цвет маркера в зависимости от выбранной метрики */
function markerColor(metric: Metric, p: Point) {
  if (metric === "ping") {
    if (p.ping <= 18) return "rgba(34,197,94,0.95)";
    if (p.ping <= 35) return "rgba(245,158,11,0.95)";
    return "rgba(244,63,94,0.95)";
  }

  const val = metric === "download" ? getDownloadValue(p) ?? 0 : p.upload;

  if (val >= (metric === "download" ? 300 : 120)) return "rgba(34,197,94,0.95)";
  if (val >= (metric === "download" ? 150 : 60)) return "rgba(245,158,11,0.95)";
  return "rgba(244,63,94,0.95)";
}

function qualityBadge(metric: Metric, p: Point) {
  const color = markerColor(metric, p);
  // Мапим на label
  const isGreen = color.includes("34,197,94");
  const isAmber = color.includes("245,158,11");
  return isGreen ? "Норма" : isAmber ? "Деградация" : "Плохо";
}

function badgeClass(label: string) {
  if (label === "Норма") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (label === "Деградация") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

export default function MapScreen() {
  const { range } = useRange();
  const rangeLabel = RANGE_LABELS[range];

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const marksRef = React.useRef<any[]>([]);

  const [metric, setMetric] = React.useState<Metric>("download");
  const [city, setCity] = React.useState<City>("Все города");
  const [query, setQuery] = React.useState("");
  const [cluster, setCluster] = React.useState(true);

  const [selected, setSelected] = React.useState<Point | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshSpin, setRefreshSpin] = React.useState(false);

  const { data: pointsRes, loading: pointsLoading, error: pointsError } = useMapPoints({
    city,
    metric,
  });

  const allPoints = pointsRes?.points ?? [];


  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return allPoints.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.deviceUid ?? "").toLowerCase().includes(q) ||
        (p.isp ?? "").toLowerCase().includes(q)
      );
    });
  }, [allPoints, query]);


  const centerForCity = React.useMemo(() => {
    if (city === "Алматы") return [43.238949, 76.889709];
    if (city === "Астана") return [51.1282, 71.4304];
    if (city === "Шымкент") return [42.3155, 69.5869];
    // общий центр — Алматы (MVP)
    return [43.238949, 76.889709];
  }, [city]);

  const zoomForCity = React.useMemo(() => {
    if (city === "Все города") return 5;
    return 11;
  }, [city]);

  const rebuildMarks = React.useCallback(
    (ymaps: any) => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      // очистка старых
      marksRef.current.forEach((o) => {
        try {
          map.geoObjects.remove(o);
        } catch { }
      });
      marksRef.current = [];

      // кластер или просто точки
      let collection: any = null;
      if (cluster) {
        collection = new ymaps.Clusterer({
          preset: "islands#invertedVioletClusterIcons",
          groupByCoordinates: false,
          clusterDisableClickZoom: false,
          clusterOpenBalloonOnClick: true,
        });
      }

      filtered.forEach((p) => {
        const placemark = new ymaps.Placemark(
          [p.lat, p.lng],
          {
            hintContent: `${p.name} · ${formatMetric(metric, p)}`,
            balloonContent: `
              <div style="font-family: Inter, system-ui, -apple-system; font-size: 13px;">
                <div style="font-weight: 600; margin-bottom: 6px;">${p.name}</div>
                <div style="opacity: 0.85;">${metricLabel(metric)}: <b>${formatMetric(metric, p)}</b></div>
                <div style="opacity: 0.7; margin-top: 6px;">Период: ${rangeLabel}</div>
                <div style="opacity: 0.7;">Последнее: ${p.lastSeen}</div>
              </div>
            `,
          },
          {
            preset: "islands#circleIcon",
            iconColor: markerColor(metric, p),
          }
        );

        placemark.events.add("click", () => {
          setSelected(p);
          setSheetOpen(true);
        });

        marksRef.current.push(placemark);
        if (collection) collection.add(placemark);
        else map.geoObjects.add(placemark);
      });

      if (collection) map.geoObjects.add(collection);
    },
    [filtered, metric, rangeLabel, cluster]
  );

  const initMap = React.useCallback(async () => {
    setError(null);
    try {
      const ymaps = await loadYmaps(process.env.NEXT_PUBLIC_YMAPS_KEY);
      if (!mapRef.current) return;

      // destroy если уже было
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch { }
        mapInstanceRef.current = null;
      }

      const map = new ymaps.Map(
        mapRef.current,
        {
          center: centerForCity,
          zoom: zoomForCity,
          controls: [],
        },
        { suppressMapOpenBlock: true }
      );

      map.controls.add("zoomControl", { position: { right: 12, top: 80 } });

      mapInstanceRef.current = map;
      setReady(true);

      rebuildMarks(ymaps);
    } catch (e: any) {
      setError(e?.message ?? "Ошибка загрузки карты");
      setReady(false);
    }
  }, [centerForCity, zoomForCity, rebuildMarks]);

  // init once + reinit on city (центр/zoom меняется)
  React.useEffect(() => {
    initMap();
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch { }
        mapInstanceRef.current = null;
      }
    };
  }, [initMap]);

  // обновляем точки при изменениях фильтров/метрики/периода
  React.useEffect(() => {
    (async () => {
      try {
        const ymaps = await loadYmaps(process.env.NEXT_PUBLIC_YMAPS_KEY);
        rebuildMarks(ymaps);
      } catch {
        // ignore
      }
    })();
  }, [rebuildMarks]);

  return (
    <div className="grid h-[calc(100vh-1px)] grid-cols-1 gap-4 px-6 pb-6 pt-6 lg:grid-cols-[360px_1fr]">
      {/* LEFT FILTER PANEL */}
      <aside className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100">Карта</div>
            <div className="mt-1 text-xs text-slate-400">
              Период: {rangeLabel} · Метрика: {metricLabel(metric)}
            </div>
          </div>

          <Button
            variant="secondary"
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
            onClick={() => {
              setRefreshSpin(true);
              initMap().finally(() => window.setTimeout(() => setRefreshSpin(false), 650));
            }}
          >
            <RefreshCw className={cn("h-4 w-4", refreshSpin && "animate-spin")} />
          </Button>
        </div>

        <Separator className="my-4 bg-slate-800" />

        {pointsLoading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
            Загружаем точки…
          </div>
        ) : pointsError ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
            Ошибка API: {pointsError}
          </div>
        ) : null}


        <div className="grid gap-4">
          {/* SEARCH */}
          <div>
            <div className="mb-2 text-xs font-medium text-slate-300">Поиск</div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Город, устройство, провайдер…"
              className="h-10 rounded-xl border-slate-800 bg-slate-900/30 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          {/* CITY */}
          <div>
            <div className="mb-2 text-xs font-medium text-slate-300">Город</div>
            <Select value={city} onValueChange={(v) => setCity(v as City)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-800 bg-slate-900/30 text-slate-100">
                <SelectValue placeholder="Выберите город" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                <SelectItem value="Все города">Все города</SelectItem>
                <SelectItem value="Алматы">Алматы</SelectItem>
                <SelectItem value="Астана">Астана</SelectItem>
                <SelectItem value="Шымкент">Шымкент</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* METRIC */}
          <div>
            <div className="mb-2 text-xs font-medium text-slate-300">Метрика</div>
            <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <TabsList className="grid w-full grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/30 p-1">
                <TabsTrigger value="download" className="rounded-lg text-xs">
                  Загрузка
                </TabsTrigger>
                <TabsTrigger value="upload" className="rounded-lg text-xs">
                  Отдача
                </TabsTrigger>
                <TabsTrigger value="ping" className="rounded-lg text-xs">
                  Пинг
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* TOGGLES */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/20 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Layers className="h-4 w-4 text-slate-400" />
              Кластеры
            </div>
            <Button
              type="button"
              variant="secondary"
              className={cn(
                "h-8 rounded-lg px-3 text-xs",
                cluster ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-slate-900/40 text-slate-100 hover:bg-slate-900"
              )}
              onClick={() => setCluster((v) => !v)}
            >
              {cluster ? "Вкл" : "Выкл"}
            </Button>
          </div>

          {/* LEGEND */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/15 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <MapPinned className="h-4 w-4 text-indigo-300" />
              Легенда качества
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <LegendDot className="bg-emerald-500/90" label="Норма" />
              <LegendDot className="bg-amber-500/90" label="Деградация" />
              <LegendDot className="bg-rose-500/90" label="Плохо" />
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Цвет зависит от выбранной метрики.
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Точек: <span className="text-slate-300">{filtered.length}</span>
            </div>

            <Button
              variant="ghost"
              className="h-8 rounded-lg text-xs text-slate-300 hover:bg-slate-900"
              onClick={() => {
                setCity("Все города");
                setQuery("");
                setMetric("download");
                setCluster(true);
              }}
            >
              Сбросить
            </Button>
          </div>
        </div>
      </aside>

      {/* MAP AREA */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
        <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 backdrop-blur">
          <span className="font-medium">DigitalSpeedScope</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-400">{metricLabel(metric)}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-400">Период: {rangeLabel}</span>
        </div>

        <div
          ref={mapRef}
          className={cn("h-full min-h-[520px] w-full", !ready && "animate-pulse")}
        />

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-6 text-center">
            <div className="max-w-md">
              <div className="text-sm font-medium text-slate-100">
                Не удалось загрузить Яндекс.Карту
              </div>
              <div className="mt-2 text-xs text-slate-400">{error}</div>
              <div className="mt-4 text-xs text-slate-500">
                Проверь{" "}
                <code className="rounded bg-slate-900 px-1 py-0.5">NEXT_PUBLIC_YMAPS_KEY</code>{" "}
                в{" "}
                <code className="rounded bg-slate-900 px-1 py-0.5">apps/web/.env.local</code>{" "}
                и перезапусти dev-сервер.
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* DRAWER */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[420px] border-slate-800 bg-slate-950 text-slate-100">
          <SheetHeader>
            <SheetTitle className="text-slate-100">Детали точки</SheetTitle>
            <SheetDescription className="text-slate-400">
              Период: {rangeLabel} · Метрика: {metricLabel(metric)}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {selected ? (
              <>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100">{selected.name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {selected.city} · Последнее: {selected.lastSeen}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn("rounded-full", badgeClass(qualityBadge(metric, selected)))}
                    >
                      {qualityBadge(metric, selected)}
                    </Badge>
                  </div>

                  <Separator className="my-4 bg-slate-800" />

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <MetricCell
                      label="Загрузка"
                      value={formatMetric("download", selected)}
                      tone="emerald"
                    />
                    <MetricCell label="Отдача" value={`${selected.upload} Мбит/с`} tone="indigo" />
                    <MetricCell label="Пинг" value={`${selected.ping} мс`} tone="amber" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="text-xs font-medium text-slate-300">Источник</div>
                  <div className="mt-2 space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between gap-4">
                      <span>Устройство</span>
                      <span className="font-medium text-slate-100">{selected.deviceUid ?? "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Провайдер</span>
                      <span className="font-medium text-slate-100">{selected.isp ?? "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Координаты</span>
                      <span className="font-medium text-slate-100">
                        {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button asChild className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500">
                    <Link href="/measurements">Открыть измерения</Link>
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                    onClick={() => setSheetOpen(false)}
                  >
                    Закрыть
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4 text-sm text-slate-300">
                Выберите точку на карте.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
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

function MetricCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "indigo" | "amber";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-200 bg-emerald-500/10 border-emerald-500/20"
      : tone === "indigo"
        ? "text-indigo-200 bg-indigo-500/10 border-indigo-500/20"
        : "text-amber-200 bg-amber-500/10 border-amber-500/20";

  return (
    <div className={cn("rounded-xl border p-3", toneCls)}>
      <div className="text-[11px] opacity-80">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}
