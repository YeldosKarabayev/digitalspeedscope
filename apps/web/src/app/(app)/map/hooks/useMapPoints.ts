"use client";

import * as React from "react";
import { apiGet } from "@/lib/api";
import type { MapPointsResponse } from "@/lib/api-types";
import { useRange } from "@/components/layout/RangeContext";

export function useMapPoints(args: {
  city: string;
  metric: "download" | "upload" | "ping";
}) {
  const { range } = useRange();
  const { city, metric } = args;

  const [data, setData] = React.useState<MapPointsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    apiGet<MapPointsResponse>("/map/points", {
      range,
      metric,
      city,
    })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setLoading(false);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Ошибка загрузки точек");
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [range, metric, city]);

  return { data, loading, error };
}
