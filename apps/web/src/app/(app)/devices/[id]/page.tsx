"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft, Wifi, Activity, AlertTriangle } from "lucide-react";

type DeviceDetailsResponse = {
  ok: true;
  device: any;
  lastMeasurements: any[];
  lastIncidents: any[];
};

function healthBadgeClass(h: string) {
  if (h === "ONLINE") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (h === "DEGRADED") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

type TabKey = "overview" | "measurements" | "remote" | "incidents";

export default function DeviceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tab, setTab] = React.useState<TabKey>("overview");
  const [data, setData] = React.useState<DeviceDetailsResponse | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const json = await apiFetch<DeviceDetailsResponse>(`/devices/${id}`);
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? "Не удалось загрузить устройство");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [id]);

  const d = data?.device;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
              onClick={() => router.push("/devices")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>

            <div className="text-base font-semibold text-slate-100">
              {loading ? "Загрузка…" : d?.name ?? d?.uid ?? "Устройство"}
            </div>

            {d?.health ? (
              <Badge variant="outline" className={cn("rounded-full", healthBadgeClass(d.health))}>
                {d.health}
              </Badge>
            ) : null}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            UID: <span className="text-slate-200">{d?.uid ?? "—"}</span>
            {d?.isp ? <span className="ml-2">· ISP: <span className="text-slate-200">{d.isp}</span></span> : null}
            {d?.lastSeenAt ? <span className="ml-2">· Last seen: <span className="text-slate-200">{new Date(d.lastSeenAt).toLocaleString("ru-RU")}</span></span> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500"
            onClick={() => setTab("remote")}
          >
            <Wifi className="mr-2 h-4 w-4" />
            Remote Speed
          </Button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="min-w-0">{err}</div>
          </div>
        </div>
      ) : null}

      <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            Обзор
          </TabButton>
          <TabButton active={tab === "measurements"} onClick={() => setTab("measurements")}>
            Измерения
          </TabButton>
          <TabButton active={tab === "remote"} onClick={() => setTab("remote")}>
            Remote Speed
          </TabButton>
          <TabButton active={tab === "incidents"} onClick={() => setTab("incidents")}>
            Инциденты
          </TabButton>
        </div>

        <Separator className="my-4 bg-slate-800" />

        {loading || !data ? (
          <div className="text-sm text-slate-400">Загрузка…</div>
        ) : tab === "overview" ? (
          <OverviewTab device={data.device} />
        ) : tab === "measurements" ? (
          <MeasurementsTab deviceId={id} initial={data.lastMeasurements} />
        ) : tab === "remote" ? (
          <RemoteSpeedPlaceholder device={data.device} />
        ) : (
          <IncidentsTab initial={data.lastIncidents} />
        )}
      </Card>
    </div>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition",
        active
          ? "border-indigo-500/30 bg-indigo-600/15 text-indigo-200"
          : "border-slate-800 bg-slate-900/30 text-slate-300 hover:bg-slate-900/50"
      )}
    >
      {children}
    </button>
  );
}

function OverviewTab({ device }: { device: any }) {
  const point = device?.point;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Tile title="Статус" value={device?.health ?? "—"} />
      <Tile title="Last IP" value={device?.lastIp ?? "—"} />
      <Tile title="Last seen" value={device?.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString("ru-RU") : "—"} />
      <Tile title="Active" value={device?.isActive ? "Yes" : "No"} />
      <Tile title="Точка" value={point?.name ?? "—"} />
      <Tile title="Город" value={point?.city?.name ?? "—"} />
    </div>
  );
}

function MeasurementsTab({ deviceId, initial }: { deviceId: string; initial: any[] }) {
  const [items, setItems] = React.useState<any[]>(initial ?? []);
  const [loading, setLoading] = React.useState(false);

  async function reload() {
    setLoading(true);
    try {
      const json = await apiFetch<{ ok: true; items: any[] }>(`/devices/${deviceId}/measurements?take=50`);
      setItems(json.items);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
          <Activity className="h-4 w-4 text-indigo-300" />
          Последние измерения
        </div>
        <Button
          variant="secondary"
          className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
          onClick={reload}
          disabled={loading}
        >
          Обновить
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400">
            <tr className="border-b border-slate-800">
              <th className="px-3 py-2 text-left font-medium">Время</th>
              <th className="px-3 py-2 text-left font-medium">DL</th>
              <th className="px-3 py-2 text-left font-medium">UL</th>
              <th className="px-3 py-2 text-left font-medium">Ping</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={5}>
                  Нет данных
                </td>
              </tr>
            ) : (
              items.map((m) => (
                <tr key={m.id} className="border-b border-slate-900/70">
                  <td className="px-3 py-2 text-slate-200">{new Date(m.createdAt).toLocaleString("ru-RU")}</td>
                  <td className="px-3 py-2 text-slate-200">{m.downloadMbps} Мбит/с</td>
                  <td className="px-3 py-2 text-slate-200">{m.uploadMbps} Мбит/с</td>
                  <td className="px-3 py-2 text-slate-200">{m.pingMs} мс</td>
                  <td className="px-3 py-2 text-slate-200">{m.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IncidentsTab({ initial }: { initial: any[] }) {
  return (
    <div className="grid gap-2">
      {initial?.length ? (
        initial.map((i) => (
          <div key={i.id} className="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-100">{i.title}</div>
              <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-900/30 text-slate-300">
                {i.status} · {i.severity}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {i.type} · {new Date(i.openedAt).toLocaleString("ru-RU")}
            </div>
          </div>
        ))
      ) : (
        <div className="text-sm text-slate-400">Инцидентов пока нет.</div>
      )}
    </div>
  );
}

function RemoteSpeedPlaceholder({ device }: { device: any }) {
  const ok =
    device?.kind === "MIKROTIK" &&
    device?.mikrotikHost &&
    device?.mikrotikUsername &&
    device?.mikrotikSecretRef;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-sm text-slate-300">
      {ok ? (
        <div>
          Remote Speed готов к подключению. Следующий шаг — добавить job + worker + MikroTik API.
          <div className="mt-2 text-xs text-slate-500">
            (Здесь будет ваш SpeedTest UI, но запускающий измерение на MikroTik.)
          </div>
        </div>
      ) : (
        <div>
          Для Remote Speed нужно настроить MikroTik доступ на устройстве:
          <div className="mt-2 text-xs text-slate-500">
            kind=MIKROTIK, mikrotikHost, mikrotikUsername, mikrotikSecretRef
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="mt-1 text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}