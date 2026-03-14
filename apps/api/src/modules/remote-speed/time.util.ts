export function parseRouterOsTimeToMs(value: unknown): number | null {
  if (value == null) return null;

  const s = String(value).trim();

  const combo = s.match(/^(\d+)ms(\d+)us$/);
  if (combo) {
    const ms = Number(combo[1]);
    const us = Number(combo[2]);
    return Math.round(ms + us / 1000);
  }

  const msOnly = s.match(/^(\d+)ms$/);
  if (msOnly) {
    return Number(msOnly[1]);
  }

  const secMs = s.match(/^(\d+)s(\d+)ms$/);
  if (secMs) {
    return Number(secMs[1]) * 1000 + Number(secMs[2]);
  }

  const secOnly = s.match(/^(\d+)s$/);
  if (secOnly) {
    return Number(secOnly[1]) * 1000;
  }

  const usOnly = s.match(/^(\d+)us$/);
  if (usOnly) {
    return Math.round(Number(usOnly[1]) / 1000);
  }

  const n = Number(s);
  if (Number.isFinite(n)) return Math.round(n);

  return null;
}

export function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}