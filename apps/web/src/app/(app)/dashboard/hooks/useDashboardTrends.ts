"use client";

import * as React from "react";
import { apiGet } from "@/lib/api";
import type { DashboardTrendsResponse } from "@/lib/api-types";
import { useRange } from "@/components/layout/RangeContext";

export function useDashboardTrends() {
  const { range } = useRange();

  const [data, setData] = React.useState<DashboardTrendsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    apiGet<DashboardTrendsResponse>("/dashboard/trends", { range })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Ошибка загрузки трендов");
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [range]);

  return { data, loading, error };
}
