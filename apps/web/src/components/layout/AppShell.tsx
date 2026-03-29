"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Map,
  Gauge,
  Router,
  FileText,
  Bell,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  MessagesSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RangeProvider } from "@/components/layout/RangeContext";
import { useRange, RANGE_LABELS, type RangeKey } from "@/components/layout/RangeContext";
import { useAuth } from "@/components/auth/AuthProvider";




// -------------------------------
// Nav config
// -------------------------------

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const NAV: NavItem[] = [
  { label: "Обзор", href: "/dashboard", icon: BarChart3 },
  { label: "Карта", href: "/map", icon: Map },
  { label: "Измерения", href: "/measurements", icon: Gauge },
  { label: "Устройства", href: "/devices", icon: Router },
  { label: "SpeedTest", href: "/speedtest", icon: Gauge },
  { label: "Отчёты", href: "/reports", icon: FileText },
  { label: "SMS", href: "/sms", icon: MessagesSquare },
  { label: "Оповещения", href: "/alerts", icon: Bell, badge: "0" },
  { label: "Инструменты", href: "/tools", icon: Wrench },
  { label: "Настройки", href: "/settings", icon: Settings },
];

// -------------------------------
// AppShell
// -------------------------------

export default function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  const transitionKey = (title ?? "page") + (subtitle ?? "");

  return (
    <RangeProvider defaultRange="24h">
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

            <main className="flex-1">
              <Topbar title={title} subtitle={subtitle} />

              <div className="px-6 pb-10">
                <PageTransition keyProp={transitionKey}>{children}</PageTransition>
              </div>
            </main>
          </div>
        </div>
      </div>
    </RangeProvider>
  );

}

// -------------------------------
// PageTransition (CSS-based)
// -------------------------------

function PageTransition({
  children,
  keyProp,
}: {
  children: React.ReactNode;
  keyProp: string;
}) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 60);
    return () => window.clearTimeout(t);
  }, [keyProp]);

  return (
    <div
      className={cn(
        "transition-all duration-200 will-change-transform",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      )}
    >
      {children}
    </div>
  );
}

// -------------------------------
// Safe pathname (no next/navigation)
// -------------------------------

function useClientPathname() {
  const [pathname, setPathname] = React.useState<string>("/");

  React.useEffect(() => {
    setPathname(window.location.pathname || "/");

    const notify = () => setPathname(window.location.pathname || "/");
    const onPopState = () => notify();
    window.addEventListener("popstate", onPopState);

    const originalPush = history.pushState;
    const originalReplace = history.replaceState;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function patch(method: any, type: "push" | "replace") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return function patched(this: any, ...args: any[]) {
        const ret = method.apply(this, args);
        window.dispatchEvent(new Event(`dss:${type}state`));
        return ret;
      };
    }


    history.pushState = patch(originalPush, "push");

    history.replaceState = patch(originalReplace, "replace");

    const onState = () => notify();
    window.addEventListener("dss:pushstate", onState);
    window.addEventListener("dss:replacestate", onState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("dss:pushstate", onState);
      window.removeEventListener("dss:replacestate", onState);
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, []);

  return pathname;
}

// -------------------------------
// Sidebar
// -------------------------------

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = useClientPathname();
  const router = useRouter();

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen border-r border-slate-800 bg-slate-950/60 backdrop-blur",
        collapsed ? "w-[76px]" : "w-[280px]"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className={cn("px-4 py-4", collapsed ? "px-3" : "px-4")}>
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <span className="text-sm font-semibold">DS</span>
              </div>
              {!collapsed && (
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-slate-100">DigitalSpeedScope</div>
                  <div className="text-xs text-slate-400">Network Analytics</div>
                </div>
              )}
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="rounded-xl hover:bg-slate-900"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Nav */}
        <ScrollArea className="flex-1">
          <nav className={cn("px-2 py-3", collapsed ? "px-2" : "px-3")}>
            <div className="space-y-1">
              {NAV.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                        active
                          ? "bg-indigo-600/15 text-indigo-200"
                          : "text-slate-200/80 hover:bg-slate-900/60 hover:text-slate-100",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          active ? "text-indigo-300" : "text-slate-400 group-hover:text-slate-200"
                        )}
                      />

                      {!collapsed && (
                        <div className="flex w-full items-center justify-between">
                          <span className={cn(active ? "font-medium" : "font-normal")}>{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px]",
                                active
                                  ? "border-indigo-500/30 bg-indigo-600/15 text-indigo-200"
                                  : "border-slate-700 bg-slate-900/60 text-slate-200/70"
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {!collapsed && (
              <>
                <div className="mt-6 px-1">
                  {/* <div className="text-xs font-medium text-slate-400">Быстрые действия</div> */}
                </div>
                <div className="mt-2 grid gap-2">
                  {/* <Button className="w-full justify-start gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500">
                    <Plus className="h-4 w-4" /> Добавить устройство
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-start gap-2 rounded-xl bg-slate-900/60 text-slate-100 hover:bg-slate-900"
                    onClick={() => router.push("/speedtest")}
                  >
                    <Gauge className="h-4 w-4" /> Запустить тест
                  </Button> */}

                </div>
              </>
            )}
          </nav>
        </ScrollArea>

        <Separator className="bg-slate-800" />

        {/* Footer */}
        <div className={cn("p-3", collapsed ? "px-2" : "px-3")}>
          <Card className={cn("rounded-2xl border-slate-800 bg-slate-950/40", collapsed && "p-0")}>
            <div className={cn("flex items-center gap-3 p-3", collapsed && "justify-center")}>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-slate-900 text-slate-200">AD</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100">Админ</div>
                  <div className="truncate text-xs text-slate-400">admin@digitalspeedscope</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </aside>
  );
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// -------------------------------
// Topbar
// -------------------------------

function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { range, setRange } = useRange();
  const { user, logout } = useAuth();

  const RANGE_OPTIONS: { k: RangeKey; label: string }[] = [
    { k: "1h", label: "Последний час" },
    { k: "24h", label: "Последние 24 часа" },
    { k: "7d", label: "Последние 7 дней" },
    { k: "30d", label: "Последние 30 дней" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/50 backdrop-blur">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold leading-tight text-slate-100">
              {title ?? "Обзор"}
            </div>
            {subtitle ? <div className="text-sm text-slate-400">{subtitle}</div> : null}
          </div>

          <div className="flex items-center gap-3">
            {/* Global search */}
            <div className="relative w-[380px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Поиск устройств, городов, ID…"
                className="h-10 rounded-xl border-slate-800 bg-slate-900/40 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500"
              />
            </div>

            {/* Date range preset */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-slate-800 bg-slate-900/30 text-slate-100 hover:bg-slate-900"
                >
                  Период: {RANGE_LABELS[range]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 border-slate-800 bg-slate-950 text-slate-100"
              >
                <DropdownMenuLabel>Период</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />

                {RANGE_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.k}
                    onClick={() => setRange(opt.k)}
                    className="focus:bg-slate-900"
                  >
                    {opt.label}
                    <span className="ml-auto text-xs text-slate-500">
                      {RANGE_LABELS[opt.k]}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>

            </DropdownMenu>

            {/* Primary action */}
            {/* <Button className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500">
              Добавить устройство
            </Button> */}
            <Button
              variant="secondary"
              className="h-10 rounded-xl bg-slate-900/40 text-slate-100 hover:bg-slate-900"
              onClick={logout}
            >
              Выйти
            </Button>

          </div>
        </div>
      </div>
    </header>
  );
}
