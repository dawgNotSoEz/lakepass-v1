import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Anchor, MapPin, Users, Calendar, Sailboat, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { boatDetailQuery } from "@/lib/public-catalog";

export const Route = createFileRoute("/boat/$boatId")({
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
  const { data: boat } = useSuspenseQuery(boatDetailQuery(boatId));
  if (!boat) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Lake Pass</span>
          </Link>
          <Link
            to="/browse"
            search={{}}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Browse all boats
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Gallery photos={boat.photos} name={boat.name} />

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

            <section className="mt-10 rounded-2xl border bg-secondary/30 p-6">
              <h2 className="font-display text-lg font-semibold">Real-time availability</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The live booking calendar opens here once your marina's calendar goes live. Reach
                out to {boat.marinas?.name} directly for now.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border bg-card p-6 shadow-soft">
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
              {boat.daily_rate != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  ${Number(boat.daily_rate).toFixed(0)} per day
                </p>
              )}

              <Button className="mt-6 w-full" size="lg" disabled>
                Check availability
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Online booking launches soon — you'll sign in at payment.
              </p>
            </div>
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

function Gallery({ photos, name }: { photos: string[]; name: string }) {
  if (!photos || photos.length === 0) {
    return (
      <div className="flex aspect-[16/7] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-secondary/40 text-muted-foreground">
        <Sailboat className="h-16 w-16 opacity-40" />
      </div>
    );
  }
  const [main, ...rest] = photos;
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:grid-rows-2 sm:[&>*:first-child]:col-span-2 sm:[&>*:first-child]:row-span-2">
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
