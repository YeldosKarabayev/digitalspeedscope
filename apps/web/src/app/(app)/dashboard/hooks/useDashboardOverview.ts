"use client";

import * as React from "react";
import { apiGet } from "@/lib/api";
import type { DashboardOverviewResponse } from "@/lib/api-types";
import { useRange } from "@/components/layout/RangeContext";

export function useDashboardOverview() {
  const { range } = useRange();

  const [data, setData] = React.useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    apiGet<DashboardOverviewResponse>("/dashboard/overview", { range })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Ошибка загрузки overview");
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [range]);

  return { data, loading, error };
}
