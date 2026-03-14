"use client";

import * as React from "react";
import { apiGet } from "@/lib/api";
import type { MeasurementsRecentResponse } from "@/lib/api-types";
import { useRange } from "@/components/layout/RangeContext";

export function useRecentMeasurements() {
  const { range } = useRange();

  const [data, setData] = React.useState<MeasurementsRecentResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    apiGet<MeasurementsRecentResponse>("/measurements/recent", { range })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Ошибка загрузки измерений");
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [range]);

  return { data, loading, error };
}
