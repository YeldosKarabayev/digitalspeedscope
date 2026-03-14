export type RangeKey = "1h" | "24h" | "7d" | "30d";

export type DashboardOverviewResponse = {
  range: RangeKey;
  totalDevices: number;
  activeDevices24h: number;
  avgDownloadMbps: number;
  avgUploadMbps: number;
  avgPingMs: number;
  incidents: number;
};

export type MeasurementsRecentResponse = {
  range: RangeKey;
  rows: Array<{
    id: string;
    ts: string;
    device: string;
    city: string;
    download: number;
    upload: number;
    ping: number;
    status: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  }>;
};

export type MapPointsResponse = {
  range: RangeKey;
  metric: "download" | "upload" | "ping";
  city: string;
  points: Array<{
    id: string;
    name: string;
    city: string;
    lat: number;
    lng: number;
    download: number;
    upload: number;
    ping: number;
    isp?: string;
    deviceUid?: string;
    lastSeen: string;
  }>;
};

export type DashboardTrendsResponse = {
  range: RangeKey;
  points: Array<{
    ts: string;
    label: string;
    download: number;
    upload: number;
    ping: number;
  }>;
};

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


