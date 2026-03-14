"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getAccessToken, clearTokens, setTokens } from "@/lib/auth-tokens";

type User = { id: string; email: string; name?: string | null; role: "ADMIN" | "OPERATOR" | "VIEWER"; isActive: boolean };

type AuthState = {
  ready: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthCtx = React.createContext<AuthState | null>(null);

export function useAuth() {
  const v = React.useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);

  const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/portal");

  async function loadMe() {
    try {
      const token = getAccessToken();
      if (!token) {
        setUser(null);
        return;
      }
      const me = await apiFetch<{ ok: true; user: User }>("/auth/me");
      setUser(me.user);
    } catch (e: any) {
      setUser(null);
      clearTokens();
    }
  }

  React.useEffect(() => {
    (async () => {
      await loadMe();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    if (!user && !isAuthRoute) router.replace("/login");
  }, [ready, user, isAuthRoute, router]);

  async function login(email: string, password: string) {
    const res = await apiFetch<{ ok: true; accessToken: string; refreshToken: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    router.replace("/dashboard");
  }

  function logout() {
    clearTokens();
    setUser(null);
    router.replace("/login");
  }

  return (
    <AuthCtx.Provider value={{ ready, user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
