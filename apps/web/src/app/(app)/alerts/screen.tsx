"use client";

import * as React from "react";
import {
  Bell,
  TriangleAlert,
  ShieldAlert,
  Info,
  CheckCheck,
  Search,
  RefreshCw,
  MapPin,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type AlertItem = {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  isRead: boolean;
  pointId: string | null;
  pointName: string | null;
  createdAt: string;
  readAt: string | null;
};

type AlertsResponse = {
  items: AlertItem[];
  total: number;
  unread: number;
  errors: number;
  warnings: number;
};

export default function AlertsPage() {
  const [items, setItems] = React.useState<AlertItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [severity, setSeverity] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [pointId, setPointId] = React.useState("");
  const [search, setSearch] = React.useState("");

  const [summary, setSummary] = React.useState({
    total: 0,
    unread: 0,
    errors: 0,
    warnings: 0,
  });

  async function loadAlerts() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (severity) qs.set("severity", severity);
      if (status) qs.set("status", status);
      if (pointId) qs.set("pointId", pointId);
      if (search) qs.set("search", search);

      const res = await fetch(`${API_URL}/alerts?${qs.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Не удалось загрузить оповещения");

      const data: AlertsResponse = await res.json();
      setItems(data.items ?? []);
      setSummary({
        total: data.total ?? 0,
        unread: data.unread ?? 0,
        errors: data.errors ?? 0,
        warnings: data.warnings ?? 0,
      });
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadAlerts();
  }, []);

  async function markRead(id: string) {
    try {
      const res = await fetch(`${API_URL}/alerts/${id}/read`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Не удалось отметить");
      await loadAlerts();
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch(`${API_URL}/alerts/read-all`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Не удалось отметить все");
      await loadAlerts();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-3xl font-semibold tracking-tight">Оповещения</div>
            <div className="mt-1 text-sm text-slate-400">
              События сети, SMS и состояния точек Wi-Fi
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAlerts}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Обновить
            </button>

            <button
              onClick={markAllRead}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              <CheckCheck className="h-4 w-4" />
              Отметить все как прочитанные
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Всего оповещений"
            value={String(summary.total)}
            icon={<Bell className="h-5 w-5" />}
          />
          <StatCard
            title="Непрочитанные"
            value={String(summary.unread)}
            icon={<Info className="h-5 w-5" />}
          />
          <StatCard
            title="Критические"
            value={String(summary.errors)}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <StatCard
            title="Предупреждения"
            value={String(summary.warnings)}
            icon={<TriangleAlert className="h-5 w-5" />}
          />
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-4 text-sm text-slate-300">Фильтры</div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field
              icon={<Search className="h-4 w-4" />}
              placeholder="Поиск по тексту"
              value={search}
              onChange={setSearch}
            />

            <Field
              icon={<MapPin className="h-4 w-4" />}
              placeholder="ID точки"
              value={pointId}
              onChange={setPointId}
            />

            <Select
              value={severity}
              onChange={setSeverity}
              options={[
                { value: "", label: "Все severity" },
                { value: "INFO", label: "INFO" },
                { value: "WARNING", label: "WARNING" },
                { value: "ERROR", label: "ERROR" },
              ]}
            />

            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: "", label: "Все статусы" },
                { value: "unread", label: "Непрочитанные" },
                { value: "read", label: "Прочитанные" },
              ]}
            />

            <button
              onClick={loadAlerts}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              <Search className="h-4 w-4" />
              Применить
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/70" />
            ))
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-10 text-center text-slate-400">
              Оповещений нет
            </div>
          ) : (
            items.map((item) => (
              <AlertCard key={item.id} item={item} onMarkRead={markRead} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900/80 p-5">
      <div className="mb-4 inline-flex rounded-2xl bg-indigo-600/15 p-3 text-indigo-300">
        {icon}
      </div>
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function AlertCard({
  item,
  onMarkRead,
}: {
  item: AlertItem;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 transition ${
        item.isRead
          ? "border-slate-800 bg-slate-950/60"
          : "border-indigo-500/20 bg-slate-950/90 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={item.severity} />
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300">
              {item.type}
            </span>
            {!item.isRead ? (
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
                Новое
              </span>
            ) : null}
          </div>

          <div className="text-base font-medium text-slate-100">{item.message}</div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
            <span>Точка: {item.pointName ?? "—"}</span>
            <span>Дата: {formatDateTime(item.createdAt)}</span>
            <span>Статус: {item.isRead ? "Прочитано" : "Не прочитано"}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {!item.isRead ? (
            <button
              onClick={() => onMarkRead(item.id)}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Отметить прочитанным
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: AlertItem["severity"] }) {
  if (severity === "ERROR") {
    return (
      <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
        ERROR
      </span>
    );
  }

  if (severity === "WARNING") {
    return (
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
        WARNING
      </span>
    );
  }

  return (
    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
      INFO
    </span>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-3">
      <div className="text-slate-500">{icon}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
      />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 text-sm text-white outline-none"
    >
      {options.map((option) => (
        <option key={option.value || option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}