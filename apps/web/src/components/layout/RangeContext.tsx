"use client";

import * as React from "react";

export type RangeKey = "1h" | "24h" | "7d" | "30d";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "1h": "1ч",
  "24h": "24ч",
  "7d": "7д",
  "30d": "30д",
};

const RANGE_KEYS: RangeKey[] = ["1h", "24h", "7d", "30d"];

type RangeState = {
  range: RangeKey;
  setRange: (r: RangeKey) => void;
};

const RangeContext = React.createContext<RangeState | null>(null);

function readRangeFromUrl(): RangeKey | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const r = url.searchParams.get("range");
  if (!r) return null;
  return (RANGE_KEYS.includes(r as RangeKey) ? (r as RangeKey) : null);
}

function writeRangeToUrl(range: RangeKey) {
  const url = new URL(window.location.href);
  url.searchParams.set("range", range);
  // не делаем full reload, и не ломаем историю каждый раз:
  window.history.replaceState({}, "", url.toString());
  // уведомим слушателей
  window.dispatchEvent(new Event("dss:urlstate"));
}

export function RangeProvider({
  children,
  defaultRange = "24h",
}: {
  children: React.ReactNode;
  defaultRange?: RangeKey;
}) {
  const [range, setRangeState] = React.useState<RangeKey>(defaultRange);

  // 1) initial hydrate from URL
  React.useEffect(() => {
    const fromUrl = readRangeFromUrl();
    if (fromUrl) setRangeState(fromUrl);
    else writeRangeToUrl(defaultRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) keep URL in sync when range changes
  const setRange = React.useCallback((r: RangeKey) => {
    setRangeState(r);
    if (typeof window !== "undefined") writeRangeToUrl(r);
  }, []);

  // 3) handle back/forward (popstate) & internal urlstate
  React.useEffect(() => {
    const sync = () => {
      const fromUrl = readRangeFromUrl();
      if (fromUrl) setRangeState(fromUrl);
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("dss:urlstate", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("dss:urlstate", sync);
    };
  }, []);

  const value = React.useMemo(() => ({ range, setRange }), [range, setRange]);
  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRange() {
  const ctx = React.useContext(RangeContext);
  if (!ctx) throw new Error("useRange must be used inside <RangeProvider />");
  return ctx;
}
