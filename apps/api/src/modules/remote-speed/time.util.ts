export function parseRouterOsTimeToMs(value: unknown): number | null {
  if (value == null) return null;

  const s = String(value).trim();

  // 99ms535us
  const combo = s.match(/^(\d+)ms(\d+)us$/);
  if (combo) {
    const ms = Number(combo[1]);
    const us = Number(combo[2]);
    return Math.round(ms + us / 1000);
  }

  // 123ms
  const msOnly = s.match(/^(\d+)ms$/);
  if (msOnly) {
    return Number(msOnly[1]);
  }

  // 1s200ms
  const secMs = s.match(/^(\d+)s(\d+)ms$/);
  if (secMs) {
    return Number(secMs[1]) * 1000 + Number(secMs[2]);
  }

  // plain number fallback
  const n = Number(s);
  if (Number.isFinite(n)) return Math.round(n);

  return null;
}

export function avg(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}