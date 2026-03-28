"use client";

import * as React from "react";
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  Filter,
  Phone,
  MapPin,
  Wifi,
  ShieldCheck,
  Search,
  RefreshCw,
  Activity,
  Users,
  MessageSquareText,
  Router,
  MessagesSquare,
} from "lucide-react";

type ReportRow = {
  id: string;
  phone: string;
  pointName: string;
  clientIp: string | null;
  clientMac: string | null;
  grantedAt: string | null;
  expiresAt: string | null;
  status: "ACTIVE" | "EXPIRED" | "UNKNOWN";
};

type SmsRow = {
  id: string;
  phone: string | null;
  pointName: string;
  clientIp: string | null;
  clientMac: string | null;
  status: string;
  message: string | null;
  createdAt: string;
};

type AccessResponse = {
  items: ReportRow[];
  total: number;
  uniquePhones: number;
  activePoints: number;
  smsCount: number;
};

type SmsResponse = {
  items: SmsRow[];
  total: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ReportsPage() {
  const [tab, setTab] = React.useState<"access" | "sms">("access");
  const [rows, setRows] = React.useState<ReportRow[]>([]);
  const [smsRows, setSmsRows] = React.useState<SmsRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [phone, setPhone] = React.useState("");
  const [pointId, setPointId] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const [summary, setSummary] = React.useState({
    total: 0,
    uniquePhones: 0,
    activePoints: 0,
    smsCount: 0,
  });

  async function loadCurrent() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (phone) qs.set("phone", phone);
      if (pointId) qs.set("pointId", pointId);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      if (tab === "access") {
        const res = await fetch(`${API_URL}/reports/access?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Не удалось загрузить отчёты");

        const data: AccessResponse = await res.json();
        setRows(data.items ?? []);
        setSummary({
          total: data.total ?? 0,
          uniquePhones: data.uniquePhones ?? 0,
          activePoints: data.activePoints ?? 0,
          smsCount: data.smsCount ?? 0,
        });
      } else {
        const res = await fetch(`${API_URL}/reports/sms?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Не удалось загрузить SMS журнал");

        const data: SmsResponse = await res.json();
        setSmsRows(data.items ?? []);
      }
    } catch (e) {
      console.error(e);
      setRows([]);
      setSmsRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadCurrent();
  }, [tab]);

  function exportCsv() {
    const qs = new URLSearchParams();
    if (phone) qs.set("phone", phone);
    if (pointId) qs.set("pointId", pointId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);

    const url =
      tab === "access"
        ? `${API_URL}/reports/access/export/csv?${qs.toString()}`
        : `${API_URL}/reports/sms/export/csv?${qs.toString()}`;

    window.open(url, "_blank");
  }

  function exportXlsx() {
    const qs = new URLSearchParams();
    if (phone) qs.set("phone", phone);
    if (pointId) qs.set("pointId", pointId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);

    const url =
      tab === "access"
        ? `${API_URL}/reports/access/export/xlsx?${qs.toString()}`
        : `${API_URL}/reports/sms/export/xlsx?${qs.toString()}`;

    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-3xl font-semibold tracking-tight">Отчёты</div>
            <div className="mt-1 text-sm text-slate-400">
              Аналитика по авторизациям и журнал отправки SMS
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCsv}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Скачать CSV
            </button>

            <button
              onClick={exportXlsx}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 text-sm font-medium text-white shadow-lg shadow-indigo-950/50 transition hover:opacity-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Скачать Excel
            </button>
          </div>
        </div>

        <div className="mb-6 flex gap-3">
          <TabButton
            active={tab === "access"}
            onClick={() => setTab("access")}
            icon={<Wifi className="h-4 w-4" />}
            label="Авторизации"
          />
          <TabButton
            active={tab === "sms"}
            onClick={() => setTab("sms")}
            icon={<MessagesSquare className="h-4 w-4" />}
            label="SMS журнал"
          />
        </div>

        {tab === "access" ? (
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Всего авторизаций" value={String(summary.total)} icon={<Activity className="h-5 w-5" />} />
            <StatCard title="Уникальные номера" value={String(summary.uniquePhones)} icon={<Users className="h-5 w-5" />} />
            <StatCard title="Активные точки" value={String(summary.activePoints)} icon={<Router className="h-5 w-5" />} />
            <StatCard title="SMS за период" value={String(summary.smsCount)} icon={<MessageSquareText className="h-5 w-5" />} />
          </div>
        ) : null}

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
            <Filter className="h-4 w-4" />
            Фильтры
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field
              icon={<Phone className="h-4 w-4" />}
              placeholder="Поиск по номеру"
              value={phone}
              onChange={setPhone}
            />
            <Field
              icon={<MapPin className="h-4 w-4" />}
              placeholder="ID точки"
              value={pointId}
              onChange={setPointId}
            />
            <DateField label="Дата от" value={from} onChange={setFrom} />
            <DateField label="Дата до" value={to} onChange={setTo} />

            <div className="flex items-end gap-2">
              <button
                onClick={loadCurrent}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Применить
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <div className="text-sm font-medium text-slate-200">
                {tab === "access" ? "Журнал авторизаций" : "SMS журнал"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {tab === "access"
                  ? "Последние подключения к Wi-Fi через SMS-подтверждение"
                  : "История отправленных SMS-кодов"}
              </div>
            </div>

            <div className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-400">
              {tab === "access" ? rows.length : smsRows.length} записей
            </div>
          </div>

          <div className="overflow-x-auto">
            {tab === "access" ? (
              <table className="min-w-full text-left">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <Th>Телефон</Th>
                    <Th>Точка</Th>
                    <Th>IP</Th>
                    <Th>MAC</Th>
                    <Th>Подключение</Th>
                    <Th>Доступ до</Th>
                    <Th>Статус</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    <LoadingRows cols={7} />
                  ) : rows.length === 0 ? (
                    <EmptyRow cols={7} text="Нет данных для отображения" />
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="transition hover:bg-slate-900/40">
                        <Td>{row.phone}</Td>
                        <Td>{row.pointName}</Td>
                        <Td>{row.clientIp ?? "—"}</Td>
                        <Td>{row.clientMac ?? "—"}</Td>
                        <Td>{formatDateTime(row.grantedAt)}</Td>
                        <Td>{formatDateTime(row.expiresAt)}</Td>
                        <Td><StatusBadge status={row.status} /></Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-left">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <Th>Телефон</Th>
                    <Th>Точка</Th>
                    <Th>IP</Th>
                    <Th>MAC</Th>
                    <Th>Статус</Th>
                    <Th>Сообщение</Th>
                    <Th>Дата</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    <LoadingRows cols={7} />
                  ) : smsRows.length === 0 ? (
                    <EmptyRow cols={7} text="Нет SMS записей" />
                  ) : (
                    smsRows.map((row) => (
                      <tr key={row.id} className="transition hover:bg-slate-900/40">
                        <Td>{row.phone ?? "—"}</Td>
                        <Td>{row.pointName}</Td>
                        <Td>{row.clientIp ?? "—"}</Td>
                        <Td>{row.clientMac ?? "—"}</Td>
                        <Td>{row.status}</Td>
                        <Td>{row.message ?? "—"}</Td>
                        <Td>{formatDateTime(row.createdAt)}</Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          : "inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
      }
    >
      {icon}
      {label}
    </button>
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

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-3">
      <CalendarDays className="h-4 w-4 text-slate-500" />
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-white outline-none"
      />
    </label>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          <Td colSpan={cols}>
            <div className="h-10 animate-pulse rounded-xl bg-slate-900/70" />
          </Td>
        </tr>
      ))}
    </>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <Td colSpan={cols}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wifi className="mb-3 h-8 w-8 text-slate-600" />
          <div className="text-sm text-slate-300">{text}</div>
        </div>
      </Td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-4 font-medium">{children}</th>;
}

function Td({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td className="px-5 py-4 text-sm text-slate-300" colSpan={colSpan}>
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: ReportRow["status"] }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
        <ShieldCheck className="h-3.5 w-3.5" />
        Активен
      </span>
    );
  }

  if (status === "EXPIRED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
        Истёк
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
      Неизвестно
    </span>
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