import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Anchor, Search, MapPin, Users, Sailboat } from "lucide-react";
import heroLake from "@/assets/hero-lake.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { browseBoatsQuery, publicLakesQuery } from "@/lib/public-catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lake Pass — Book your day on the water" },
      {
        name: "description",
        content:
          "Find and reserve boats at your favorite lakes. Pontoons, ski boats, fishing rigs, and more — booked in minutes.",
      },
      { property: "og:title", content: "Lake Pass — Book your day on the water" },
      { property: "og:description", content: "Find and reserve boats at your favorite lakes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <FeaturedBoats />
      <ForMarinas />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <Anchor className="h-5 w-5" />
          <span className="font-display text-lg font-semibold tracking-tight">Lake Pass</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-primary-foreground/85 md:flex">
          <Link to="/browse" search={{}} className="hover:text-primary-foreground">
            Browse boats
          </Link>
          <a href="#for-marinas" className="hover:text-primary-foreground">
            For marinas
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            search={{}}
            className="hidden text-sm text-primary-foreground/90 hover:text-primary-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link to="/dashboard">
            <Button size="sm" variant="secondary">
              Marina Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <img
        src={heroLake}
        alt="Aerial view of a calm lake at golden hour"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-deep/80 via-deep/55 to-deep/85" />
      <div className="mx-auto max-w-7xl px-6 pb-40 pt-36 sm:pb-48 sm:pt-44">
        <div className="max-w-2xl">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] text-primary-foreground sm:text-6xl">
            Find your boat.
            <br /> Lose the dock line.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/85">
            Real-time availability across the best marinas on Table Rock, Lake Murray, and more.
            Pick a lake, pick a boat, push off.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" search={{}}>
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Let's get started
              </Button>
            </Link>
          </div>
        </div>

        <SearchPanel />
      </div>
    </section>
  );
}

function SearchPanel() {
  const navigate = useNavigate();
  const { data: lakes } = useQuery(publicLakesQuery());
  const [lake, setLake] = useState<string>("Any");
  const [boatType, setBoatType] = useState<string>("Any");
  const [guests, setGuests] = useState<string>("");

  function go() {
    navigate({
      to: "/browse",
      search: {
        lake: lake === "Any" ? undefined : lake,
        boatType: boatType === "Any" ? undefined : boatType,
        guests: guests ? Number(guests) : undefined,
      },
    });
  }

  return (
    <div className="mt-10 max-w-4xl rounded-2xl border border-white/10 bg-card/95 p-3 shadow-lift backdrop-blur">
      <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_0.7fr_auto]">
        <Field icon={MapPin} label="Lake">
          <Select value={lake} onValueChange={setLake}>
            <SelectTrigger className="border-0 px-0 shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any lake</SelectItem>
              {(lakes ?? []).map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field icon={Sailboat} label="Boat type">
          <Select value={boatType} onValueChange={setBoatType}>
            <SelectTrigger className="border-0 px-0 shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Any", "Pontoon", "Ski", "Fishing", "Wake", "Deck"].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field icon={Users} label="Guests">
          <Input
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            placeholder="Any"
            className="border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </Field>
        <Button
          size="lg"
          className="h-full bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={go}
        >
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl px-4 py-2 hover:bg-secondary/60">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function FeaturedBoats() {
  const { data: boats } = useQuery(browseBoatsQuery({}));
  const featured = (boats ?? []).slice(0, 3);

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Featured boats
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold">Trending this week</h2>
        </div>
        <Link
          to="/browse"
          search={{}}
          className="hidden text-sm font-medium text-primary hover:underline sm:inline"
        >
          See all boats →
        </Link>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">
            No boats listed yet — check back soon.
          </div>
        )}
        {featured.map((b) => (
          <BoatCard key={b.id} boat={b} />
        ))}
      </div>
    </section>
  );
}

export function BoatCard({ boat }: { boat: import("@/lib/public-catalog").PublicBoatRow }) {
  const photo = boat.photos?.[0];
  return (
    <Link
      to="/boat/$boatId"
      params={{ boatId: boat.id }}
      className="group block overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:shadow-lift"
    >
      <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-secondary to-secondary/40">
        {photo ? (
          <img
            src={photo}
            alt={boat.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Sailboat className="h-12 w-12 opacity-40" />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {boat.boat_type} · {boat.capacity} guests
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold">{boat.name}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {boat.marinas?.name} · {boat.marinas?.lake}
            </p>
          </div>
          {boat.hourly_rate && (
            <div className="text-right">
              <p className="font-display text-lg font-semibold">
                ${Number(boat.hourly_rate).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">/hour</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function ForMarinas() {
  return (
    <section id="for-marinas" className="bg-secondary/50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              For marinas
            </p>
            <h2 className="mt-2 font-display text-4xl font-semibold">
              List your fleet. Fill your calendar.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Real-time bookings, online payments, and one calendar for your whole dock. Setup takes
              about ten minutes.
            </p>
            <Link to="/auth" className="mt-8 inline-block">
              <Button size="lg">List your marina</Button>
            </Link>
          </div>
          <div className="rounded-3xl bg-gradient-deep p-10 text-primary-foreground shadow-lift">
            <p className="font-display text-2xl leading-snug">
              "Our team books rentals in seconds instead of juggling four tabs."
            </p>
            <p className="mt-4 text-sm text-primary-foreground/70">
              — Marina operator, Table Rock Lake
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Anchor className="h-4 w-4" />
          <span className="text-sm">© {new Date().getFullYear()} Lake Pass</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Built for marinas on Table Rock, Lake Murray, and beyond.
        </p>
      </div>
    </footer>
  );
}
