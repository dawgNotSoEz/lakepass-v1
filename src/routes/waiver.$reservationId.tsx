import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { Anchor, Check, PenTool } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signWaiver } from "@/lib/api/stripe.functions";

export const Route = createFileRoute("/waiver/$reservationId")({
  head: () => ({ meta: [{ title: "Sign Waiver — Lake Pass" }] }),
  component: WaiverPage,
});

function WaiverPage() {
  const { reservationId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [signed, setSigned] = useState(false);

  // 1. Fetch reservation info
  const { data: reservation, isLoading } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, boats(*)")
        .eq("id", reservationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 2. Setup Canvas drawing events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0B4F6C";
  }, [isLoading]);

  function getCoordinates(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDrawing(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // 3. Submit signature mutation
  const signWaiverMutation = useMutation({
    mutationFn: async () => {
      if (!typedSignature.trim()) {
        throw new Error("Please type your name to sign the waiver.");
      }
      await signWaiver({
        data: {
          reservationId,
          signatureText: typedSignature.trim(),
        },
      });
    },
    onSuccess: () => {
      setSigned(true);
      toast.success("Waiver signed successfully!");
      qc.invalidateQueries({ queryKey: ["reservation"] });
      qc.invalidateQueries({ queryKey: ["customer-reservations"] });
      qc.invalidateQueries({ queryKey: ["user-boat-reservations"] });
      qc.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (e: any) => {
      toast.error(e.message);
    },
  });

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading waiver...</div>;
  }

  if (!reservation) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Reservation not found</h1>
        <p className="mt-2 text-muted-foreground">This waiver link is invalid or expired.</p>
        <Link to="/" className="mt-6">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 text-foreground py-12 px-6">
      <div className="mx-auto max-w-2xl bg-card border rounded-3xl p-6 sm:p-10 shadow-lift">
        <header className="flex items-center gap-2 mb-8">
          <Anchor className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold">Lake Pass</span>
        </header>

        {signed || reservation.waiver_signed ? (
          <div className="text-center py-10 space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="font-display text-2xl font-bold">Waiver Signed</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you! Your liability waiver has been successfully signed and stored in your
              customer profile.
            </p>
            <p className="text-xs text-muted-foreground">
              Signed as:{" "}
              <strong className="text-foreground">{reservation.waiver_signature_text}</strong> on{" "}
              {new Date(reservation.waiver_signed_at || "").toLocaleString()}
            </p>
            <div className="pt-6">
              <Link to="/boat/$boatId" params={{ boatId: reservation.boat_id }}>
                <Button variant="outline">Back to boat description</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold">
                Rental Agreement & Liability Waiver
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Reservation: <strong>{reservation.boats?.name}</strong> at{" "}
                <strong>{new Date(reservation.start_time).toLocaleDateString()}</strong>
              </p>
            </div>

            <div className="rounded-xl border bg-secondary/10 p-5 h-64 overflow-y-scroll text-xs leading-relaxed text-muted-foreground space-y-4">
              <p className="font-bold text-foreground">
                PLEASE READ THIS DOCUMENT CAREFULLY. BY SIGNING, YOU ARE WAIVING CERTAIN LEGAL
                RIGHTS.
              </p>
              <p>
                1. **Assumption of Risk:** I acknowledge that operating or renting a watercraft
                involves inherent risks, including but not limited to collisions, capsizing,
                drowning, and exposure to environmental hazards. I voluntarily assume all risks
                associated with this rental.
              </p>
              <p>
                2. **Release of Liability:** I hereby release, waive, and hold harmless Lake Pass,
                the renting Marina, its staff, and owners from any and all claims, liabilities, or
                injuries arising from my use of the rental watercraft, except in cases of gross
                negligence.
              </p>
              <p>
                3. **Safe Operation:** I agree to operate the watercraft in compliance with all
                local laws and coast guard regulations. I confirm that I am of legal age, not under
                the influence of drugs or alcohol, and will ensure all passengers wear life jackets.
              </p>
              <p>
                4. **Damage & Deposit:** I acknowledge that a $250.00 security deposit is held and
                may be charged to cover damage, excessive refueling needs, or late returns.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sig-text">Type Full Name to Sign</Label>
                <Input
                  id="sig-text"
                  placeholder="e.g. John Doe"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label>Draw Signature</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCanvas}
                    className="text-muted-foreground hover:text-foreground text-xs py-1 h-auto"
                  >
                    Clear pad
                  </Button>
                </div>
                <div className="border rounded-xl bg-background overflow-hidden h-40 relative">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={160}
                    className="w-full h-full cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <div className="absolute bottom-2 right-3 pointer-events-none text-[10px] text-muted-foreground flex items-center gap-1">
                    <PenTool className="h-3 w-3" /> Draw here
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full mt-6"
                disabled={signWaiverMutation.isPending || !typedSignature.trim()}
                onClick={() => signWaiverMutation.mutate()}
              >
                {signWaiverMutation.isPending ? "Signing Waiver…" : "Sign & Accept Waiver"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
