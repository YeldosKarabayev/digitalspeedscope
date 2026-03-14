"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth/AuthProvider";
import { AlertTriangle, Lock } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = React.useState("admin@digitalspeedscope.local");
  const [password, setPassword] = React.useState("admin123");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[520px] place-items-center px-4 py-10">
        <Card className="w-full rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">DigitalSpeedScope</div>
              <div className="text-xs text-slate-400">Вход в панель управления</div>
            </div>
          </div>

          <Separator className="my-5 bg-slate-800" />

          <div className="space-y-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-11 rounded-xl border-slate-800 bg-slate-900/30 text-slate-100"
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              type="password"
              className="h-11 rounded-xl border-slate-800 bg-slate-900/30 text-slate-100"
            />

            {err ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div className="break-words">{err}</div>
                </div>
              </div>
            ) : null}

            <Button
              className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500"
              disabled={loading}
              onClick={async () => {
                setErr(null);
                setLoading(true);
                try {
                  await login(email, password);
                } catch (e: any) {
                  setErr(e?.message === "UNAUTHORIZED" ? "Неверные данные" : e?.message ?? "Ошибка входа");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Войти
            </Button>

            <div className="text-center text-[11px] text-slate-500">
              Если забыл пароль — поменяем через seed (пока MVP).
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
