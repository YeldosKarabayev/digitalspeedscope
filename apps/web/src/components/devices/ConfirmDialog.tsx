"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Подтвердить",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  onConfirm: () => Promise<void> | void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <Card className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/90 p-5">
        <div className="text-base font-semibold text-slate-100">{title}</div>
        {description ? <div className="mt-2 text-sm text-slate-400">{description}</div> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" className="h-9 rounded-xl" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            className="h-9 rounded-xl bg-rose-600 hover:bg-rose-500"
            onClick={async () => {
              await onConfirm();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}