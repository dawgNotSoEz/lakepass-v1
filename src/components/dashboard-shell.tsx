import { Link, useNavigate } from "@tanstack/react-router";
import {
  Anchor,
  LayoutDashboard,
  Ship,
  LogOut,
  Calendar,
  Scan,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function DashboardShell({
  children,
  activeTab,
  setActiveTab,
}: {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "fleet", label: "Fleet & CSV", icon: Ship },
    { id: "calendar", label: "Reservations", icon: Calendar },
    { id: "scan", label: "Check-In / Scan", icon: Scan },
    { id: "settings", label: "Stripe Connect", icon: CreditCard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
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
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition cursor-pointer",
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
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
      <main className="bg-background flex flex-col min-h-screen overflow-y-auto">
        <div className="flex items-center justify-between border-b bg-card px-6 py-4 md:hidden">
          <div className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Lake Pass</span>
          </div>
          <div className="flex items-center gap-2">
            {nav.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={activeTab === item.id ? "default" : "ghost"}
                onClick={() => setActiveTab(item.id)}
                className="text-xs px-2"
              >
                {item.label.split(" ")[0]}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
