"use client";

import * as React from "react";
import { apiGet } from "@/lib/api";
import type { MeasurementStatus, MeasurementsListResponse } from "@/lib/api-types";
import { useRange } from "@/components/layout/RangeContext";

export type MeasurementsFilters = {
  q: string;
  city: string; // "Все города" | "Алматы" | ...
  status: MeasurementStatus | "ALL";
};

export function useMeasurements(params: {
  limit: number;
  offset: number;
  filters: MeasurementsFilters;
}) {
  const { range } = useRange();
  const { limit, offset, filters } = params;

  const [data, setData] = React.useState<MeasurementsListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const query: Record<string, any> = {
      range,
      limit,
      offset,
    };

    if (filters.q.trim()) query.q = filters.q.trim();
    if (filters.city && filters.city !== "Все города") query.city = filters.city;
    if (filters.status && filters.status !== "ALL") query.status = filters.status;

    apiGet<MeasurementsListResponse>("/measurements", query)
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
  }, [range, limit, offset, filters.q, filters.city, filters.status]);

  return { data, loading, error };
}
