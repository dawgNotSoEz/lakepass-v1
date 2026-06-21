import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Anchor, Ship, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { myProfileQuery } from "@/lib/marina-queries";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  redirect: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/_authenticated/welcome")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Welcome — Lake Pass" }] }),
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const target = search.redirect || "";
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery(myProfileQuery());
  const [choice, setChoice] = useState<"customer" | "marina" | null>(null);
  const [saving, setSaving] = useState(false);

  // If already chose a role, bounce.
  useEffect(() => {
    if (isLoading) return;
    if (profile?.account_type === "marina") {
      navigate({ to: target || "/dashboard", replace: true });
    } else if (profile?.account_type === "customer") {
      navigate({ to: target || "/", replace: true });
    }
  }, [profile, isLoading, navigate, target]);

  async function save() {
    if (!choice || !profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_type: choice })
        .eq("id", profile.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", "me"] });
      toast.success("You're all set!");
      navigate({ to: target || (choice === "marina" ? "/dashboard" : "/"), replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-deep">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Anchor className="h-5 w-5" />
          <span className="font-display text-lg font-semibold">Lake Pass</span>
        </div>
        <h1 className="mt-10 text-center font-display text-4xl font-semibold sm:text-5xl">
          How will you use Lake Pass?
        </h1>
        <p className="mt-3 max-w-xl text-center text-primary-foreground/80">
          You can change this later. Pick the option that fits you best.
        </p>

        <div className="mt-12 grid w-full gap-5 sm:grid-cols-2">
          <RoleCard
            icon={User}
            title="I'm here to book a boat"
            description="Browse marinas, compare boats, reserve in minutes."
            active={choice === "customer"}
            onClick={() => setChoice("customer")}
          />
          <RoleCard
            icon={Ship}
            title="I run a marina"
            description="List your fleet, take online bookings, manage your dock."
            active={choice === "marina"}
            onClick={() => setChoice("marina")}
          />
        </div>

        <Button
          size="lg"
          className="mt-10 w-full max-w-sm bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={save}
          disabled={!choice || saving}
        >
          {saving ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-card/10 p-6 text-left text-primary-foreground backdrop-blur transition hover:bg-card/20",
        active ? "border-accent ring-2 ring-accent" : "border-white/15",
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/20 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-primary-foreground/80">{description}</p>
    </button>
  );
}
