import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Anchor } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { signUpUser } from "@/lib/api/stripe.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({
  redirect: fallback(z.string().optional(), undefined),
});

const ROLE_STORAGE_KEY = "lakepass_account_type";
type AccountType = "customer" | "marina";

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Sign in — Lake Pass" },
      { name: "description", content: "Sign in to your Lake Pass account." },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  full_name: z.string().trim().max(80).optional(),
});

function safeRedirect(value: string | undefined): string {
  if (!value) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

function storedAccountType(): AccountType {
  if (typeof window === "undefined") return "customer";
  return window.localStorage.getItem(ROLE_STORAGE_KEY) === "marina" ? "marina" : "customer";
}

function destinationFor(accountType: AccountType, explicitRedirect: string) {
  if (explicitRedirect && explicitRedirect !== "/auth" && explicitRedirect !== "/welcome")
    return explicitRedirect;
  return accountType === "marina" ? "/dashboard" : "/";
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const target = safeRedirect(redirect);
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountTypeState] = useState<AccountType>(() => storedAccountType());

  function setAccountType(value: AccountType) {
    window.localStorage.setItem(ROLE_STORAGE_KEY, value);
    setAccountTypeState(value);
  }

  const handleNavigationAfterSignIn = useCallback(
    async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userId)
        .maybeSingle();

      const role = profile?.account_type;
      if (!role) {
        navigate({ to: "/welcome", search: { redirect: target || undefined }, replace: true });
        return;
      }
      navigate({ to: destinationFor(role, target), replace: true });
    },
    [navigate, target],
  );

  // If already signed in, check their profile role to redirect them to the correct dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await handleNavigationAfterSignIn(data.session.user.id);
      }
    });
  }, [navigate, target, handleNavigationAfterSignIn]);

  async function handleEmail(mode: "signin" | "signup", form: HTMLFormElement) {
    const data = new FormData(form);
    const parsed = credsSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
      full_name: data.get("full_name") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your inputs");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpUser({
          data: {
            email: parsed.data.email,
            password: parsed.data.password,
            fullName: parsed.data.full_name,
            accountType: accountType,
          },
        });

        // Sign in immediately since it is auto-confirmed on the server
        const { data: loginRes, error: loginErr } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (loginErr) throw loginErr;

        toast.success("Account created and logged in!");
        if (loginRes.user) {
          await handleNavigationAfterSignIn(loginRes.user.id);
        }
      } else {
        const { data: res, error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        if (res.user) await handleNavigationAfterSignIn(res.user.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
        },
      });
      if (error) {
        toast.error("Google sign-in failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-gradient-deep lg:block">
        <div className="absolute inset-0 flex flex-col justify-between p-12 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2">
            <Anchor className="h-5 w-5" />
            <span className="font-display text-lg font-semibold">Lake Pass</span>
          </Link>
          <div className="max-w-md">
            <p className="font-display text-3xl leading-tight">
              "Our team books rentals in seconds instead of juggling four tabs."
            </p>
            <p className="mt-4 text-sm text-primary-foreground/70">
              — Marina operator, Table Rock Lake
            </p>
          </div>
          <p className="text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} Lake Pass
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 text-foreground lg:hidden">
            <Anchor className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Lake Pass</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold">Welcome aboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in or create an account to continue.
          </p>

          <Tabs defaultValue="signin" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEmail("signin", e.currentTarget);
                }}
                className="space-y-4"
              >
                <Field name="email" label="Email" type="email" autoComplete="email" />
                <Field
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEmail("signup", e.currentTarget);
                }}
                className="space-y-4"
              >
                <Field name="full_name" label="Your name" type="text" autoComplete="name" />
                <Field name="email" label="Email" type="email" autoComplete="email" />
                <Field
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                />
                <div className="space-y-1.5">
                  <Label>I'm signing up as</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType("customer")}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${accountType === "customer" ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-secondary"}`}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("marina")}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${accountType === "marina" ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-secondary"}`}
                    >
                      Marina staff
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            <GoogleIcon /> Continue with Google
          </Button>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to Lake Pass's terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type,
  autoComplete,
}: {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={name !== "full_name"}
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
