import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Anchor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { myProfileQuery } from "@/lib/marina-queries";
import { cn } from "@/lib/utils";

export function Header({ variant = "light" }: { variant?: "dark" | "light" }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery(myProfileQuery());

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate({ to: "/", replace: true });
  }

  const isDark = variant === "dark";

  return (
    <header
      className={cn(
        "z-20",
        isDark
          ? "absolute inset-x-0 top-0 w-full"
          : "sticky top-0 border-b bg-card/95 backdrop-blur",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between px-6",
          isDark ? "py-5" : "py-4",
        )}
      >
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2",
            isDark ? "text-primary-foreground" : "text-foreground",
          )}
        >
          <Anchor className={cn("h-5 w-5", isDark ? "text-primary-foreground" : "text-primary")} />
          <span className="font-display text-lg font-semibold tracking-tight">Lake Pass</span>
        </Link>

        <nav
          className={cn(
            "hidden items-center gap-8 text-sm md:flex",
            isDark ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          <Link
            to="/browse"
            search={{}}
            className={cn(
              "transition",
              isDark ? "hover:text-primary-foreground" : "hover:text-foreground",
            )}
          >
            Browse boats
          </Link>
          <Link
            to="/"
            hash="for-marinas"
            className={cn(
              "transition",
              isDark ? "hover:text-primary-foreground" : "hover:text-foreground",
            )}
          >
            For marinas
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {!isLoading && profile ? (
            <>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  isDark ? "text-primary-foreground/90" : "text-muted-foreground",
                )}
              >
                Hello, {profile.full_name || profile.email}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "transition",
                  isDark
                    ? "text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                    : "text-foreground hover:bg-accent/60",
                )}
                onClick={handleSignOut}
              >
                Sign out
              </Button>
              {profile.account_type === "marina" ? (
                <Link to="/dashboard">
                  <Button size="sm" variant={isDark ? "secondary" : "default"}>
                    Marina Dashboard
                  </Button>
                </Link>
              ) : profile.account_type === "customer" ? (
                <Link to="/dashboard">
                  <Button size="sm" variant={isDark ? "secondary" : "default"}>
                    My Dashboard
                  </Button>
                </Link>
              ) : null}
            </>
          ) : (
            <>
              {!isLoading && (
                <Link
                  to="/auth"
                  search={{}}
                  className={cn(
                    "hidden text-sm transition sm:inline",
                    isDark
                      ? "text-primary-foreground/90 hover:text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Sign in
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
