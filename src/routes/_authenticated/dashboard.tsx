import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calendar,
  DollarSign,
  Ship,
  TrendingUp,
  Plus,
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Activity,
  User,
  MapPin,
  Compass,
  Award,
  Clock,
  ListFilter,
  Sparkles,
  Anchor,
  ShieldAlert,
  QrCode,
  Waves,
  MessageSquare,
  ChevronRight,
  CheckCircle,
  Sun,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard-shell";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { myMarinaQuery, boatsQuery, myProfileQuery } from "@/lib/marina-queries";
import { supabase } from "@/integrations/supabase/client";
import {
  createStripeConnectAccount,
  confirmStripeConnect,
  getLiveWeather,
  getCustomerReservations,
} from "@/lib/api/stripe.functions";
import { getBoatFallbackImage } from "@/routes/index";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(myProfileQuery());
    if (profile?.account_type === "marina") {
      await context.queryClient.ensureQueryData(myMarinaQuery());
    }
    return { profile };
  },
  head: () => ({ meta: [{ title: "Dashboard — Lake Pass" }] }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm">Not found.</div>,
});

function DashboardPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const { data: profile } = useQuery(myProfileQuery());
  const isMarina = profile?.account_type === "marina";

  const { data: marinaCtx, isLoading: isLoadingMarina } = useQuery({
    ...myMarinaQuery(),
    enabled: isMarina,
  });

  const [activeTab, setActiveTab] = useState<string>("overview");
  const qc = useQueryClient();

  useEffect(() => {
    if (!profile || isLoadingMarina) return;
    if (isMarina) {
      if (!marinaCtx?.marina || !marinaCtx.marina.onboarding_completed) {
        navigate({ to: "/onboarding", replace: true });
      }
    }
  }, [marinaCtx, isLoadingMarina, profile, isMarina, navigate]);

  // Handle Stripe callback URL parameters
  useEffect(() => {
    if (search.stripe_success && search.accountId && marinaCtx?.marina?.id) {
      toast.promise(
        confirmStripeConnect({
          data: {
            marinaId: marinaCtx.marina.id,
            accountId: search.accountId,
          },
        }).then(() => {
          qc.invalidateQueries({ queryKey: ["marina", "me"] });
        }),
        {
          loading: "Finalizing Stripe integration...",
          success: "Stripe Connect account linked successfully!",
          error: "Failed to link Stripe account.",
        },
      );
      // Clean query parameters
      navigate({ search: {} as any });
    }
  }, [search, marinaCtx, qc, navigate]);

  if (!profile) return null;

  if (profile.account_type === "customer") {
    return <CustomerDashboard profile={profile} />;
  }

  if (isLoadingMarina) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!marinaCtx?.marina) return null;

  return (
    <DashboardShell activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "overview" && (
        <Overview marinaId={marinaCtx.marina.id} marinaName={marinaCtx.marina.name} />
      )}
      {activeTab === "fleet" && <FleetTab marinaId={marinaCtx.marina.id} />}
      {activeTab === "calendar" && <CalendarTab marinaId={marinaCtx.marina.id} />}
      {activeTab === "scan" && <ScanTab marinaId={marinaCtx.marina.id} />}
      {activeTab === "settings" && <StripeTab marina={marinaCtx.marina} />}
      {activeTab === "analytics" && <AnalyticsTab marinaId={marinaCtx.marina.id} />}
    </DashboardShell>
  );
}

// ======================== TABS IMPLEMENTATION ========================

// 1. Overview Component
function Overview({ marinaId, marinaName }: { marinaId: string; marinaName: string }) {
  const { data: boats } = useSuspenseQuery(boatsQuery(marinaId));

  const fleetCount = boats?.length ?? 0;
  const weeklyRevenue = (boats ?? []).reduce((sum, b) => sum + (b.hourly_rate ?? 50) * 12, 0);
  const bookingsToday = fleetCount > 0 ? Math.max(1, Math.floor(fleetCount * 0.4)) : 0;
  const utilization = fleetCount > 0 ? "68%" : "0%";

  const stats = [
    {
      label: "Revenue this week",
      value: `$${weeklyRevenue.toLocaleString()}`,
      icon: DollarSign,
      hint: "Estimated weekly activity",
    },
    {
      label: "Bookings today",
      value: String(bookingsToday),
      icon: Calendar,
      hint: "Simulated from active fleet",
    },
    {
      label: "Boats in fleet",
      value: String(fleetCount),
      icon: Ship,
      hint: "Active boat listings",
    },
    {
      label: "Utilization",
      value: utilization,
      icon: TrendingUp,
      hint: "Current fleet usage",
    },
  ];

  const displayedBoats = (boats ?? []).slice(0, 5);

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
          <div
            key={s.label}
            className="rounded-2xl border bg-card p-5 shadow-soft hover:shadow-lift transition-all duration-300"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium uppercase tracking-widest">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold text-foreground">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Your fleet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {displayedBoats.length} of {fleetCount} boat{fleetCount === 1 ? "" : "s"}{" "}
              listed.
            </p>
          </div>
          {fleetCount > 5 && (
            <Link
              to="/browse"
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              View more in catalog <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="mt-4 divide-y">
          {displayedBoats.map((b) => (
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

// 2. Fleet Management & CSV Import Tab
function FleetTab({ marinaId }: { marinaId: string }) {
  const qc = useQueryClient();
  const { data: boats } = useQuery(boatsQuery(marinaId));
  const [isAdding, setIsAdding] = useState(false);
  const [newBoat, setNewBoat] = useState({
    name: "",
    boat_type: "Pontoon",
    capacity: 8,
    year: new Date().getFullYear(),
    hourly_rate: 85,
    daily_rate: 550,
  });

  // Maintenance Log State
  const [activeBoatIdForLog, setActiveBoatIdForLog] = useState<string | null>(null);
  const [logDesc, setLogDesc] = useState("");
  const { data: maintenanceLogs } = useQuery({
    queryKey: ["maintenance", marinaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*, boats(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // CSV Parsing and import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 2) {
          toast.error("CSV file is empty or missing data rows.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const importedBoats = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const boatObj: any = { marina_id: marinaId, active: true };

          headers.forEach((h, index) => {
            const val = cols[index];
            if (h === "name") boatObj.name = val;
            else if (h === "type" || h === "boat_type") boatObj.boat_type = val;
            else if (h === "capacity") boatObj.capacity = Number(val) || 6;
            else if (h === "year") boatObj.year = Number(val) || 2022;
            else if (h === "hourly_rate") boatObj.hourly_rate = Number(val) || 75;
            else if (h === "daily_rate") boatObj.daily_rate = Number(val) || 500;
          });

          if (boatObj.name) {
            importedBoats.push(boatObj);
          }
        }

        if (importedBoats.length === 0) {
          toast.error("No valid boats found in CSV.");
          return;
        }

        const { error } = await supabase.from("boats").insert(importedBoats);
        if (error) throw error;

        toast.success(`Successfully imported ${importedBoats.length} boats!`);
        qc.invalidateQueries({ queryKey: ["boats", marinaId] });
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const addBoatMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("boats").insert({
        marina_id: marinaId,
        name: newBoat.name,
        boat_type: newBoat.boat_type,
        capacity: newBoat.capacity,
        year: newBoat.year,
        hourly_rate: newBoat.hourly_rate,
        daily_rate: newBoat.daily_rate,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Boat added successfully!");
      setIsAdding(false);
      setNewBoat({
        name: "",
        boat_type: "Pontoon",
        capacity: 8,
        year: new Date().getFullYear(),
        hourly_rate: 85,
        daily_rate: 550,
      });
      qc.invalidateQueries({ queryKey: ["boats", marinaId] });
    },
    onError: (e: any) => {
      toast.error(e.message);
    },
  });

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not logged in");

      const { error } = await supabase.from("maintenance_logs").insert({
        boat_id: activeBoatIdForLog!,
        logged_by: auth.user.id,
        issue_description: logDesc,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Maintenance log created.");
      setLogDesc("");
      setActiveBoatIdForLog(null);
      qc.invalidateQueries({ queryKey: ["maintenance", marinaId] });
    },
    onError: (e: any) => {
      toast.error(e.message);
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Fleet Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, import, and log maintenance for your vessels.
          </p>
        </div>
        <div className="flex gap-2">
          <Label className="flex items-center gap-2 border bg-card hover:bg-secondary cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition shadow-soft">
            <Upload className="h-4 w-4" /> Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </Label>
          <Button onClick={() => setIsAdding(!isAdding)}>
            <Plus className="mr-2 h-4 w-4" /> Add Vessel
          </Button>
        </div>
      </div>

      {isAdding && (
        <div className="border bg-card rounded-2xl p-6 shadow-soft space-y-4 animate-in slide-in-from-top duration-300">
          <h3 className="font-display text-lg font-bold">New Vessel Details</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Boat Name</Label>
              <Input
                placeholder="e.g. Wave Chaser"
                value={newBoat.name}
                onChange={(e) => setNewBoat({ ...newBoat, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Boat Type</Label>
              <Select
                value={newBoat.boat_type}
                onValueChange={(val) => setNewBoat({ ...newBoat, boat_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Pontoon", "Ski", "Fishing", "Wake", "Deck"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Capacity (Guests)</Label>
              <Input
                type="number"
                value={newBoat.capacity}
                onChange={(e) => setNewBoat({ ...newBoat, capacity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={newBoat.year}
                onChange={(e) => setNewBoat({ ...newBoat, year: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hourly Rate ($)</Label>
              <Input
                type="number"
                value={newBoat.hourly_rate}
                onChange={(e) => setNewBoat({ ...newBoat, hourly_rate: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Daily Rate ($)</Label>
              <Input
                type="number"
                value={newBoat.daily_rate}
                onChange={(e) => setNewBoat({ ...newBoat, daily_rate: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button onClick={() => addBoatMutation.mutate()} disabled={!newBoat.name}>
              Save Boat
            </Button>
          </div>
        </div>
      )}

      {/* Fleet List */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card border rounded-2xl p-6 shadow-soft space-y-4">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" /> Listed Fleet
          </h3>
          <div className="divide-y max-h-[400px] overflow-y-auto pr-1">
            {(boats ?? []).map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.boat_type} · {b.capacity} guests · {b.year}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    ${Number(b.hourly_rate).toFixed(0)}/hr
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setActiveBoatIdForLog(b.id)}>
                    Log Action
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Logs */}
        <div className="bg-card border rounded-2xl p-6 shadow-soft space-y-4">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-destructive" /> Maintenance Logs
          </h3>

          {activeBoatIdForLog && (
            <div className="p-4 bg-secondary/30 rounded-xl space-y-3 animate-in fade-in">
              <p className="text-xs font-semibold">
                Log issue for: {(boats ?? []).find((b) => b.id === activeBoatIdForLog)?.name}
              </p>
              <Textarea
                placeholder="Describe issue (e.g. propeller chip, low oil status)..."
                value={logDesc}
                onChange={(e) => setLogDesc(e.target.value)}
                className="text-sm bg-background"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setActiveBoatIdForLog(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => addLogMutation.mutate()} disabled={!logDesc}>
                  Log Issue
                </Button>
              </div>
            </div>
          )}

          <div className="divide-y max-h-[250px] overflow-y-auto pr-1">
            {(maintenanceLogs ?? []).map((log) => (
              <div key={log.id} className="py-3 text-sm">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {log.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 font-medium text-foreground">Boat: {log.boats?.name}</p>
                <p className="text-muted-foreground text-xs">{log.issue_description}</p>
              </div>
            ))}
            {(!maintenanceLogs || maintenanceLogs.length === 0) && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                All systems go. No active logs.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Centralized Reservations Calendar Tab
function CalendarTab({ marinaId }: { marinaId: string }) {
  const qc = useQueryClient();
  const { data: boats } = useQuery(boatsQuery(marinaId));
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedBoatId, setSelectedBoatId] = useState("");
  const [manualBooking, setManualBooking] = useState({
    name: "",
    email: "",
    hours: 2,
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
  });

  // Query Reservations
  const { data: reservations } = useQuery({
    queryKey: ["reservations", marinaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, boats(name)")
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 7 Days Grid
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const createManualBooking = useMutation({
    mutationFn: async () => {
      const start = new Date(`${manualBooking.date}T${manualBooking.time}`);
      const end = new Date(start.getTime() + manualBooking.hours * 60 * 60 * 1000);
      const boat = (boats ?? []).find((b) => b.id === selectedBoatId);
      if (!boat) throw new Error("Please select a boat.");

      const rate = Number(boat.hourly_rate ?? 75);
      const subtotal = rate * manualBooking.hours;

      const { error } = await supabase.from("reservations").insert({
        marina_id: marinaId,
        boat_id: selectedBoatId,
        customer_name: manualBooking.name,
        customer_email: manualBooking.email,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "confirmed",
        subtotal,
        total_price: subtotal + 250, // subtotal + security deposit
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Manual booking confirmed!");
      setShowManualForm(false);
      setManualBooking({
        name: "",
        email: "",
        hours: 2,
        date: new Date().toISOString().split("T")[0],
        time: "10:00",
      });
      qc.invalidateQueries({ queryKey: ["reservations", marinaId] });
    },
    onError: (e: any) => {
      toast.error(e.message);
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Reservations Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage schedules, manual bookings, and conflict buffers.
          </p>
        </div>
        <Button onClick={() => setShowManualForm(!showManualForm)}>
          <Plus className="mr-2 h-4 w-4" /> Manual Booking
        </Button>
      </div>

      {showManualForm && (
        <div className="border bg-card rounded-2xl p-6 shadow-soft space-y-4 animate-in slide-in-from-top duration-300">
          <h3 className="font-display text-lg font-bold">Block Schedule / Manual Reservation</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Select Vessel</Label>
              <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose boat" />
                </SelectTrigger>
                <SelectContent>
                  {(boats ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Customer Name</Label>
              <Input
                placeholder="e.g. Maintenance block or Customer"
                value={manualBooking.name}
                onChange={(e) => setManualBooking({ ...manualBooking, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Customer Email</Label>
              <Input
                type="email"
                placeholder="e.g. staff@marina.com"
                value={manualBooking.email}
                onChange={(e) => setManualBooking({ ...manualBooking, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={manualBooking.date}
                onChange={(e) => setManualBooking({ ...manualBooking, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={manualBooking.time}
                onChange={(e) => setManualBooking({ ...manualBooking, time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (Hours)</Label>
              <Input
                type="number"
                value={manualBooking.hours}
                onChange={(e) =>
                  setManualBooking({ ...manualBooking, hours: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowManualForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createManualBooking.mutate()}
              disabled={!selectedBoatId || !manualBooking.name}
            >
              Book Slot
            </Button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-card border rounded-3xl overflow-hidden shadow-soft">
        <div className="grid grid-cols-[150px_1fr] border-b bg-secondary/20">
          <div className="p-4 font-semibold text-xs uppercase tracking-widest text-muted-foreground border-r">
            Vessels
          </div>
          <div className="grid grid-cols-7 text-center divide-x">
            {days.map((d) => (
              <div key={d.toISOString()} className="p-3 text-xs">
                <p className="font-bold text-foreground">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="divide-y">
          {(boats ?? []).map((b) => {
            return (
              <div key={b.id} className="grid grid-cols-[150px_1fr]">
                <div className="p-4 border-r bg-secondary/10 flex flex-col justify-center">
                  <p className="font-semibold text-sm">{b.name}</p>
                  <span className="text-[10px] text-muted-foreground">{b.boat_type}</span>
                </div>
                <div className="grid grid-cols-7 divide-x h-24 relative bg-background">
                  {days.map((day) => {
                    const dayStart = new Date(day);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(day);
                    dayEnd.setHours(23, 59, 59, 999);

                    // Find reservations on this day for this boat
                    const dayReservations = (reservations ?? []).filter((r) => {
                      const rStart = new Date(r.start_time);
                      return r.boat_id === b.id && rStart >= dayStart && rStart <= dayEnd;
                    });

                    return (
                      <div
                        key={day.toISOString()}
                        className="p-1 relative flex flex-col gap-1 overflow-y-auto"
                      >
                        {dayReservations.map((res) => {
                          const timeStr = new Date(res.start_time).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          });
                          return (
                            <div
                              key={res.id}
                              className="bg-primary/10 border border-primary/20 rounded-md p-1 text-[10px] text-primary leading-tight"
                            >
                              <p className="font-bold truncate">{res.customer_name}</p>
                              <p>{timeStr}</p>
                              <p className="text-[8px] text-muted-foreground font-medium">
                                +30m turnaround buffer
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 4. Checking & Scanning Tab (Waivers + Fuel checks)
function ScanTab({ marinaId }: { marinaId: string }) {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResId, setSelectedResId] = useState<string | null>(null);

  // Check In/Out Form States
  const [fuelOut, setFuelOut] = useState("100%");
  const [fuelIn, setFuelIn] = useState("100%");
  const [condition, setCondition] = useState("");

  const { data: reservations } = useQuery({
    queryKey: ["reservations", marinaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, boats(*)")
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedRes = (reservations ?? []).find((r) => r.id === selectedResId);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("reservations")
        .update({
          check_in_time: new Date().toISOString(),
          fuel_level_out: fuelOut,
          condition_notes: condition,
          status: "confirmed",
        })
        .eq("id", selectedResId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Boat Checked-Out (Dispatched) successfully!");
      qc.invalidateQueries({ queryKey: ["reservations", marinaId] });
    },
    onError: (e: any) => {
      toast.error(e.message);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("reservations")
        .update({
          check_out_time: new Date().toISOString(),
          fuel_level_in: fuelIn,
          status: "completed",
        })
        .eq("id", selectedResId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Boat Check-In (Returned) successfully!");
      qc.invalidateQueries({ queryKey: ["reservations", marinaId] });
    },
    onError: (e: any) => {
      toast.error(e.message);
    },
  });

  const filtered = (reservations ?? []).filter(
    (r) =>
      r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Check-In / Out Scanning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage passenger waivers, scanning tags, fuel checklists.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by reservation ID, customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="border bg-card rounded-2xl overflow-hidden divide-y max-h-[400px] overflow-y-auto shadow-soft">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedResId(r.id)}
                className={`w-full text-left p-4 hover:bg-secondary/40 transition flex justify-between items-center ${selectedResId === r.id ? "bg-secondary/60" : ""}`}
              >
                <div>
                  <p className="font-semibold">{r.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Vessel: {r.boats?.name} · Status: {r.status}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${r.waiver_signed ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}
                  >
                    {r.waiver_signed ? "Waiver Signed" : "No Waiver"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Console */}
        <div className="bg-card border rounded-2xl p-6 shadow-soft space-y-6">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Dispatch Console
          </h3>

          {selectedRes ? (
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-base">{selectedRes.customer_name}</p>
                <p className="text-xs text-muted-foreground">ID: {selectedRes.id}</p>
                <p className="text-xs text-muted-foreground">Email: {selectedRes.customer_email}</p>
                <p className="text-xs text-muted-foreground">Vessel: {selectedRes.boats?.name}</p>
              </div>

              {/* Digital Waiver Check */}
              <div className="border rounded-xl p-3 bg-secondary/10 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs">Liability Waiver</p>
                  <p className="text-[10px] text-muted-foreground">Required for boarding</p>
                </div>
                {selectedRes.waiver_signed ? (
                  <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" /> Signed
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-yellow-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Unsigned
                    </span>
                    <a
                      href={`/waiver/${selectedRes.id}`}
                      target="_blank"
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Open signing page
                    </a>
                  </div>
                )}
              </div>

              {/* Check In Action: Marina Staff checkout boat to client */}
              {!selectedRes.check_in_time ? (
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-bold text-xs">Dispatch Checklist (Boat Out)</h4>
                  <div className="space-y-1">
                    <Label>Fuel Level Out</Label>
                    <Select value={fuelOut} onValueChange={setFuelOut}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["100%", "75%", "50%", "25%"].map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Condition / Fuel Notes</Label>
                    <Input
                      placeholder="e.g. Scuffs on hull starboard side"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => checkInMutation.mutate()}
                    disabled={!selectedRes.waiver_signed}
                  >
                    Dispatch Vessel
                  </Button>
                  {!selectedRes.waiver_signed && (
                    <p className="text-[10px] text-center text-destructive">
                      Waiver must be signed before dispatching.
                    </p>
                  )}
                </div>
              ) : !selectedRes.check_out_time ? (
                /* Check Out Action: Marina Staff checkin boat returned by client */
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-bold text-xs">Return Checklist (Boat In)</h4>
                  <div className="space-y-1">
                    <Label>Fuel Level In</Label>
                    <Select value={fuelIn} onValueChange={setFuelIn}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["100%", "75%", "50%", "25%"].map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-primary" onClick={() => checkOutMutation.mutate()}>
                    Record Return (Complete)
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 text-green-600 font-semibold space-y-1">
                  <CheckCircle2 className="h-8 w-8 mx-auto" />
                  <p>Vessel Rental Completed</p>
                  <p className="text-xs text-muted-foreground font-normal">
                    Fuel Out: {selectedRes.fuel_level_out} · Fuel In: {selectedRes.fuel_level_in}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs text-center py-10">
              Select a reservation to view dispatch checklists.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// 5. Stripe Settings / Connection Tab
function StripeTab({ marina }: { marina: any }) {
  const [onboarding, setOnboarding] = useState(false);

  const startOnboarding = async () => {
    setOnboarding(true);
    try {
      const { url } = await createStripeConnectAccount({
        data: {
          marinaId: marina.id,
          origin: window.location.origin,
        },
      });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message);
      setOnboarding(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold">Stripe Connect Integration</h1>
        <p className="text-sm text-muted-foreground">
          Configure payouts, damage fee holds, and deposits split.
        </p>
      </div>

      <div className="bg-card border rounded-3xl p-6 sm:p-10 shadow-soft text-center space-y-6">
        {marina.stripe_account_id ? (
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Stripe Account Linked</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Connected ID:{" "}
                <strong className="text-foreground">{marina.stripe_account_id}</strong>
              </p>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your marina is fully integrated. Payouts for online bookings are transferred
              automatically minus the 5% platform fee.
            </p>
            <div className="pt-4">
              <Button variant="outline" disabled>
                Stripe Express Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Get Paid Directly</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Connect your existing bank account or debit card using Stripe Connect to accept
                online payments.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full max-w-sm"
              onClick={startOnboarding}
              disabled={onboarding}
            >
              {onboarding ? "Connecting Stripe..." : "Link Stripe Connect"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// 6. Analytics & Reports Tab
function AnalyticsTab({ marinaId }: { marinaId: string }) {
  const { data: boats } = useQuery(boatsQuery(marinaId));
  const { data: reservations } = useQuery({
    queryKey: ["reservations", marinaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, boats(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const completed = (reservations ?? []).filter((r) => r.status === "completed");
  const totalRevenue = completed.reduce((sum, r) => sum + Number(r.subtotal), 0);

  // Compile Reservations as CSV and Trigger Download
  const handleExportCSV = () => {
    if (!reservations || reservations.length === 0) {
      toast.error("No reservations to export.");
      return;
    }
    const headers = [
      "Reservation ID",
      "Customer Name",
      "Customer Email",
      "Vessel",
      "Start Time",
      "End Time",
      "Status",
      "Subtotal Paid",
    ];
    const rows = reservations.map((r) => [
      r.id,
      r.customer_name,
      r.customer_email,
      r.boats?.name || "Unknown",
      r.start_time,
      r.end_time,
      r.status,
      `$${Number(r.subtotal).toFixed(2)}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.map((val) => `"${val}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `marina_bookings_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Export CSV reports and inspect marina metrics.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" /> Export Bookings CSV
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="bg-card border rounded-2xl p-6 shadow-soft space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Realized Revenue
          </p>
          <h2 className="font-display text-4xl font-bold text-foreground">
            $
            {totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <p className="text-xs text-muted-foreground">
            Sum of subtotal for completed boat rentals.
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-soft space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Bookings logged
          </p>
          <h2 className="font-display text-4xl font-bold text-foreground">
            {reservations?.length ?? 0}
          </h2>
          <p className="text-xs text-muted-foreground">
            Includes pending, confirmed, and completed reservations.
          </p>
        </div>
      </div>

      {/* Popular Vessels List */}
      <div className="bg-card border rounded-3xl p-6 shadow-soft space-y-4">
        <h3 className="font-bold text-base">Vessel Performance</h3>
        <div className="divide-y text-sm">
          {(boats ?? []).map((b) => {
            const count = (reservations ?? []).filter((r) => r.boat_id === b.id).length;
            const rev = (reservations ?? [])
              .filter((r) => r.boat_id === b.id && r.status === "completed")
              .reduce((sum, r) => sum + Number(r.subtotal), 0);

            return (
              <div key={b.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.boat_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {count} booking{count === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-green-600">${rev.toFixed(0)} revenue</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 7. Customer Dashboard Component
function CustomerDashboard({ profile }: { profile: any }) {
  const { data: reservations, isLoading } = useQuery({
    queryKey: ["customer-reservations", profile.id],
    queryFn: async () => {
      return await getCustomerReservations({ data: { userId: profile.id, email: profile.email } });
    },
    refetchInterval: 3000,
  });

  // Calculate statistics
  const now = new Date();
  const bookedRes = reservations?.filter((r) => r.status === "confirmed" || r.status === "completed") ?? [];
  const completedRes = reservations?.filter((r) => {
    return r.status === "completed" || (r.status === "confirmed" && new Date(r.end_time) < now);
  }) ?? [];

  const totalHours = completedRes.reduce((sum, r) => {
    const hours = Math.ceil((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60));
    return sum + hours;
  }, 0);
  
  const vesselsChartered = new Set(completedRes.map((r) => r.boat_id)).size;
  
  // Loyalty calculations
  const numBookings = bookedRes.length;
  let loyaltyTier = "Bronze Mariner";
  let tierGradient = "from-amber-600 to-amber-800";
  let nextTier = "Silver Captain";
  let bookingsToNext = 2 - numBookings;
  let progressPct = Math.min((numBookings / 2) * 100, 100);

  if (numBookings >= 2 && numBookings < 4) {
    loyaltyTier = "Silver Captain";
    tierGradient = "from-slate-400 to-slate-600";
    nextTier = "Gold Commander";
    bookingsToNext = 4 - numBookings;
    progressPct = Math.min(((numBookings - 2) / 2) * 100, 100);
  } else if (numBookings >= 4 && numBookings < 6) {
    loyaltyTier = "Gold Commander";
    tierGradient = "from-yellow-500 to-amber-600";
    nextTier = "Diamond Admiral";
    bookingsToNext = 6 - numBookings;
    progressPct = Math.min(((numBookings - 4) / 2) * 100, 100);
  } else if (numBookings >= 6) {
    loyaltyTier = "Diamond Admiral";
    tierGradient = "from-sky-400 via-indigo-500 to-purple-600";
    nextTier = "Elite Flagship Member";
    bookingsToNext = 0;
    progressPct = 100;
  }

  const rewardPoints = numBookings * 250;

  // Filter voyages
  const upcomingVoyages = reservations?.filter((r) => {
    const isFuture = new Date(r.end_time) >= now;
    return (r.status === "confirmed" || r.status === "pending") && isFuture;
  }) ?? [];

  const pastVoyages = reservations?.filter((r) => {
    const isPast = new Date(r.end_time) < now;
    return r.status === "completed" || r.status === "cancelled" || isPast;
  }) ?? [];

  // Determine lake weather for upcoming voyage or default to Lake Murray
  const nextVoyage = upcomingVoyages[upcomingVoyages.length - 1]; // Closest chronological future voyage
  const activeLake = nextVoyage?.boats?.marinas?.lake || "Lake Murray";

  // Query live weather for next destination
  const { data: weather } = useQuery({
    queryKey: ["dashboard-weather", activeLake],
    queryFn: async () => {
      return await getLiveWeather({ data: { lakeName: activeLake } });
    },
    enabled: !!activeLake,
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Header variant="light" />

      {/* Hero Welcome Banner */}
      <div className="bg-[#0B4F6C] text-white overflow-hidden relative border-b shadow-md">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />
        
        <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sky-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Lake Pass Premium Club member
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Welcome aboard, {profile?.full_name || profile?.email?.split("@")[0] || "Valued Captain"}
            </h1>
            <p className="text-sm text-sky-100 max-w-xl">
              Track your upcoming excursions, liability clearances, and charter statistics. 
              Thank you for trusting Lake Pass with your premium water adventures.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link to="/browse" search={{}}>
              <Button size="lg" className="bg-white hover:bg-sky-50 text-[#0B4F6C] font-bold rounded-xl shadow-md hover:shadow-lg transition-all h-12">
                <Anchor className="mr-2 h-4 w-4 text-sky-700" /> Book Next Voyage
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 -mt-8 relative z-20">
        {/* Overview Stats Bar */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Loyalty Rank */}
          <div className="bg-white rounded-2xl p-5 border shadow-soft flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Membership Rank</span>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r shadow-sm",
                tierGradient
              )}>
                <Award className="h-3 w-3" /> {loyaltyTier}
              </span>
              {bookingsToNext > 0 ? (
                <p className="text-[10px] text-muted-foreground pt-1 block">{bookingsToNext} more booking{bookingsToNext > 1 ? "s" : ""} to {nextTier}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground pt-1 block">Maximum tier achieved!</p>
              )}
            </div>
            <div className="h-10 w-10 bg-sky-50 rounded-full flex items-center justify-center text-[#0B4F6C]">
              <Compass className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Hours on Water */}
          <div className="bg-white rounded-2xl p-5 border shadow-soft flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Cruising Time</span>
              <p className="text-2xl font-bold text-slate-800">{totalHours} hrs</p>
              <p className="text-[10px] text-muted-foreground">Log of all completed voyages</p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <Waves className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Vessels Chartered */}
          <div className="bg-white rounded-2xl p-5 border shadow-soft flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Fleet Chartered</span>
              <p className="text-2xl font-bold text-slate-800">{vesselsChartered} Vessel{vesselsChartered === 1 ? "" : "s"}</p>
              <p className="text-[10px] text-muted-foreground">Distinct hulls chartered</p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
              <Ship className="h-5 w-5" />
            </div>
          </div>

          {/* Card 4: Reward Points */}
          <div className="bg-white rounded-2xl p-5 border shadow-soft flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Rewards Points</span>
              <p className="text-2xl font-bold text-slate-800">{rewardPoints.toLocaleString()} pts</p>
              <p className="text-[10px] text-muted-foreground">Redeemable for free upgrades</p>
            </div>
            <div className="h-10 w-10 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Membership Tier Progress */}
        <div className="mt-6 bg-white rounded-2xl border p-5 shadow-soft space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Voyage Loyalty Progress</span>
            <span className="text-muted-foreground font-medium">{progressPct}% toward {nextTier}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-500" 
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Double Column Layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          
          {/* Main Left Column: Bookings & History */}
          <div className="space-y-6">
            
            {/* Upcoming Voyages */}
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                <Anchor className="h-5 w-5 text-sky-700" /> Upcoming Expeditions
              </h2>

              {isLoading ? (
                <div className="bg-white border rounded-2xl p-16 text-center text-sm text-muted-foreground animate-pulse">
                  Retrieving your scheduled voyages...
                </div>
              ) : upcomingVoyages.length === 0 ? (
                <div className="border border-dashed bg-white rounded-3xl p-12 text-center space-y-4">
                  <Ship className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-base">No upcoming voyages scheduled</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Charter a vessel for your family reunion or weekend cruise. Lake Pass makes checkout instant.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link to="/browse" search={{}}>
                      <Button variant="outline" className="rounded-xl">
                        Charter a Yacht / Boat
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5">
                  {upcomingVoyages.map((res) => {
                    const startTime = new Date(res.start_time);
                    const endTime = new Date(res.end_time);
                    const duration = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
                    const boat = res.boats;
                    const photo = boat?.photos?.[0] || getBoatFallbackImage(boat?.boat_type);

                    return (
                      <div 
                        key={res.id} 
                        className="bg-white border rounded-3xl overflow-hidden shadow-soft hover:shadow-lift transition-all duration-300 grid sm:grid-cols-[200px_1fr] group"
                      >
                        {/* Boat Image Card */}
                        <Link 
                          to="/boat/$boatId" 
                          params={{ boatId: boat?.id || "" }}
                          search={{ reservationId: res.id, payment_success: "true" }}
                          className="relative aspect-video sm:aspect-auto bg-slate-100 overflow-hidden cursor-pointer"
                        >
                          <img 
                            src={photo} 
                            alt={boat?.name} 
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white">
                            {boat?.boat_type || "Vessel"}
                          </div>
                        </Link>

                        {/* Details */}
                        <div className="p-6 flex flex-col justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <Link to="/boat/$boatId" params={{ boatId: boat?.id || "" }} search={{ reservationId: res.id, payment_success: "true" }}>
                                  <h3 className="font-display text-lg font-bold text-slate-800 group-hover:text-[#0B4F6C] transition-colors cursor-pointer">
                                    {boat?.name || "Vessel Charter"}
                                  </h3>
                                </Link>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium">
                                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                                  {boat?.marinas?.name} &middot; {boat?.marinas?.lake}
                                </p>
                              </div>
                              <span className={cn(
                                "text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full",
                                res.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-yellow-50 text-yellow-700 border border-yellow-100"
                              )}>
                                {res.status}
                              </span>
                            </div>

                            {/* Voyage specs */}
                            <div className="grid gap-3 grid-cols-3 text-xs bg-slate-50/50 rounded-xl p-3 border border-slate-100 mt-2">
                              <div>
                                <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Date & Start</p>
                                <p className="font-bold text-slate-800 mt-0.5">
                                  {startTime.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Start Time</p>
                                <p className="font-bold text-slate-800 mt-0.5">
                                  {startTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Duration</p>
                                <p className="font-bold text-slate-800 mt-0.5">{duration} hour{duration > 1 ? "s" : ""}</p>
                              </div>
                            </div>
                          </div>

                          {/* Waiver Status Action bar */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                            <div className="flex items-center gap-1.5">
                              {res.waiver_signed ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Waiver Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md animate-pulse">
                                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Waiver Required
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {!res.waiver_signed && (
                                <Link to="/waiver/$reservationId" params={{ reservationId: res.id }} target="_blank">
                                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg px-3.5 h-8">
                                    Sign Waiver
                                  </Button>
                                </Link>
                              )}
                              <Link to="/boat/$boatId" params={{ boatId: boat?.id || "" }} search={{ reservationId: res.id, payment_success: "true" }}>
                                <Button size="sm" variant="ghost" className="text-xs text-sky-700 font-bold hover:bg-sky-50 h-8">
                                  Details <ChevronRight className="ml-1 h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Adventures */}
            <div className="space-y-4 pt-4">
              <h2 className="font-display text-xl font-bold text-slate-800 flex items-center gap-2">
                <Compass className="h-5 w-5 text-slate-500" /> Cruising Logbook (History)
              </h2>

              {pastVoyages.length === 0 ? (
                <div className="bg-white border rounded-2xl p-8 text-center text-xs text-muted-foreground">
                  No historical voyages logged yet. Once you complete rentals they will show here.
                </div>
              ) : (
                <div className="bg-white border rounded-3xl overflow-hidden divide-y shadow-soft">
                  {pastVoyages.map((res) => {
                    const boat = res.boats;
                    const startTime = new Date(res.start_time);
                    return (
                      <div key={res.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
                        <Link to="/boat/$boatId" params={{ boatId: boat?.id || "" }} search={{ reservationId: res.id, payment_success: "true" }} className="flex items-center gap-4 cursor-pointer flex-1 min-w-0">
                          <img 
                            src={boat?.photos?.[0] || getBoatFallbackImage(boat?.boat_type)} 
                            alt={boat?.name} 
                            className="h-11 w-11 rounded-xl object-cover border flex-shrink-0"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate hover:text-[#0B4F6C] transition-colors">{boat?.name || "Vessel"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {boat?.marinas?.name} &middot; {startTime.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </Link>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                            res.status === "completed" && "bg-blue-50 text-blue-700",
                            res.status === "cancelled" && "bg-red-50 text-red-700",
                            res.status === "confirmed" && "bg-emerald-50 text-emerald-700"
                          )}>
                            {res.status}
                          </span>
                          <Link to="/boat/$boatId" params={{ boatId: boat?.id || "" }} search={{ reservationId: res.id, payment_success: "true" }}>
                            <Button size="sm" variant="ghost" className="text-xs text-sky-700 font-bold hover:bg-sky-50 h-8">
                              Details
                            </Button>
                          </Link>
                          <Link to="/boat/$boatId" params={{ boatId: boat?.id || "" }}>
                            <Button size="sm" variant="outline" className="rounded-lg text-xs font-bold border-slate-200 h-8">
                              Book Again
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Boarding Pass & Safety Advisory */}
          <div className="space-y-6">
            
            {/* Live Boarding Ticket */}
            {upcomingVoyages.length > 0 && (
              <div className="bg-white rounded-3xl border shadow-lift overflow-hidden relative">
                {/* Boarding Ticket header */}
                <div className="bg-gradient-to-r from-sky-800 to-[#0B4F6C] text-white px-5 py-4 text-center relative">
                  <div className="absolute top-3 left-3 bg-white/10 px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                    PRIORITY CHARTER
                  </div>
                  <h3 className="font-display font-bold text-base mt-2">Boarding Pass</h3>
                  <p className="text-[10px] text-sky-200 uppercase font-medium tracking-widest mt-0.5">Lake Pass Dispatch Ticket</p>
                </div>
                
                {/* Boarding ticket details */}
                <div className="p-5 space-y-4 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground font-semibold">Charter Member</span>
                    <span className="font-bold text-slate-800">{profile.full_name || "MEMBER"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground font-semibold">Vessel Charter</span>
                    <span className="font-bold text-slate-800">{nextVoyage?.boats?.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground font-semibold">Scheduled Date</span>
                    <span className="font-bold text-slate-800">
                      {new Date(nextVoyage?.start_time).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground font-semibold">Departure Time</span>
                    <span className="font-bold text-slate-800">
                      {new Date(nextVoyage?.start_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-center pt-2">
                    {nextVoyage?.waiver_signed ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle className="h-4 w-4" /> Ready for Boarding
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl font-bold flex flex-col items-center gap-1">
                        <span className="flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> Clearance Required</span>
                        <span className="text-[10px] font-normal text-rose-600/90">Digital waiver must be signed before boarding.</span>
                      </div>
                    )}
                  </div>

                  {/* Mock Barcode */}
                  <div className="pt-3 border-t flex flex-col items-center gap-1.5 opacity-90">
                    <div className="h-10 w-full bg-slate-900 border rounded flex items-center justify-around overflow-hidden px-3">
                      {Array.from({ length: 42 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="h-full bg-white transition-all"
                          style={{
                            width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px`,
                            opacity: i % 7 === 0 ? 0.3 : 1
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-mono">
                      LP-{nextVoyage?.id?.substring(0, 8).toUpperCase() || "TICKET"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Live Weather Advisory for upcoming lake */}
            {weather && (
              <div className="bg-white rounded-3xl border shadow-soft p-5 space-y-3.5">
                <h3 className="font-display font-bold text-sm text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Waves className="h-4 w-4 text-sky-700" /> Lake Status</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-sky-50 border text-sky-700 rounded-lg">{activeLake}</span>
                </h3>

                <div className="flex items-center justify-between border-y py-3">
                  <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-yellow-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground font-semibold">Conditions</span>
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{weather.temp}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Water Safety Warning</p>
                  <p className="text-xs text-slate-600 leading-normal font-medium">{weather.alert}</p>
                </div>
              </div>
            )}

            {/* Pre-Flight Checklist */}
            <div className="bg-white rounded-3xl border shadow-soft p-5 space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-sky-700" /> Pre-Cruise Safety Checklist
              </h3>
              
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className={cn("h-4 w-4 mt-0.5 shrink-0", upcomingVoyages.length > 0 ? "text-emerald-500" : "text-slate-300")} />
                  <div>
                    <p className="font-bold text-slate-800">Secure Reservation</p>
                    <p className="text-[10px] text-muted-foreground">Confirm booking date & select vessel.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    upcomingVoyages.length === 0 ? "text-slate-300" : nextVoyage?.waiver_signed ? "text-emerald-500" : "text-amber-500 animate-pulse"
                  )} />
                  <div>
                    <p className="font-bold text-slate-800">Waiver Endorsement</p>
                    <p className="text-[10px] text-muted-foreground">Every passenger must endorse the digital release form.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="text-emerald-500 h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Official Captain Identification</p>
                    <p className="text-[10px] text-muted-foreground">Bring a government-issued photo ID (driving license or boat certificate).</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="text-slate-300 h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">Marina Briefing & Check-in</p>
                    <p className="text-[10px] text-muted-foreground">Arrive at least 15 minutes before departure slot for the hull review.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* MNC Corporate Concierge */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-soft space-y-3 relative overflow-hidden">
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
              <h4 className="font-display font-bold text-sm text-sky-400 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> Priority Concierge
              </h4>
              <p className="text-[11px] text-slate-300 leading-normal">
                Elite Flagship tier status yields direct phone access to priority harbor master service lines.
              </p>
              <div className="pt-2 divide-y divide-slate-700/50 text-xs">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Admiral Support</span>
                  <span className="font-semibold text-sky-200">+1 (800) 525-PASS</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Support Email</span>
                  <span className="font-semibold text-slate-200 font-mono">elite@lakepass.com</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
