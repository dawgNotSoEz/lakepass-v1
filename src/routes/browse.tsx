import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Anchor, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { browseBoatsQuery, publicLakesQuery } from "@/lib/public-catalog";
import { BoatCard } from "@/routes/index";

const searchSchema = z.object({
  lake: fallback(z.string().optional(), undefined),
  boatType: fallback(z.string().optional(), undefined),
  guests: fallback(z.number().int().min(1).max(50).optional(), undefined),
  maxPrice: fallback(z.number().min(0).max(10000).optional(), undefined),
});

export const Route = createFileRoute("/browse")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Browse boats — Lake Pass" },
      {
        name: "description",
        content:
          "Search pontoons, ski boats, fishing rigs and more across the marinas on Lake Pass.",
      },
      { property: "og:title", content: "Browse boats — Lake Pass" },
      { property: "og:description", content: "Search pontoons, ski boats, fishing rigs and more." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });
  const { data: lakes } = useQuery(publicLakesQuery());
  const { data: boats, isLoading } = useQuery(browseBoatsQuery(search));

  function update(patch: Partial<typeof search>) {
    navigate({ search: (prev: typeof search) => ({ ...prev, ...patch }) });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Anchor className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Lake Pass</span>
          </Link>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Marina Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-[260px_1fr]">
        <aside className="space-y-6 md:sticky md:top-24 md:self-start">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </div>

          <Filter label="Lake">
            <Select
              value={search.lake ?? "Any"}
              onValueChange={(v) => update({ lake: v === "Any" ? undefined : v })}
            >
              <SelectTrigger>
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
          </Filter>

          <Filter label="Boat type">
            <Select
              value={search.boatType ?? "Any"}
              onValueChange={(v) => update({ boatType: v === "Any" ? undefined : v })}
            >
              <SelectTrigger>
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
          </Filter>

          <Filter label="Minimum guests">
            <Input
              type="number"
              min={1}
              max={20}
              value={search.guests ?? ""}
              onChange={(e) =>
                update({ guests: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="Any"
            />
          </Filter>

          <Filter label="Max price / hour">
            <Input
              type="number"
              min={0}
              value={search.maxPrice ?? ""}
              onChange={(e) =>
                update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="Any"
            />
          </Filter>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate({ search: {} })}
          >
            Reset filters
          </Button>
        </aside>

        <main>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold">Boats for hire</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading
                  ? "Searching…"
                  : `${boats?.length ?? 0} boat${(boats?.length ?? 0) === 1 ? "" : "s"} match your filters`}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {(boats ?? []).map((b) => (
              <BoatCard key={b.id} boat={b} />
            ))}
            {!isLoading && (boats?.length ?? 0) === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">
                No boats match. Try widening your filters.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
