const ACCESS_KEY = "dss_access";
const REFRESH_KEY = "dss_refresh";

export function getAccessToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY);
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
