"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardSection } from "./DashboardSection";
import { loadYmaps } from "@/lib/ymaps";
import { useRange, RANGE_LABELS } from "@/components/layout/RangeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPinned, Layers, ExternalLink, RefreshCw } from "lucide-react";

type Point = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  status: "ok" | "warn" | "bad";
};

const MOCK_POINTS: Point[] = [
  { id: "p1", lat: 43.238949, lng: 76.889709, label: "Алматы · Центр", status: "ok" },
  { id: "p2", lat: 43.25654, lng: 76.92848, label: "Алматы · Восток", status: "warn" },
  { id: "p3", lat: 43.205, lng: 76.85, label: "Алматы · Юг", status: "bad" },
];

function statusColor(status: Point["status"]) {
  if (status === "ok") return "rgba(34,197,94,0.9)";
  if (status === "warn") return "rgba(245,158,11,0.9)";
  return "rgba(244,63,94,0.9)";
}

export function MapPreview() {
  const { range } = useRange();
  const rangeLabel = RANGE_LABELS[range];

  const mapRef = React.useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshSpin, setRefreshSpin] = React.useState(false);

  const initMap = React.useCallback(async () => {
    setError(null);

    try {
      const ymaps = await loadYmaps(process.env.NEXT_PUBLIC_YMAPS_KEY);
      if (!mapRef.current) return;

      // если карта уже создана — пересоздадим (для refresh/mocks)
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch {}
        mapInstanceRef.current = null;
      }

      // Центр: Алматы (как пример), потом сделаем авто по выбранному городу
      const map = new ymaps.Map(
        mapRef.current,
        {
          center: [43.238949, 76.889709],
          zoom: 11,
          controls: [],
        },
        {
          suppressMapOpenBlock: true,
        }
      );

      // Минимальные контролы (премиально выглядит)
      map.controls.add("zoomControl", { position: { right: 12, top: 72 } });

      // точки (потом заменим на API /map/points)
      MOCK_POINTS.forEach((p) => {
        const placemark = new ymaps.Placemark(
          [p.lat, p.lng],
          {
            balloonContent: `<strong>${p.label}</strong><br/>Период: ${rangeLabel}`,
            hintContent: p.label,
          },
          {
            preset: "islands#circleIcon",
            iconColor: statusColor(p.status),
          }
        );
        map.geoObjects.add(placemark);
      });

      mapInstanceRef.current = map;
      setReady(true);
    } catch (e: any) {
      setError(e?.message ?? "Ошибка загрузки карты");
      setReady(false);
    }
  }, [rangeLabel]);

  React.useEffect(() => {
    initMap();
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [initMap]);

  return (
    <DashboardSection
      title="Карта покрытия"
      subtitle={`Период: ${rangeLabel} · Клик по точке откроет детали`}
      right={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
          >
            <Layers className="mr-2 h-4 w-4" />
            Слои
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setRefreshSpin(true);
              initMap().finally(() => window.setTimeout(() => setRefreshSpin(false), 650));
            }}
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshSpin && "animate-spin")} />
            Обновить
          </Button>

          <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500">
            <Link href="/map">
              <ExternalLink className="mr-2 h-4 w-4" />
              Открыть карту
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800">
          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 backdrop-blur">
            <MapPinned className="h-4 w-4 text-indigo-300" />
            Точки качества сети
          </div>

          {/* контейнер карты */}
          <div
            ref={mapRef}
            className={cn(
              "h-[340px] w-full bg-slate-950",
              !ready && "animate-pulse"
            )}
          />

          {/* overlay ошибки/нет ключа */}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-6 text-center">
              <div className="max-w-md">
                <div className="text-sm font-medium text-slate-100">Не удалось загрузить Яндекс.Карту</div>
                <div className="mt-2 text-xs text-slate-400">
                  {error}
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  Проверь <code className="rounded bg-slate-900 px-1 py-0.5">NEXT_PUBLIC_YMAPS_KEY</code> в
                  <code className="ml-1 rounded bg-slate-900 px-1 py-0.5">apps/web/.env.local</code> и перезапусти dev-сервер.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* легенда */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <LegendDot className="bg-emerald-500/90" label="Норма" />
          <LegendDot className="bg-amber-500/90" label="Деградация" />
          <LegendDot className="bg-rose-500/90" label="Плохо" />
          <span className="ml-auto text-slate-500">Превью · будет заменено на реальные данные</span>
        </div>
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
