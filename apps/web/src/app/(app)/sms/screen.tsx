"use client";

import * as React from "react";
import {
    Wallet,
    RefreshCw,
    Download,
    FileSpreadsheet,
    Search,
    Phone,
    MapPin,
    CalendarDays,
    MessageSquareText,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ExternalLink,
} from "lucide-react";

type SmsBalanceResponse = {
    balance: number;
    currency: string;
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

type SmsLogResponse = {
    items: SmsRow[];
    total: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function SmsPage() {
    const [balance, setBalance] = React.useState<number | null>(null);
    const [currency, setCurrency] = React.useState<string>("KZT");
    const [rows, setRows] = React.useState<SmsRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [balanceLoading, setBalanceLoading] = React.useState(true);

    const [phone, setPhone] = React.useState("");
    const [pointId, setPointId] = React.useState("");
    const [from, setFrom] = React.useState("");
    const [to, setTo] = React.useState("");

    const [topups, setTopups] = React.useState<any[]>([]);
    const [amount, setAmount] = React.useState("");
    const [topupLoading, setTopupLoading] = React.useState(false);

    const [points, setPoints] = React.useState<{ id: string; name: string }[]>([]);

    const [summary, setSummary] = React.useState({
        total: 0,
        sent: 0,
        failed: 0,
    });

    async function loadPoints() {
        try {
            const res = await fetch(`${API_URL}/portal/points`);
            const data = await res.json();
            setPoints(data ?? []);
        } catch (e) {
            console.error(e);
        }
    }

    async function loadBalance() {
        setBalanceLoading(true);
        try {
            const res = await fetch(`${API_URL}/sms/balance`, {
                cache: "no-store",
            });

            if (!res.ok) throw new Error("Не удалось получить баланс");

            const data: SmsBalanceResponse = await res.json();
            setBalance(data.balance ?? 0);
            setCurrency(data.currency ?? "KZT");
        } catch (e) {
            console.error(e);
            setBalance(null);
        } finally {
            setBalanceLoading(false);
        }
    }

    async function loadSmsLog() {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (phone) qs.set("phone", phone);
            if (pointId) qs.set("pointId", pointId);
            if (from) qs.set("from", from);
            if (to) qs.set("to", to);

            const res = await fetch(`${API_URL}/reports/sms?${qs.toString()}`, {
                cache: "no-store",
            });

            if (!res.ok) throw new Error("Не удалось загрузить SMS журнал");

            const data: SmsLogResponse = await res.json();
            const items = data.items ?? [];

            setRows(items);
            setSummary({
                total: data.total ?? 0,
                sent: items.filter((x) => x.status === "OK").length,
                failed: items.filter((x) => x.status !== "OK").length,
            });
        } catch (e) {
            console.error(e);
            setRows([]);
            setSummary({
                total: 0,
                sent: 0,
                failed: 0,
            });
        } finally {
            setLoading(false);
        }
    }

    async function loadTopups() {
        try {
            const res = await fetch(`${API_URL}/sms/topups`, {
                cache: "no-store",
            });

            const data = await res.json();
            setTopups(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
    }

    async function createTopup() {
        if (!amount) return;

        setTopupLoading(true);
        try {
            await fetch(`${API_URL}/sms/topups`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: Number(amount),
                }),
            });

            // открываем Mobizon
            window.open("https://mobizon.kz", "_blank");

            setAmount("");
            loadTopups();
            loadBalance();
        } catch (e) {
            console.error(e);
        } finally {
            setTopupLoading(false);
        }
    }


    React.useEffect(() => {
        loadBalance();
        loadSmsLog();
        loadTopups();
        loadPoints();
    }, []);

    function exportCsv() {
        const qs = new URLSearchParams();
        if (phone) qs.set("phone", phone);
        if (pointId) qs.set("pointId", pointId);
        if (from) qs.set("from", from);
        if (to) qs.set("to", to);

        window.open(`${API_URL}/reports/sms/export/csv?${qs.toString()}`, "_blank");
    }

    function exportXlsx() {
        const qs = new URLSearchParams();
        if (phone) qs.set("phone", phone);
        if (pointId) qs.set("pointId", pointId);
        if (from) qs.set("from", from);
        if (to) qs.set("to", to);

        window.open(`${API_URL}/reports/sms/export/xlsx?${qs.toString()}`, "_blank");
    }

    return (
        <div className="min-h-screen bg-[#050816] text-white">
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="text-3xl font-semibold tracking-tight">SMS</div>
                        <div className="mt-1 text-sm text-slate-400">
                            Баланс, отправка и журнал SMS для портала авторизации
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

                        <button
                            onClick={() => window.open("https://mobizon.kz", "_blank")}
                            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 text-sm text-slate-200 transition hover:bg-slate-800"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Пополнить баланс
                        </button>
                    </div>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Текущий баланс"
                        value={
                            balanceLoading
                                ? "..."
                                : balance !== null
                                    ? `${balance} ${currency}`
                                    : "Недоступно"
                        }
                        icon={<Wallet className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Всего SMS"
                        value={String(summary.total)}
                        icon={<MessageSquareText className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Успешно"
                        value={String(summary.sent)}
                        icon={<CheckCircle2 className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Ошибки"
                        value={String(summary.failed)}
                        icon={<AlertTriangle className="h-5 w-5" />}
                    />
                </div>

                <div className="mb-6 grid gap-4 xl:grid-cols-2">

                    {/* 💳 Пополнение */}
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <div className="mb-3 text-sm text-slate-400">
                            Пополнение баланса
                        </div>

                        <div className="flex gap-3">
                            <input
                                type="number"
                                placeholder="Сумма (KZT)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="flex-1 h-11 rounded-2xl border border-slate-800 bg-slate-900 px-3 text-white outline-none"
                            />

                            <button
                                onClick={createTopup}
                                disabled={topupLoading}
                                className="h-11 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 transition"
                            >
                                {topupLoading ? "..." : "Пополнить"}
                            </button>
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                            После нажатия откроется Mobizon для оплаты
                        </div>
                    </div>

                    {/*История пополнений */}
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <div className="mb-3 text-sm text-slate-400">
                            История пополнений
                        </div>

                        <div className="max-h-[160px] overflow-y-auto text-sm">
                            {topups.length === 0 ? (
                                <div className="text-slate-500">Нет данных</div>
                            ) : (
                                topups.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between border-b border-slate-800 py-2"
                                    >
                                        <div>{t.amount} KZT</div>
                                        <div className="text-xs text-slate-400">
                                            {t.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-300">Фильтры</div>

                        <button
                            onClick={() => {
                                loadBalance();
                                loadSmsLog();
                            }}
                            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 text-sm text-slate-200 transition hover:bg-slate-800"
                        >
                            <RefreshCw className={loading || balanceLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                            Обновить
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <Field
                            icon={<Phone className="h-4 w-4" />}
                            placeholder="Поиск по номеру"
                            value={phone}
                            onChange={setPhone}
                        />
                        <div className="flex h-11 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-3">
                            <MapPin className="h-4 w-4 text-slate-500" />

                            <select
                                value={pointId}
                                onChange={(e) => setPointId(e.target.value)}
                                className="w-full bg-transparent text-sm text-white outline-none"
                            >
                                <option value="">Все точки</option>

                                {points.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <DateField label="Дата от" value={from} onChange={setFrom} />
                        <DateField label="Дата до" value={to} onChange={setTo} />

                        <button
                            onClick={loadSmsLog}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            <Search className="h-4 w-4" />
                            Применить
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
                    <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                        <div>
                            <div className="text-sm font-medium text-slate-200">Журнал SMS</div>
                            <div className="mt-1 text-xs text-slate-500">
                                История отправленных кодов подтверждения
                            </div>
                        </div>

                        <div className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-400">
                            {rows.length} записей
                        </div>
                    </div>



                    <div className="overflow-x-auto">
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
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i}>
                                            <Td colSpan={7}>
                                                <div className="h-10 animate-pulse rounded-xl bg-slate-900/70" />
                                            </Td>
                                        </tr>
                                    ))
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <Td colSpan={7}>
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <MessageSquareText className="mb-3 h-8 w-8 text-slate-600" />
                                                <div className="text-sm text-slate-300">SMS записи не найдены</div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    Измени фильтры или дождись новых отправок
                                                </div>
                                            </div>
                                        </Td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr key={row.id} className="transition hover:bg-slate-900/40">
                                            <Td>{row.phone ?? "—"}</Td>
                                            <Td>{row.pointName}</Td>
                                            <Td>{row.clientIp ?? "—"}</Td>
                                            <Td>{row.clientMac ?? "—"}</Td>
                                            <Td>
                                                <SmsStatusBadge status={row.status} />
                                            </Td>
                                            <Td>{row.message ?? "—"}</Td>
                                            <Td>{formatDateTime(row.createdAt)}</Td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
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

function SmsStatusBadge({ status }: { status: string }) {
    if (status === "OK") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Успешно
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
            <XCircle className="h-3.5 w-3.5" />
            Ошибка
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