import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowRight, Calendar, DollarSign, Ship, TrendingUp } from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { myMarinaQuery, boatsQuery, myProfileQuery } from "@/lib/marina-queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(myMarinaQuery()),
  head: () => ({ meta: [{ title: "Dashboard — Lake Pass" }] }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm">Not found.</div>,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { data: marinaCtx } = useSuspenseQuery(myMarinaQuery());
  const { data: profile } = useQuery(myProfileQuery());

  useEffect(() => {
    // Customers or undecided users land in the chooser; they explicitly came to the dashboard,
    // so let them switch to marina mode instead of silently bouncing home.
    if (profile && profile.account_type !== "marina") {
      navigate({ to: "/welcome", replace: true });
      return;
    }
    if (!marinaCtx || !marinaCtx.marina?.onboarding_completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [marinaCtx, profile, navigate]);

  return (
    <DashboardShell>
      {marinaCtx?.marina?.onboarding_completed ? (
        <Overview marinaId={marinaCtx.marina.id} marinaName={marinaCtx.marina.name} />
      ) : (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h2 className="font-display text-2xl font-semibold">Let's set up your marina</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A few quick steps to get you taking bookings.
            </p>
            <Link to="/onboarding" className="mt-6 inline-block">
              <Button>
                Continue setup <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Overview({ marinaId, marinaName }: { marinaId: string; marinaName: string }) {
  const { data: boats } = useSuspenseQuery(boatsQuery(marinaId));
  const stats = [
    { label: "Revenue this week", value: "$0", icon: DollarSign, hint: "Coming with bookings" },
    { label: "Bookings today", value: "0", icon: Calendar, hint: "Calendar coming soon" },
    {
      label: "Boats in fleet",
      value: String(boats?.length ?? 0),
      icon: Ship,
      hint: "Imported in onboarding",
    },
    { label: "Utilization", value: "—", icon: TrendingUp, hint: "Available next week" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Marina
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{marinaName}</h1>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-widest">{s.label}</span>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold text-foreground">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border bg-card p-6 shadow-soft">
        <h2 className="font-display text-xl font-semibold">Your fleet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {boats?.length ?? 0} boat{(boats?.length ?? 0) === 1 ? "" : "s"} imported.
        </p>
        <div className="mt-4 divide-y">
          {(boats ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-foreground">{b.name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.boat_type} · capacity {b.capacity}
                  {b.year ? ` · ${b.year}` : ""}
                </p>
              </div>
              <div className="text-right text-sm">
                {b.hourly_rate ? (
                  <p className="font-medium">${Number(b.hourly_rate).toFixed(0)}/hr</p>
                ) : null}
                {b.daily_rate ? (
                  <p className="text-xs text-muted-foreground">
                    ${Number(b.daily_rate).toFixed(0)}/day
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {(!boats || boats.length === 0) && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No boats yet — add them from onboarding.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
