import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Palette,
  Ship,
  Building2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { myMarinaQuery } from "@/lib/marina-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your marina — Lake Pass" }] }),
  component: OnboardingWizard,
});

const LAKES = ["Table Rock Lake", "Lake Murray", "Other"] as const;
const TIMEZONES = [
  { value: "America/Chicago", label: "Central (Branson, Lake Murray)" },
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
];

type WizardState = {
  marinaId?: string;
  profile: { name: string; address: string; lake: string; timezone: string };
  boats: ParsedBoat[];
  widget: { primary_color: string; font: string; logo_url: string };
};

type ParsedBoat = {
  name: string;
  boat_type: string;
  capacity: number;
  year?: number;
  hourly_rate?: number;
  daily_rate?: number;
};

function OnboardingWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: existing } = useQuery(myMarinaQuery());

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<WizardState>(() => ({
    marinaId: existing?.marina?.id,
    profile: {
      name: existing?.marina?.name ?? "",
      address: existing?.marina?.address ?? "",
      lake: existing?.marina?.lake ?? "Table Rock Lake",
      timezone: existing?.marina?.timezone ?? "America/Chicago",
    },
    boats: [],
    widget: {
      primary_color: existing?.marina?.widget_primary_color ?? "#0B4F6C",
      font: existing?.marina?.widget_font ?? "Outfit",
      logo_url: existing?.marina?.widget_logo_url ?? "",
    },
  }));

  const steps = useMemo(
    () => [
      { title: "Marina profile", icon: Building2 },
      { title: "Import your fleet", icon: Ship },
      { title: "Connect payments", icon: CreditCard },
      { title: "Widget style", icon: Palette },
    ],
    [],
  );

  async function saveProfileAndNext() {
    const parsed = z
      .object({
        name: z.string().trim().min(2, "Marina name is required").max(120),
        address: z.string().trim().max(200).optional().or(z.literal("")),
        lake: z.string().min(1),
        timezone: z.string().min(1),
      })
      .safeParse(state.profile);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");

      let marinaId = state.marinaId;
      if (marinaId) {
        const { error } = await supabase
          .from("marinas")
          .update({
            name: parsed.data.name,
            address: parsed.data.address || null,
            lake: parsed.data.lake,
            timezone: parsed.data.timezone,
          })
          .eq("id", marinaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("marinas")
          .insert({
            name: parsed.data.name,
            address: parsed.data.address || null,
            lake: parsed.data.lake,
            timezone: parsed.data.timezone,
            created_by: auth.user.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        marinaId = data.id;
      }
      setState((s) => ({ ...s, marinaId }));
      await qc.invalidateQueries({ queryKey: ["marina", "me"] });
      setStep(1);
    } catch (e: any) {
      const msg =
        e?.message || e?.error_description || e?.hint || e?.details || "Could not save marina";
      console.error("[onboarding] save marina failed", e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function saveBoatsAndNext() {
    if (!state.marinaId) return;
    if (state.boats.length === 0) {
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      const rows = state.boats.map((b) => ({
        marina_id: state.marinaId!,
        name: b.name,
        boat_type: b.boat_type,
        capacity: b.capacity,
        year: b.year ?? null,
        hourly_rate: b.hourly_rate ?? null,
        daily_rate: b.daily_rate ?? null,
      }));
      const { error } = await supabase.from("boats").insert(rows);
      if (error) throw error;
      toast.success(`Imported ${rows.length} boat${rows.length === 1 ? "" : "s"}`);
      setState((s) => ({ ...s, boats: [] }));
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save boats");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!state.marinaId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("marinas")
        .update({
          widget_primary_color: state.widget.primary_color,
          widget_font: state.widget.font,
          widget_logo_url: state.widget.logo_url || null,
          onboarding_completed: true,
        })
        .eq("id", state.marinaId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["marina", "me"] });
      toast.success("You're all set!");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Anchor className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-semibold">Lake Pass</span>
          <span className="ml-auto text-sm text-muted-foreground">Setup</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <Stepper steps={steps} current={step} />

        <div className="mt-10 rounded-2xl border bg-card p-8 shadow-soft">
          {step === 0 && <StepProfile state={state} setState={setState} />}
          {step === 1 && <StepBoats state={state} setState={setState} />}
          {step === 2 && <StepPayments />}
          {step === 3 && <StepWidget state={state} setState={setState} />}

          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <Button
              variant="ghost"
              disabled={step === 0 || saving}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
            {step === 0 && (
              <Button onClick={saveProfileAndNext} disabled={saving}>
                {saving ? "Saving…" : "Continue"} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 1 && (
              <Button onClick={saveBoatsAndNext} disabled={saving}>
                {saving
                  ? "Saving…"
                  : state.boats.length > 0
                    ? `Import ${state.boats.length} & continue`
                    : "Skip for now"}{" "}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => setStep(3)}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={finish} disabled={saving}>
                {saving ? "Finishing…" : "Finish setup"} <Check className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ steps, current }: { steps: { title: string; icon: any }[]; current: number }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {steps.map((s, i) => {
        const done = i < current,
          active = i === current;
        return (
          <li
            key={s.title}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-4 shadow-soft",
              active && "border-primary",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                done
                  ? "bg-primary text-primary-foreground"
                  : active
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Step {i + 1}
              </p>
              <p className="text-sm font-medium text-foreground">{s.title}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepProfile({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  const p = state.profile;
  const set = (patch: Partial<WizardState["profile"]>) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Tell us about your marina</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This is what guests will see when they book.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Marina name</Label>
          <Input
            id="name"
            value={p.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="State Park Marina"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={p.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="380 State Park Marina Rd, Branson, MO"
            rows={2}
          />
        </div>
        <div>
          <Label>Lake</Label>
          <Select value={p.lake} onValueChange={(v) => set({ lake: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAKES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Timezone</Label>
          <Select value={p.timezone} onValueChange={(v) => set({ timezone: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StepBoats({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const boats = parseCsv(text);
        if (boats.length === 0) {
          toast.error("No rows parsed — check your file");
          return;
        }
        setState((s) => ({ ...s, boats }));
        toast.success(`Parsed ${boats.length} boats`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not parse file");
      }
    };
    reader.readAsText(file);
  }

  function addBlank() {
    setState((s) => ({
      ...s,
      boats: [...s.boats, { name: "", boat_type: "Pontoon", capacity: 8 }],
    }));
  }

  function updateBoat(i: number, patch: Partial<ParsedBoat>) {
    setState((s) => ({
      ...s,
      boats: s.boats.map((b, idx) => (idx === i ? { ...b, ...patch } : b)),
    }));
  }

  function removeBoat(i: number) {
    setState((s) => ({ ...s, boats: s.boats.filter((_, idx) => idx !== i) }));
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Import your fleet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a CSV with columns:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          name, type, capacity, year, hourly_rate, daily_rate
        </code>
        . Or add boats manually.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed bg-secondary/50 px-4 py-2.5 text-sm font-medium hover:bg-secondary">
          <Ship className="h-4 w-4" /> Upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
        <Button type="button" variant="outline" size="sm" onClick={addBlank}>
          + Add boat manually
        </Button>
        {state.boats.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {state.boats.length} ready to import
          </span>
        )}
      </div>

      {state.boats.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Cap</th>
                <th className="px-3 py-2 text-left">Year</th>
                <th className="px-3 py-2 text-left">$/hr</th>
                <th className="px-3 py-2 text-left">$/day</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y bg-card">
              {state.boats.map((b, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5">
                    <Input
                      value={b.name}
                      onChange={(e) => updateBoat(i, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={b.boat_type}
                      onChange={(e) => updateBoat(i, { boat_type: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5 w-20">
                    <Input
                      type="number"
                      value={b.capacity}
                      onChange={(e) => updateBoat(i, { capacity: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-2 py-1.5 w-24">
                    <Input
                      type="number"
                      value={b.year ?? ""}
                      onChange={(e) =>
                        updateBoat(i, { year: e.target.value ? Number(e.target.value) : undefined })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 w-24">
                    <Input
                      type="number"
                      value={b.hourly_rate ?? ""}
                      onChange={(e) =>
                        updateBoat(i, {
                          hourly_rate: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 w-24">
                    <Input
                      type="number"
                      value={b.daily_rate ?? ""}
                      onChange={(e) =>
                        updateBoat(i, {
                          daily_rate: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeBoat(i)}>
                      ×
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StepPayments() {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Connect payments</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Take deposits and full payments online when guests book.
      </p>
      <div className="mt-6 rounded-xl border border-dashed bg-secondary/40 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              Payments will be enabled in the next step of your rollout.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll wire up Lake Pass Payments once your account is approved — no card details touch
              your servers, and refunds happen with one click. You can finish setup now and start
              managing your fleet today.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepWidget({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  const w = state.widget;
  const set = (patch: Partial<WizardState["widget"]>) =>
    setState((s) => ({ ...s, widget: { ...s.widget, ...patch } }));
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Brand your booking widget</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This is how the embeddable booking widget on your marina's website will look.
      </p>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <Label htmlFor="logo">Logo URL (optional)</Label>
            <Input
              id="logo"
              value={w.logo_url}
              onChange={(e) => set({ logo_url: e.target.value })}
              placeholder="https://yourmarina.com/logo.svg"
            />
          </div>
          <div>
            <Label htmlFor="color">Primary color</Label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={w.primary_color}
                onChange={(e) => set({ primary_color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-md border"
              />
              <Input
                value={w.primary_color}
                onChange={(e) => set({ primary_color: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Font</Label>
            <Select value={w.font} onValueChange={(v) => set({ font: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Outfit", "Inter", "DM Sans", "Fraunces", "System"].map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border bg-secondary/40 p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Live preview
          </p>
          <div
            className="mt-4 rounded-xl bg-card p-5 shadow-soft"
            style={{
              fontFamily: w.font === "System" ? undefined : `${w.font}, system-ui, sans-serif`,
            }}
          >
            {w.logo_url ? (
              <img
                src={w.logo_url}
                alt="Logo"
                className="h-8 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="text-lg font-semibold" style={{ color: w.primary_color }}>
                {state.profile.name || "Your Marina"}
              </div>
            )}
            <p className="mt-3 text-sm text-foreground/80">Book a boat</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border bg-background p-2">
                Sat, Jun 21
                <br />
                <span className="text-muted-foreground">9:00 AM</span>
              </div>
              <div className="rounded-md border bg-background p-2">
                4 hours
                <br />
                <span className="text-muted-foreground">2 guests</span>
              </div>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: w.primary_color }}
            >
              Reserve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseCsv(text: string): ParsedBoat[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const out: ParsedBoat[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[idx("name")];
    if (!name) continue;
    out.push({
      name,
      boat_type: cols[idx("type")] || cols[idx("boat_type")] || "Pontoon",
      capacity: Number(cols[idx("capacity")] || 0) || 1,
      year: cols[idx("year")] ? Number(cols[idx("year")]) : undefined,
      hourly_rate: cols[idx("hourly_rate")] ? Number(cols[idx("hourly_rate")]) : undefined,
      daily_rate: cols[idx("daily_rate")] ? Number(cols[idx("daily_rate")]) : undefined,
    });
  }
  return out;
}
