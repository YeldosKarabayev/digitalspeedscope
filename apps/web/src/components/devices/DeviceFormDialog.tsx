"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type DeviceForm = {
  uid: string;
  name?: string | null;
  isp?: string | null;
  isActive?: boolean;
  kind?: "GENERIC" | "MIKROTIK";
  mikrotikHost?: string | null;
  mikrotikPort?: number | null;
  mikrotikAuthMethod?: "API" | "SSH" | null;
  mikrotikUsername?: string | null;
  mikrotikSecretRef?: string | null;
};

export function DeviceFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial: any | null;
  onSubmit: (data: DeviceForm) => Promise<void>;
}) {
  const [form, setForm] = React.useState<DeviceForm>({
    uid: "",
    name: "",
    isp: "",
    isActive: true,
    kind: "GENERIC",
    mikrotikHost: "",
    mikrotikPort: 8728,
    mikrotikAuthMethod: "API",
    mikrotikUsername: "",
    mikrotikSecretRef: "",
  });

  React.useEffect(() => {
    if (!open) return;
    if (!initial) return;
    setForm({
      uid: initial.uid ?? "",
      name: initial.name ?? "",
      isp: initial.isp ?? "",
      isActive: initial.isActive ?? true,
      kind: initial.kind ?? "GENERIC",
      mikrotikHost: initial.mikrotikHost ?? "",
      mikrotikPort: initial.mikrotikPort ?? 8728,
      mikrotikAuthMethod: initial.mikrotikAuthMethod ?? "API",
      mikrotikUsername: initial.mikrotikUsername ?? "",
      mikrotikSecretRef: initial.mikrotikSecretRef ?? "",
    });
  }, [open, initial]);

  if (!open) return null;

  const isMikrotik = form.kind === "MIKROTIK";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <Card className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/90 p-5">
        <div className="text-base font-semibold text-slate-100">{title}</div>
        <div className="mt-1 text-xs text-slate-400">UID обязателен. MikroTik поля — только если kind=MIKROTIK.</div>

        <Separator className="my-4 bg-slate-800" />

        <div className="grid gap-3">
          <Field label="UID *">
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
              value={form.uid}
              onChange={(e) => setForm((s) => ({ ...s, uid: e.target.value }))}
              placeholder="например: MTK-001"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Название">
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                value={form.name ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Например: Office Router"
              />
            </Field>
            <Field label="ISP">
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                value={form.isp ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, isp: e.target.value }))}
                placeholder="Например: Ростелеком"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Тип устройства">
              <select
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                value={form.kind}
                onChange={(e) => setForm((s) => ({ ...s, kind: e.target.value as any }))}
              >
                <option value="GENERIC">GENERIC</option>
                <option value="MIKROTIK">MIKROTIK</option>
              </select>
            </Field>

            <Field label="Активно">
              <select
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                value={String(form.isActive ?? true)}
                onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.value === "true" }))}
              >
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            </Field>
          </div>

          {isMikrotik ? (
            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/20 p-4">
              <div className="text-sm font-medium text-slate-200">MikroTik доступ</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Host">
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    value={form.mikrotikHost ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, mikrotikHost: e.target.value }))}
                    placeholder="192.168.88.1"
                  />
                </Field>
                <Field label="Port">
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    value={form.mikrotikPort ?? 8728}
                    onChange={(e) => setForm((s) => ({ ...s, mikrotikPort: Number(e.target.value) }))}
                  />
                </Field>

                <Field label="Auth method">
                  <select
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    value={form.mikrotikAuthMethod ?? "API"}
                    onChange={(e) => setForm((s) => ({ ...s, mikrotikAuthMethod: e.target.value as any }))}
                  >
                    <option value="API">API</option>
                    <option value="SSH">SSH</option>
                  </select>
                </Field>

                <Field label="Username">
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    value={form.mikrotikUsername ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, mikrotikUsername: e.target.value }))}
                  />
                </Field>

                <Field label="SecretRef (не пароль!)">
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    value={form.mikrotikSecretRef ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, mikrotikSecretRef: e.target.value }))}
                    placeholder="vault://mikrotik/mtk-001"
                  />
                </Field>
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" className="h-9 rounded-xl" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500"
              onClick={async () => {
                const payload: DeviceForm = {
                  uid: form.uid.trim(),
                  name: form.name?.trim() ? form.name : null,
                  isp: form.isp?.trim() ? form.isp : null,
                  isActive: form.isActive ?? true,
                  kind: form.kind ?? "GENERIC",
                  mikrotikHost: isMikrotik ? (form.mikrotikHost?.trim() ? form.mikrotikHost : null) : null,
                  mikrotikPort: isMikrotik ? (form.mikrotikPort ?? 8728) : null,
                  mikrotikAuthMethod: isMikrotik ? (form.mikrotikAuthMethod ?? "API") : null,
                  mikrotikUsername: isMikrotik ? (form.mikrotikUsername?.trim() ? form.mikrotikUsername : null) : null,
                  mikrotikSecretRef: isMikrotik ? (form.mikrotikSecretRef?.trim() ? form.mikrotikSecretRef : null) : null,
                };
                await onSubmit(payload);
              }}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <div className="text-xs text-slate-400">{label}</div>
      {children}
    </label>
  );
}