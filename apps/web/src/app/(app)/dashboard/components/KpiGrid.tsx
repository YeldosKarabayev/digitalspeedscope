"use client";

import { KpiCard } from "./KpiCard";
import { Activity, Wifi, Download, Upload, Timer, AlertTriangle } from "lucide-react";
import { useDashboardOverview } from "../hooks/useDashboardOverview";

export function KpiGrid() {
  const { data, loading, error } = useDashboardOverview();

  const safe = data ?? {
    totalDevices: 0,
    activeDevices24h: 0,
    avgDownloadMbps: 0,
    avgUploadMbps: 0,
    avgPingMs: 0,
    incidents: 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        title="Всего устройств"
        value={loading ? "—" : safe.totalDevices.toLocaleString("ru-RU")}
        subtitle={error ? `Ошибка: ${error}` : "Зарегистрировано в системе"}
        icon={Wifi}
        tone="indigo"
      />

      <KpiCard
        title="Активных за 24 часа"
        value={loading ? "—" : safe.activeDevices24h.toLocaleString("ru-RU")}
        subtitle="Последняя телеметрия < 24ч"
        icon={Activity}
        tone="green"
      />

      <KpiCard
        title="Средняя скорость загрузки"
        value={loading ? "—" : `${safe.avgDownloadMbps} Мбит/с`}
        subtitle="Среднее по выбранному периоду"
        icon={Download}
        tone="green"
      />

      <KpiCard
        title="Средняя скорость отдачи"
        value={loading ? "—" : `${safe.avgUploadMbps} Мбит/с`}
        subtitle="Среднее по выбранному периоду"
        icon={Upload}
        tone="indigo"
      />

      <KpiCard
        title="Средний пинг"
        value={loading ? "—" : `${safe.avgPingMs} мс`}
        subtitle="Ниже — лучше"
        icon={Timer}
        tone="amber"
      />

      <KpiCard
        title="Инциденты"
        value={loading ? "—" : String(safe.incidents)}
        subtitle="Активные оповещения"
        icon={AlertTriangle}
        tone="red"
      />
    </div>
  );
}
