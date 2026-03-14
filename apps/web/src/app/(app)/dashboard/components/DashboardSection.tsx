import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardSection({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-slate-800 bg-slate-950/40 p-5",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-100">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-400">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-4">{children}</div>
    </Card>
  );
}
