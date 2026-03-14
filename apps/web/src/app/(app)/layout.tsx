import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
  
}
