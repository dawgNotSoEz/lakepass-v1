import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { MapPin, Users, Calendar, Sailboat, Check, Sun, Clock, ChevronRight, ShieldAlert, CheckCircle, Waves, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { boatDetailQuery } from "@/lib/public-catalog";
import { myProfileQuery } from "@/lib/marina-queries";
import { Header } from "@/components/header";
import { supabase } from "@/integrations/supabase/client";
import {
  createCheckoutSession,
  confirmReservation,
  getReservationDetails,
  getLiveWeather,
  getUserBoatReservations,
} from "@/lib/api/stripe.functions";
import { getBoatFallbackImage } from "@/routes/index";

const searchSchema = z.object({
  payment_success: fallback(z.string().optional(), undefined),
  payment_cancelled: fallback(z.string().optional(), undefined),
  reservationId: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/boat/$boatId")({
  validateSearch: zodValidator(searchSchema),
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(boatDetailQuery(params.boatId));
    if (!data) throw notFound();
    return { boat: data };
  },
  head: ({ loaderData }) => {
    const b = loaderData?.boat;
    const title = b ? `${b.name} — ${b.marinas?.name ?? "Lake Pass"}` : "Boat — Lake Pass";
    const desc = b
      ? `Book ${b.name}, a ${b.boat_type.toLowerCase()} for up to ${b.capacity} on ${b.marinas?.lake ?? "the lake"}.`
      : "Book a boat on Lake Pass.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(b?.photos?.[0] ? [{ property: "og:image" as const, content: b.photos[0] }] : []),
      ],
    };
  },
  component: BoatDetail,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-16 text-center">
      <h1 className="font-display text-3xl font-semibold">Boat not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have been removed or is no longer available.
      </p>
      <Link to="/browse" search={{}} className="mt-6 inline-block">
        <Button>Browse boats</Button>
      </Link>
    </div>
  ),
});

function BoatDetail() {
  const { boatId } = Route.useParams();
  const search = Route.useSearch() as any;
  const navigate = useNavigate();
  const { data: boat } = useSuspenseQuery(boatDetailQuery(boatId));
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirmationProcessed, setConfirmationProcessed] = useState(false);

  // Reservation Form State
  const [resForm, setResForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
    hours: 4,
  });

  const qc = useQueryClient();
  const { data: profile } = useQuery(myProfileQuery());
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Pre-fill name, email, phone from user profile
  useEffect(() => {
    if (profile) {
      setResForm((prev) => ({
        ...prev,
        name: profile.full_name || prev.name,
        email: profile.email || prev.email,
        phone: (profile as any).phone || prev.phone || "",
      }));
    }
  }, [profile]);

  // Fetch current user's reservations for this specific boat
  const { data: userReservations } = useQuery({
    queryKey: ["user-boat-reservations", boatId, profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      return await getUserBoatReservations({ data: { boatId, userId: profile!.id } });
    },
    refetchInterval: 3000,
  });

  // Query Weather info for the lake using real Open-Meteo API via server function
  const { data: weather } = useQuery({
    queryKey: ["weather", boat?.marinas?.lake],
    enabled: !!boat,
    queryFn: async () => {
      return await getLiveWeather({ data: { lakeName: boat?.marinas?.lake || undefined } });
    },
  });

  // Query details of recent reservation for success page via server function (bypasses RLS)
  const { data: recentRes, isLoading: isLoadingRecentRes } = useQuery({
    queryKey: ["recent-reservation", search.reservationId],
    enabled: !!search.reservationId && !!search.payment_success,
    queryFn: async () => {
      return await getReservationDetails({ data: { reservationId: search.reservationId! } });
    },
  });

  // Handle Stripe callback URL parameters
  useEffect(() => {
    if (search.payment_success && search.reservationId && !confirmationProcessed) {
      setConfirmationProcessed(true);
      toast.promise(
        confirmReservation({ data: { reservationId: search.reservationId } }),
        {
          loading: "Confirming payment details...",
          success: "Payment confirmed! Check your email for booking details.",
          error:
            "Could not finalize booking reservation. Please check your SUPABASE_SERVICE_ROLE_KEY.",
        },
      );
    }
  }, [search, confirmationProcessed]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!boat) return;
      setCheckingOut(true);
      const { data: auth } = await supabase.auth.getUser();
      const start = new Date(`${resForm.date}T${resForm.time}`);
      const end = new Date(start.getTime() + resForm.hours * 60 * 60 * 1000);

      const session = await createCheckoutSession({
        data: {
          marinaId: boat.marina_id,
          boatId: boat.id,
          userId: auth.user?.id || undefined,
          customerName: resForm.name,
          customerEmail: resForm.email,
          customerPhone: resForm.phone || undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          hourlyRate: Number(boat.hourly_rate ?? 75),
          hours: resForm.hours,
          origin: window.location.origin,
        },
      });

      window.location.href = session.checkoutUrl;
    },
    onError: (e: any) => {
      toast.error(e.message);
      setCheckingOut(false);
    },
  });

  if (!boat) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header variant="light" />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <Link
            to="/browse"
            search={{}}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Browse all boats
          </Link>
        </div>

        <Gallery photos={boat.photos} name={boat.name} type={boat.boat_type} />

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              {boat.boat_type}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold">{boat.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {boat.marinas?.name}
              {boat.marinas?.lake ? ` · ${boat.marinas.lake}` : ""}
            </p>

            <div className="mt-8 flex flex-wrap gap-6 border-y py-6 text-sm">
              <Stat icon={Users} label="Capacity" value={`${boat.capacity} guests`} />
              {boat.year && <Stat icon={Calendar} label="Year" value={String(boat.year)} />}
              <Stat icon={Sailboat} label="Type" value={boat.boat_type} />
            </div>

            {boat.description && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">About this boat</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {boat.description}
                </p>
              </section>
            )}

            {boat.amenities?.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">What's included</h2>
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {boat.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Embedded Google Map */}
            <section className="mt-8 bg-card border rounded-2xl p-6 shadow-soft space-y-4">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Location & Directions
              </h2>
              <p className="text-sm text-muted-foreground">
                Marina: <strong>{boat.marinas?.name}</strong> at{" "}
                <strong>{boat.marinas?.address}</strong>
              </p>
              <div className="rounded-xl overflow-hidden h-48 border bg-secondary/15">
                <iframe
                  title="Marina Location Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(boat.marinas?.address || boat.marinas?.name || "")}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start space-y-4">
            {/* Live Weather Badge */}
            {weather && (
              <div className="border bg-card p-4 rounded-2xl shadow-soft space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sun className="h-4 w-4 text-yellow-500 animate-pulse" /> Lake Weather Status
                  </span>
                  <span className="font-bold text-foreground">{weather.temp}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  {weather.alert}
                </p>
              </div>
            )}

            {!profile ? (
              <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-4 text-center animate-in fade-in duration-300">
                <div className="flex items-baseline gap-2 justify-center">
                  {boat.hourly_rate != null ? (
                    <>
                      <span className="font-display text-3xl font-semibold">
                        ${Number(boat.hourly_rate).toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">/ hour</span>
                    </>
                  ) : (
                    <span className="font-display text-2xl font-semibold">Contact marina</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                  Please sign in or create an account to reserve this vessel.
                </p>
                <Link to="/auth" search={{ redirect: `/boat/${boat.id}` }}>
                  <Button className="w-full bg-gradient-to-r from-sky-800 to-[#0B4F6C] hover:from-sky-700 hover:to-[#0B4F6C] text-white">
                    Sign In to Book
                  </Button>
                </Link>
              </div>
            ) : search.payment_success && search.reservationId ? (
              isLoadingRecentRes ? (
                <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-4 flex flex-col items-center justify-center py-12 animate-pulse">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">Retrieving booking details...</p>
                </div>
              ) : recentRes ? (
                <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-5 animate-in fade-in duration-300">
                  <div className="bg-green-50/70 border border-green-200/50 text-green-700 p-5 rounded-2xl text-center space-y-1">
                    <Check className="h-8 w-8 mx-auto bg-green-100 p-1.5 rounded-full text-green-600 shadow-sm" />
                    <p className="font-display font-bold text-lg">Booking Confirmed!</p>
                    <p className="text-xs text-green-600/95 font-medium">Your reservation is secured.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h3 className="font-display text-base font-semibold text-foreground">Rental Details</h3>
                    <div className="divide-y text-xs space-y-2.5">
                      <div className="flex justify-between pt-2">
                        <span className="text-muted-foreground font-medium">Customer:</span>
                        <span className="font-semibold text-foreground">{recentRes.customer_name}</span>
                      </div>
                      <div className="flex justify-between pt-2.5">
                        <span className="text-muted-foreground font-medium">Email:</span>
                        <span className="font-semibold text-foreground">{recentRes.customer_email}</span>
                      </div>
                      <div className="flex justify-between pt-2.5">
                        <span className="text-muted-foreground font-medium">Vessel:</span>
                        <span className="font-semibold text-foreground">{recentRes.boats?.name}</span>
                      </div>
                      <div className="flex justify-between pt-2.5">
                        <span className="text-muted-foreground font-medium">Date & Start:</span>
                        <span className="font-semibold text-foreground">
                          {new Date(recentRes.start_time).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(recentRes.start_time).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2.5">
                        <span className="text-muted-foreground font-medium">Duration:</span>
                        <span className="font-semibold text-foreground">
                          {Math.ceil(
                            (new Date(recentRes.end_time).getTime() -
                              new Date(recentRes.start_time).getTime()) /
                              (1000 * 60 * 60),
                          )}{" "}
                          hours
                        </span>
                      </div>
                      <div className="flex justify-between pt-3 font-bold text-sm border-t text-primary">
                        <span>Total Paid:</span>
                        <span className="font-display text-base">${Number(recentRes.total_price).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Waiver Action */}
                  <div className="border rounded-2xl p-4 bg-secondary/20 flex items-center justify-between text-xs mt-3 shadow-soft">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs">Liability Waiver</p>
                      <p className="text-[10px] text-muted-foreground">Required for boarding</p>
                    </div>
                    {recentRes.waiver_signed ? (
                      <span className="text-green-600 font-bold flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full text-[10px]">
                        <Check className="h-3 w-3" /> Signed
                      </span>
                    ) : (
                      <Link to="/waiver/$reservationId" params={{ reservationId: recentRes.id }} target="_blank">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 rounded-xl text-[10px] font-bold py-1 h-auto"
                        >
                          Sign Digital Waiver
                        </Button>
                      </Link>
                    )}
                  </div>

                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => {
                      setConfirmationProcessed(false);
                      navigate({ search: {} as any });
                    }}
                  >
                    Book Again for Future Date
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
                  <div className="flex items-center justify-center p-4">
                    <span className="text-xs text-muted-foreground">Error loading reservation.</span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setConfirmationProcessed(false);
                      navigate({ search: {} as any });
                    }}
                  >
                    Return to Form
                  </Button>
                </div>
              )
            ) : (
              (() => {
                const now = new Date();
                const activeOrFutureReservations = userReservations?.filter((r) => {
                  return new Date(r.end_time) >= now && r.status !== "cancelled";
                }) ?? [];

                const pastReservations = userReservations?.filter((r) => {
                  return new Date(r.end_time) < now || r.status === "cancelled";
                }) ?? [];

                // If user has bookings and we are not explicitly showing the booking form:
                if (!showBookingForm && (activeOrFutureReservations.length > 0 || pastReservations.length > 0)) {
                  return (
                    <div className="space-y-4">
                      {/* Active / Future Reservations */}
                      {activeOrFutureReservations.length > 0 && (
                        <div className="rounded-2xl border border-sky-100 bg-[#0B4F6C]/5 p-5 shadow-soft space-y-4 animate-in fade-in duration-300">
                          <h3 className="font-display font-bold text-sm text-[#0B4F6C] flex items-center gap-1.5 border-b pb-2">
                            <Waves className="h-4 w-4 text-[#0B4F6C] animate-pulse" /> Active & Upcoming Bookings
                          </h3>
                          
                          <div className="space-y-4 divide-y">
                            {activeOrFutureReservations.map((res, index) => {
                              const startTime = new Date(res.start_time);
                              const isHappeningNow = startTime <= now && new Date(res.end_time) >= now;
                              return (
                                <div key={res.id} className={cn("text-xs space-y-2.5", index > 0 && "pt-3.5")}>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-semibold">Scheduled Date</span>
                                    <span className="font-bold text-slate-800">
                                      {startTime.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-semibold">Departure Time</span>
                                    <span className="font-bold text-slate-800">
                                      {startTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-semibold">Duration</span>
                                    <span className="font-bold text-slate-800">
                                      {Math.ceil((new Date(res.end_time).getTime() - startTime.getTime()) / (1000 * 60 * 60))} hours
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-semibold">Total Price</span>
                                    <span className="font-bold text-slate-800">${Number(res.total_price).toFixed(2)}</span>
                                  </div>
                                  
                                  {/* Waiver Check */}
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-muted-foreground font-semibold">Waiver Status</span>
                                    {res.waiver_signed ? (
                                      <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                                        <CheckCircle className="h-3 w-3" /> Signed
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                                          <ShieldAlert className="h-3 w-3" /> Required
                                        </span>
                                        <Link to="/waiver/$reservationId" params={{ reservationId: res.id }} target="_blank">
                                          <Button size="sm" variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50 text-[9px] py-0 px-2 h-6 font-bold rounded-lg">
                                            Sign
                                          </Button>
                                        </Link>
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2">
                                    {isHappeningNow ? (
                                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2 rounded-xl text-center font-bold">
                                        Active Voyage Now
                                      </div>
                                    ) : (
                                      <div className="bg-sky-50 border border-sky-200 text-sky-700 p-2 rounded-xl text-center font-bold">
                                        Upcoming Voyage
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <Button
                            className="w-full mt-2 bg-gradient-to-r from-sky-800 to-[#0B4F6C] hover:from-sky-700 hover:to-[#0B4F6C] text-white"
                            onClick={() => setShowBookingForm(true)}
                          >
                            Book Another Slot
                          </Button>
                        </div>
                      )}

                      {/* Past Adventures History */}
                      {pastReservations.length > 0 && (
                        <div className="rounded-2xl border bg-card p-5 shadow-soft space-y-3.5 animate-in fade-in duration-300">
                          <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5 border-b pb-2">
                            <Clock className="h-4 w-4 text-slate-500" /> Past Adventures
                          </h3>
                          
                          <div className="space-y-3.5 max-h-[200px] overflow-y-auto pr-1">
                            {pastReservations.map((res) => {
                              const startTime = new Date(res.start_time);
                              return (
                                <div key={res.id} className="flex justify-between items-center text-xs">
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-slate-700">
                                      {startTime.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                      {Math.ceil((new Date(res.end_time).getTime() - startTime.getTime()) / (1000 * 60 * 60))} hrs &middot; ${Number(res.total_price).toFixed(2)}
                                    </p>
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                    res.status === "completed" && "bg-blue-50 text-blue-700",
                                    res.status === "cancelled" && "bg-red-50 text-red-700"
                                  )}>
                                    {res.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {activeOrFutureReservations.length === 0 && (
                            <Button
                              className="w-full mt-1 bg-gradient-to-r from-sky-800 to-[#0B4F6C] hover:from-sky-700 hover:to-[#0B4F6C] text-white"
                              onClick={() => setShowBookingForm(true)}
                            >
                              Book Again
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                // If user has no bookings, or showBookingForm is true:
                return (
                  <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-4 animate-in fade-in duration-300">
                    {/* Back Button to show bookings if applicable */}
                    {userReservations && userReservations.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs -mt-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/30 h-7 px-2"
                        onClick={() => setShowBookingForm(false)}
                      >
                        ← Back to My Bookings
                      </Button>
                    )}

                    <div className="flex items-baseline gap-2">
                      {boat.hourly_rate != null ? (
                        <>
                          <span className="font-display text-3xl font-semibold">
                            ${Number(boat.hourly_rate).toFixed(0)}
                          </span>
                          <span className="text-sm text-muted-foreground">/ hour</span>
                        </>
                      ) : (
                        <span className="font-display text-2xl font-semibold">Contact marina</span>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t">
                      <div className="space-y-1">
                        <Label htmlFor="res-name">Name</Label>
                        <Input
                          id="res-name"
                          placeholder="Your Name"
                          value={resForm.name}
                          onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="res-email">Email</Label>
                        <Input
                          id="res-email"
                          type="email"
                          placeholder="you@email.com"
                          value={resForm.email}
                          onChange={(e) => setResForm({ ...resForm, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="res-phone">Phone Number (SMS reminders)</Label>
                        <Input
                          id="res-phone"
                          placeholder="+1 (555) 000-0000"
                          value={resForm.phone}
                          onChange={(e) => setResForm({ ...resForm, phone: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="res-date">Date</Label>
                          <Input
                            id="res-date"
                            type="date"
                            value={resForm.date}
                            onChange={(e) => setResForm({ ...resForm, date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="res-time">Start Time</Label>
                          <Input
                            id="res-time"
                            type="time"
                            value={resForm.time}
                            onChange={(e) => setResForm({ ...resForm, time: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="res-hours">Duration (Hours)</Label>
                        <Input
                          id="res-hours"
                          type="number"
                          min={1}
                          max={24}
                          value={resForm.hours}
                          onChange={(e) => setResForm({ ...resForm, hours: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full mt-2 bg-gradient-to-r from-sky-800 to-[#0B4F6C] hover:from-sky-700 hover:to-[#0B4F6C] text-white"
                      size="lg"
                      onClick={() => checkoutMutation.mutate()}
                      disabled={checkingOut || !resForm.name || !resForm.email}
                    >
                      {checkingOut ? "Redirecting to Payment..." : "Book Now"}
                    </Button>
                    <p className="text-center text-[10px] text-muted-foreground leading-normal flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3 text-primary" /> +30m turnaround buffer included between slots.
                    </p>
                  </div>
                );
              })()
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Gallery({ photos, name, type }: { photos: string[]; name: string; type?: string }) {
  const displayPhotos = photos && photos.length > 0 ? photos : [getBoatFallbackImage(type)];
  const [main, ...rest] = displayPhotos;
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:grid-rows-2 sm:[&>*:first-child]:col-span-2 sm:[&>*:first-child]:row-span-2 animate-in fade-in zoom-in duration-300">
      <img
        src={main}
        alt={name}
        className="aspect-[4/3] h-full w-full rounded-2xl object-cover sm:aspect-auto"
      />
      {rest.slice(0, 4).map((p, i) => (
        <img
          key={i}
          src={p}
          alt={`${name} ${i + 2}`}
          className="aspect-square h-full w-full rounded-2xl object-cover"
        />
      ))}
    </div>
  );
}
