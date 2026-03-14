"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wifi, ShieldCheck, Phone, KeyRound, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type Step = "phone" | "code" | "success";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function normalizeKZPhone(raw: string) {
    // MVP: оставляем только цифры, делаем формат 7XXXXXXXXXX
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("8") && digits.length === 11) return "7" + digits.slice(1);
    if (digits.startsWith("7") && digits.length === 11) return digits;
    if (digits.length === 10) return "7" + digits; // если ввели без 7
    return digits;
}

function formatKZPhone(digits: string) {
    // 7XXXXXXXXXX -> +7 (XXX) XXX-XX-XX
    const d = digits.replace(/\D/g, "");
    if (d.length !== 11) return digits;
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}

export default function PortalScreen() {
    const [step, setStep] = React.useState<Step>("phone");

    const [phoneRaw, setPhoneRaw] = React.useState("");
    const phone = React.useMemo(() => normalizeKZPhone(phoneRaw), [phoneRaw]);

    const [code, setCode] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    const [expiresIn, setExpiresIn] = React.useState<number>(0); // секунды до повтора
    const canRequest = phone.length === 11 && phone.startsWith("7");
    const [deviceKey, setDeviceKey] = React.useState<string>("");

    React.useEffect(() => {
        if (!deviceKey) return;

        (async () => {
            try {
                const res = await fetch(`${API_URL}/portal/me?deviceKey=${encodeURIComponent(deviceKey)}`, { cache: "no-store" });
                if (!res.ok) return;
                const json = await res.json();
                if (json?.ok) setStep("success");
            } catch { }
        })();
    }, [deviceKey]);


    React.useEffect(() => {
        setDeviceKey(getOrCreateDeviceKey());
    }, []);

    // таймер для "Отправить снова"
    React.useEffect(() => {
        if (expiresIn <= 0) return;
        const t = window.setInterval(() => setExpiresIn((v) => Math.max(0, v - 1)), 1000);
        return () => window.clearInterval(t);
    }, [expiresIn]);


    function getOrCreateDeviceKey() {
        const name = "dss_device=";
        const parts = document.cookie.split(";").map((s) => s.trim());
        const found = parts.find((p) => p.startsWith(name));
        if (found) return decodeURIComponent(found.slice(name.length));

        const key = crypto.randomUUID();
        document.cookie = `dss_device=${encodeURIComponent(key)}; path=/; max-age=31536000`;
        return key;
    }


    async function requestCode() {
        setErr(null);
        if (!canRequest) {
            setErr("Введите корректный номер (Казахстан).");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/portal/request-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            // MVP: сервер вернёт expiresInSec
            const json = await res.json().catch(() => ({}));
            setStep("code");
            setExpiresIn(Number(json?.expiresInSec ?? 60));
        } catch (e: any) {
            setErr(e?.message ?? "Не удалось отправить код");
        } finally {
            setLoading(false);
        }
    }

    async function verifyCode() {
        setErr(null);
        if (code.trim().length < 4) {
            setErr("Введите код из SMS.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/portal/verify-code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, code: code.trim(), deviceKey }),
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                throw new Error(txt || `HTTP ${res.status}`);
            }

            setStep("success");
        } catch (e: any) {
            setErr(e?.message ?? "Неверный код");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto grid min-h-screen max-w-[520px] place-items-center px-4 py-10">
                <Card className="w-full rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-sm">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white">
                                <Wifi className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-base font-semibold">DigitalSpeedScope Wi-Fi</div>
                                <div className="mt-0.5 text-xs text-slate-400">
                                    Для доступа к интернету подтвердите номер телефона
                                </div>
                            </div>
                        </div>

                        <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-900/30 text-slate-300">
                            Captive Portal
                        </Badge>
                    </div>

                    <Separator className="my-5 bg-slate-800" />

                    {/* Steps indicator */}
                    <div className="mb-5 grid grid-cols-3 gap-2 text-[11px]">
                        <StepChip active={step === "phone"} done={step !== "phone"} label="Номер" />
                        <StepChip active={step === "code"} done={step === "success"} label="Код" />
                        <StepChip active={step === "success"} done={false} label="Доступ" />
                    </div>

                    {step === "phone" ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Phone className="h-4 w-4" />
                                    Номер телефона (KZ)
                                </div>
                                <Input
                                    value={phoneRaw}
                                    onChange={(e) => setPhoneRaw(e.target.value)}
                                    placeholder="+7 7xx xxx xx xx"
                                    className="mt-2 h-11 rounded-xl border-slate-800 bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
                                    inputMode="tel"
                                />
                                <div className="mt-2 text-[11px] text-slate-500">
                                    Мы отправим SMS с кодом подтверждения.
                                </div>
                            </div>

                            {err ? <ErrorBox text={err} /> : null}

                            <Button
                                className={cn(
                                    "h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500",
                                    (loading || !canRequest) && "opacity-90"
                                )}
                                disabled={loading || !canRequest}
                                onClick={requestCode}
                            >
                                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                Получить код
                            </Button>

                            <div className="text-center text-[11px] text-slate-500">
                                Подключаясь, вы соглашаетесь с правилами сети.
                            </div>
                        </div>
                    ) : null}

                    {step === "code" ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <KeyRound className="h-4 w-4" />
                                        Код из SMS
                                    </div>
                                    <Badge variant="outline" className="rounded-full border-slate-700 bg-slate-900/30 text-slate-300">
                                        {formatKZPhone(phone)}
                                    </Badge>
                                </div>

                                <Input
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Введите 4–6 цифр"
                                    className="mt-2 h-11 rounded-xl border-slate-800 bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
                                    inputMode="numeric"
                                />

                                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                    <span>Код действует ограниченное время.</span>
                                    <button
                                        type="button"
                                        className={cn(
                                            "rounded-lg px-2 py-1 transition",
                                            expiresIn > 0
                                                ? "cursor-not-allowed bg-slate-900/30 text-slate-400"
                                                : "bg-slate-900/50 text-slate-200 hover:bg-slate-900"
                                        )}
                                        disabled={expiresIn > 0 || loading}
                                        onClick={() => requestCode()}
                                    >
                                        {expiresIn > 0 ? `Отправить снова через ${expiresIn}s` : "Отправить снова"}
                                    </button>
                                </div>
                            </div>

                            {err ? <ErrorBox text={err} /> : null}

                            <Button
                                className={cn("h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500", loading && "opacity-90")}
                                disabled={loading}
                                onClick={verifyCode}
                            >
                                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                Подтвердить и подключиться
                            </Button>

                            <Button
                                variant="secondary"
                                className="h-11 w-full rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
                                disabled={loading}
                                onClick={() => {
                                    setStep("phone");
                                    setCode("");
                                    setErr(null);
                                }}
                            >
                                Изменить номер
                            </Button>
                        </div>
                    ) : null}

                    {step === "success" ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                                    <div>
                                        <div className="text-sm font-medium text-slate-100">Доступ разрешён</div>
                                        <div className="mt-1 text-xs text-slate-300/80">
                                            Теперь вы можете пользоваться интернетом.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500"
                                onClick={() => {
                                    // В captive portal обычно просто закрывают вкладку.
                                    window.location.href = "https://example.com";
                                }}
                            >
                                Продолжить
                            </Button>

                            <div className="text-center text-[11px] text-slate-500">
                                Если интернет не открылся — выключите/включите Wi-Fi и попробуйте снова.
                            </div>
                        </div>
                    ) : null}
                </Card>

                <div className="mt-6 text-center text-[11px] text-slate-600">
                    DigitalSpeedScope · Portal MVP
                </div>
            </div>
        </div>
    );
}

function StepChip({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
    return (
        <div
            className={cn(
                "rounded-xl border px-3 py-2 text-center",
                done
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                    : active
                        ? "border-indigo-500/25 bg-indigo-600/15 text-indigo-200"
                        : "border-slate-800 bg-slate-900/20 text-slate-400"
            )}
        >
            {label}
        </div>
    );
}

function ErrorBox({ text }: { text: string }) {
    return (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
            <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div className="min-w-0 break-words">{text}</div>
            </div>
        </div>
    );
}
