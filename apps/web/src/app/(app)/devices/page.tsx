"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Plus,
  RefreshCw,
  ArrowRight,
  Trash2,
  Pencil,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { ConfirmDialog } from "@/components/devices/ConfirmDialog";

type DeviceListItem = {
  id: string;
  uid: string;
  name?: string | null;
  isp?: string | null;
  isActive: boolean;
  kind?: "GENERIC" | "MIKROTIK";
  health: "ONLINE" | "DEGRADED" | "OFFLINE";
  lastSeenAt?: string | null;
  lastIp?: string | null;
  point?: { id: string; name: string; city?: { id: string; name: string } } | null;
};

type ListResponse = { ok: true; items: DeviceListItem[] };

function healthLabel(h: DeviceListItem["health"]) {
  if (h === "ONLINE") return "ONLINE";
  if (h === "DEGRADED") return "DEGRADED";
  return "OFFLINE";
}

function healthBadgeClass(h: DeviceListItem["health"]) {
  if (h === "ONLINE") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (h === "DEGRADED") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-rose-500/25 bg-rose-500/10 text-rose-200";
}

export default function DevicesPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<DeviceListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [edit, setEdit] = React.useState<DeviceListItem | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const json = await apiFetch<ListResponse>("/devices");
      setItems(json.items);
    } catch (e: any) {
      setErr(e?.message ?? "Не удалось загрузить устройства");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  async function deleteDevice(id: string) {
    await apiFetch(`/devices/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-100">Устройства</div>
          <div className="mt-1 text-xs text-slate-400">
            Список устройств мониторинга и удалённых измерений
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Обновить
          </Button>

          <Button
            className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить устройство
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-200">Список</div>
          <Badge
            variant="outline"
            className="rounded-full border-slate-700 bg-slate-900/30 text-slate-300"
          >
            {items.length} шт.
          </Badge>
        </div>

        <Separator className="my-4 bg-slate-800" />

        {err ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
            {err}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="py-3 text-left font-medium">Устройство</th>
                <th className="py-3 text-left font-medium">Точка</th>
                <th className="py-3 text-left font-medium">Health</th>
                <th className="py-3 text-left font-medium">Last seen</th>
                <th className="py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-slate-400" colSpan={5}>
                    Загрузка…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="py-6 text-slate-400" colSpan={5}>
                    Устройств пока нет. Нажми “Добавить устройство”.
                  </td>
                </tr>
              ) : (
                items.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-900/70 hover:bg-slate-900/20"
                  >
                    <td className="py-3">
                      <div className="font-medium text-slate-100">{d.name ?? d.uid}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        UID: <span className="text-slate-300">{d.uid}</span>
                        {d.kind ? <span className="ml-2 text-slate-500">· {d.kind}</span> : null}
                        {d.isp ? <span className="ml-2 text-slate-500">· {d.isp}</span> : null}
                        {!d.isActive ? <span className="ml-2 text-rose-300">· disabled</span> : null}
                      </div>
                    </td>

                    <td className="py-3 text-slate-300">
                      {d.point ? (
                        <>
                          <div className="text-slate-100">{d.point.name}</div>
                          <div className="text-xs text-slate-500">{d.point.city?.name ?? "—"}</div>
                        </>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3">
                      <Badge variant="outline" className={cn("rounded-full", healthBadgeClass(d.health))}>
                        {healthLabel(d.health)}
                      </Badge>
                    </td>

                    <td className="py-3 text-slate-300">
                      <div className="text-slate-100">
                        {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("ru-RU") : "—"}
                      </div>
                      <div className="text-xs text-slate-500">{d.lastIp ?? ""}</div>
                    </td>

                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                          onClick={() => router.push(`/devices/${d.id}/remote-speed`)}
                        >
                          <Activity className="mr-2 h-4 w-4" />
                          RemoteSpeed
                        </Button>

                        <Button
                          variant="secondary"
                          className="h-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                          onClick={() => router.push(`/devices/${d.id}`)}
                        >
                          Открыть <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>

                        <Button
                          variant="secondary"
                          className="h-9 w-9 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                          onClick={() => setEdit(d)}
                          title="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="secondary"
                          className="h-9 w-9 rounded-xl bg-slate-900/40 text-rose-100 hover:bg-slate-900"
                          onClick={() => setRemoveId(d.id)}
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DeviceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Добавить устройство"
        initial={null}
        onSubmit={async (data) => {
          await apiFetch("/devices", { method: "POST", body: JSON.stringify(data) });
          setCreateOpen(false);
          await load();
        }}
      />

      <DeviceFormDialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title="Редактировать устройство"
        initial={edit}
        onSubmit={async (data) => {
          if (!edit) return;
          await apiFetch(`/devices/${edit.id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
          setEdit(null);
          await load();
        }}
      />

      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(v) => !v && setRemoveId(null)}
        title="Удалить устройство?"
        description="Если у устройства есть измерения/инциденты, сервер может запретить удаление. Тогда лучше выключать isActive."
        confirmText="Удалить"
        onConfirm={async () => {
          if (!removeId) return;
          await deleteDevice(removeId);
          setRemoveId(null);
        }}
      />
    </div>
  );
}