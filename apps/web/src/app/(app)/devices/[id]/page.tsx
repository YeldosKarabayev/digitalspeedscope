"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  RefreshCw,
  Pencil,
  Trash2,
  Activity,
  Router as RouterIcon,
  Globe,
  MapPin,
  Wifi,
} from "lucide-react";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { ConfirmDialog } from "@/components/devices/ConfirmDialog";

type DeviceDetails = {
  id: string;
  uid: string;
  name?: string | null;
  isp?: string | null;
  isActive: boolean;
  kind?: "GENERIC" | "MIKROTIK";
  health: "ONLINE" | "DEGRADED" | "OFFLINE";
  lastSeenAt?: string | null;
  lastIp?: string | null;

  mikrotikHost?: string | null;
  mikrotikPort?: number | null;

  point?: {
    id: string;
    name: string;
    city?: { id: string; name: string } | null;
  } | null;
};

type DetailsResponse =
  | { ok: true; item: DeviceDetails }
  | DeviceDetails;

function healthLabel(h: DeviceDetails["health"]) {
  if (h === "ONLINE") return "ONLINE";
  if (h === "DEGRADED") return "DEGRADED";
  return "OFFLINE";
}

function healthBadgeClass(h: DeviceDetails["health"]) {
  if (h === "ONLINE") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (h === "DEGRADED") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

export default function DeviceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [item, setItem] = React.useState<DeviceDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);

  async function load() {
    if (!deviceId) return;

    setErr(null);
    setLoading(true);
    try {
      const json = await apiFetch<DetailsResponse>(`/devices/${deviceId}`);
      const device = "item" in json ? json.item : json;
      setItem(device);
    } catch (e: any) {
      setErr(e?.message ?? "Не удалось загрузить устройство");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!deviceId) return;
    void load();
  }, [deviceId]);

  async function deleteDevice() {
    if (!deviceId) return;
    await apiFetch(`/devices/${deviceId}`, { method: "DELETE" });
    router.push("/devices");
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-100">
            {item?.name ?? "Устройство"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Детальная карточка устройства и удалённых измерений
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
            onClick={() => router.push("/devices")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку
          </Button>

          <Button
            variant="secondary"
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Обновить
          </Button>

          {item ? (
            <Button
              className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500"
              onClick={() => router.push(`/devices/${deviceId}/remote-speed`)}
            >
              <Activity className="mr-2 h-4 w-4" />
              RemoteSpeed
            </Button>
          ) : null}
        </div>
      </div>

      {err ? (
        <Card className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
          <div className="text-sm text-rose-100">{err}</div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-200">Основная информация</div>
              <div className="mt-1 text-xs text-slate-400">
                Идентификация, состояние и точка размещения
              </div>
            </div>

            {item ? (
              <Badge variant="outline" className={cn("rounded-full", healthBadgeClass(item.health))}>
                {healthLabel(item.health)}
              </Badge>
            ) : null}
          </div>

          <Separator className="my-4 bg-slate-800" />

          {loading ? (
            <div className="text-sm text-slate-400">Загрузка…</div>
          ) : !item ? (
            <div className="text-sm text-slate-400">Устройство не найдено.</div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile icon={<RouterIcon className="h-4 w-4 text-slate-400" />} title="Устройство">
                  <div className="text-sm text-slate-100">{item.name ?? "—"}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    UID: {item.uid}
                    {item.kind ? ` · ${item.kind}` : ""}
                  </div>
                </InfoTile>

                <InfoTile icon={<Globe className="h-4 w-4 text-slate-400" />} title="Провайдер / IP">
                  <div className="text-sm text-slate-100">{item.isp ?? "—"}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.lastIp ?? "—"}</div>
                </InfoTile>

                <InfoTile icon={<MapPin className="h-4 w-4 text-slate-400" />} title="Точка">
                  <div className="text-sm text-slate-100">{item.point?.name ?? "—"}</div>
                  <div className="mt-1 text-xs text-slate-400">{item.point?.city?.name ?? "—"}</div>
                </InfoTile>

                <InfoTile icon={<Wifi className="h-4 w-4 text-slate-400" />} title="Last seen">
                  <div className="text-sm text-slate-100">
                    {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString("ru-RU") : "—"}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {item.isActive ? "Активно" : "Отключено"}
                  </div>
                </InfoTile>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MiniStat label="MikroTik host" value={item.mikrotikHost ?? "—"} />
                <MiniStat label="MikroTik port" value={item.mikrotikPort != null ? String(item.mikrotikPort) : "8728"} />
              </div>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="text-sm font-medium text-slate-200">Действия</div>
          <Separator className="my-4 bg-slate-800" />

          <div className="grid gap-3">
            <Button
              className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500"
              disabled={!deviceId}
              onClick={() => {
                if (!deviceId) return;
                router.push(`/devices/${deviceId}/remote-speed`);
              }}
            >
              <Activity className="mr-2 h-4 w-4" />
              Открыть RemoteSpeed
            </Button>

            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
              disabled={!item}
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Button>

            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-slate-900/40 text-rose-100 hover:bg-slate-900"
              disabled={!item}
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </Button>
          </div>
        </Card>
      </div>

      <DeviceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Редактировать устройство"
        initial={item}
        onSubmit={async (data) => {
          if (!deviceId) return;
          await apiFetch(`/devices/${deviceId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
          setEditOpen(false);
          await load();
        }}
      />

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Удалить устройство?"
        description="Если у устройства есть измерения или инциденты, сервер может запретить удаление."
        confirmText="Удалить"
        onConfirm={async () => {
          await deleteDevice();
        }}
      />
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