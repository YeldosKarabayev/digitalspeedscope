export const DSS_LIMITS = {
  MAX_CONCURRENCY: 1,
  COOLDOWN_SEC: 10,
};

export const DSS_PROFILES = {
  lite50: {
    targetMbps: 50,
    durationSec: 10,
    protocol: "udp" as const,
  },
  std100: {
    targetMbps: 100,
    durationSec: 12,
    protocol: "udp" as const,
  },
  plus150: {
    targetMbps: 150,
    durationSec: 15,
    protocol: "udp" as const,
  },
};

export const DSS_FETCH_URLS = {
  small: process.env.DSS_FETCH_SMALL_URL ?? "http://194.32.141.218/dss/10MB.bin",
  large: process.env.DSS_FETCH_LARGE_URL ?? "http://194.32.141.218/dss/100MB.bin",
};