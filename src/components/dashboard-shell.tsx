import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Anchor, LayoutDashboard, Ship, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/dashboard", label: "Fleet", icon: Ship, disabled: true },
  ];

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex items-center gap-2 px-6 py-6">
          <Anchor className="h-5 w-5 text-accent" />
          <span className="font-display text-lg font-semibold">Lake Pass</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                pathname === item.to
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                item.disabled && "pointer-events-none opacity-50",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.disabled && (
                <span className="ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                  Soon
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="bg-background">
        <div className="flex items-center justify-between border-b bg-card px-6 py-4 md:hidden">
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Lake Pass</span>
          </div>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
}
