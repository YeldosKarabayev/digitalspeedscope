import { RangeKey } from "./api-types";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth-tokens";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type FetchOpts = RequestInit & { retry?: boolean };

export type ApiErrorShape = {
  message: string;
  status?: number;
};



function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  init?: RequestInit
): Promise<T> {
  const qs = params ? toQuery(params) : "";
  return apiFetch<T>(`${path}${qs}`, { method: "GET", cache: "no-store", ...init });
}

export type MeasurementStatus = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

export type MeasurementsListResponse = {
  range: RangeKey;
  total: number;
  limit: number;
  offset: number;
  rows: Array<{
    id: string;
    ts: string;
    status: MeasurementStatus;
    download: number;
    upload: number;
    ping: number;
    deviceUid: string;
    isp: string | null;
    pointName: string | null;
    city: string | null;
  }>;
};



async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  if (!json?.accessToken || !json?.refreshToken) return null;

  setTokens(json.accessToken, json.refreshToken);
  return json.accessToken as string;
}

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { retry, ...init } = opts; 
  const access = getAccessToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && retry !== false) {
    const nextAccess = await refreshTokens();
    if (!nextAccess) {
      clearTokens();
      throw new Error("UNAUTHORIZED");
    }

    const retryHeaders = new Headers(init.headers);
    if (!retryHeaders.has("Content-Type") && init.body) retryHeaders.set("Content-Type", "application/json");
    retryHeaders.set("Authorization", `Bearer ${nextAccess}`);

    const res2 = await fetch(`${API_URL}${path}`, { ...init, headers: retryHeaders });
    if (!res2.ok) throw new Error(await res2.text().catch(() => `HTTP ${res2.status}`));
    return (await res2.json()) as T;
  }

  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return (await res.json()) as T;
}
