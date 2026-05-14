import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  Calculator,
  CalendarDays,
  LogOut,
  PanelLeft,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type MenuItem = {
  icon: typeof Calculator;
  label: string;
  path: string;
  shortLabel: string;
};

const menuItems: MenuItem[] = [
  { icon: Calculator, label: "總覽儀表板", path: "/", shortLabel: "總覽" },
  { icon: CalendarDays, label: "月報管理", path: "/reports", shortLabel: "月報" },
  { icon: BarChart3, label: "年度彙總", path: "/annual", shortLabel: "年度" },
  { icon: Users, label: "鐵工名單", path: "/workers", shortLabel: "名單" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl border border-border bg-card p-8 shadow-[10px_10px_0_0_var(--color-shadow)]">
            <p className="mb-4 text-xs uppercase tracking-[0.5em] text-muted-foreground">
              YIZHEN COSTING SYSTEM
            </p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">登入後繼續使用月度核算系統</h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
              系統以月份月報為核心，整合進貨、出貨、運費、加工與營業毛利計算。請先登入，再進入儀表板與月報頁面。
            </p>
            <Button
              className="mt-8 h-12 rounded-none border border-foreground px-6 text-sm font-bold tracking-[0.18em] uppercase"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              立即登入
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const activeMenuItem = useMemo(
    () =>
      menuItems.find(item =>
        item.path === "/" ? location === "/" : location === item.path || location.startsWith(`${item.path}/`)
      ) ?? menuItems[0],
    [location]
  );

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border bg-sidebar text-sidebar-foreground">
        <SidebarHeader className="border-b border-border px-3 py-4">
          <div className="flex items-start gap-3 px-2">
            <SidebarTrigger className="mt-1 flex h-8 w-8 items-center justify-center rounded-none border border-border bg-background text-foreground transition-colors hover:bg-accent">
              <PanelLeft className="h-4 w-4" />
            </SidebarTrigger>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-[11px] uppercase tracking-[0.45em] text-muted-foreground">YIZHEN</p>
              <h2 className="mt-2 text-lg font-black tracking-tight">成本與毛利核算系統</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">以月報為主體，統一噸數口徑與毛利計算鏈。</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          <SidebarMenu>
            {menuItems.map(item => {
              const isActive = activeMenuItem.path === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    onClick={() => setLocation(item.path)}
                    className="h-12 rounded-none border border-transparent px-3 text-sm font-semibold tracking-[0.18em] uppercase data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.shortLabel}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-accent group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-10 w-10 rounded-none border border-border">
                  <AvatarFallback className="rounded-none bg-muted font-bold text-foreground">
                    {user?.name?.slice(0, 1).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-sm font-bold">{user?.name || "未命名使用者"}</p>
                  <p className="mt-1 truncate text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {user?.email || "PASSWORD LOGIN"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none border border-border">
              <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-none text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                登出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        {isMobile ? (
          <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="rounded-none border border-border" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Navigation</p>
                <p className="text-sm font-bold">{activeMenuItem.label}</p>
              </div>
            </div>
          </div>
        ) : null}
        <main className="min-h-screen p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
