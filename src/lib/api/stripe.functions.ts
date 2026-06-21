import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendBookingConfirmation, sendSMSReminder } from "./communications.server";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" as any }) : null;

export const createStripeConnectAccount = createServerFn({ method: "POST" })
  .inputValidator(z.object({ marinaId: z.string().uuid(), origin: z.string() }))
  .handler(async ({ data }) => {
    try {
      if (!stripe) {
        console.warn("Stripe Secret Key missing! Simulating Stripe Connect onboarding.");
        const mockAcctId = `acct_mock_${Math.random().toString(36).substring(7)}`;
        return {
          accountId: mockAcctId,
          url: `${data.origin}/dashboard?stripe_success=true&marinaId=${data.marinaId}&accountId=${mockAcctId}`,
        };
      }

      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${data.origin}/dashboard?stripe_refresh=true&marinaId=${data.marinaId}`,
        return_url: `${data.origin}/dashboard?stripe_success=true&marinaId=${data.marinaId}&accountId=${account.id}`,
        type: "account_onboarding",
      });

      return {
        accountId: account.id,
        url: accountLink.url,
      };
    } catch (error: any) {
      throw new Error(`Failed to create Stripe Connect account: ${error.message}`);
    }
  });

export const confirmStripeConnect = createServerFn({ method: "POST" })
  .inputValidator(z.object({ marinaId: z.string().uuid(), accountId: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin
        .from("marinas")
        .update({ stripe_account_id: data.accountId })
        .eq("id", data.marinaId);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      throw new Error(`Failed to confirm Stripe Connect: ${e.message}`);
    }
  });

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      marinaId: z.string().uuid(),
      boatId: z.string().uuid(),
      userId: z.string().uuid().optional(),
      customerName: z.string().min(1),
      customerEmail: z.string().email(),
      customerPhone: z.string().optional(),
      startTime: z.string(),
      endTime: z.string(),
      hourlyRate: z.number().positive(),
      hours: z.number().positive(),
      origin: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      // 1. Calculate prices
      const subtotal = data.hourlyRate * data.hours;
      const securityDeposit = 250.0; // Flat security deposit
      const totalPrice = subtotal + securityDeposit;

      // 2. Fetch marina profile to get connected Stripe ID
      const { data: marina, error: mErr } = await supabaseAdmin
        .from("marinas")
        .select("stripe_account_id, name")
        .eq("id", data.marinaId)
        .single();
      if (mErr) throw mErr;

      // 3. Create a pending reservation first
      const { data: reservation, error: rErr } = await supabaseAdmin
        .from("reservations")
        .insert({
          marina_id: data.marinaId,
          boat_id: data.boatId,
          user_id: data.userId || null,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone || null,
          start_time: data.startTime,
          end_time: data.endTime,
          status: "pending",
          subtotal,
          security_deposit: securityDeposit,
          total_price: totalPrice,
        })
        .select("id")
        .single();
      if (rErr) throw rErr;

      if (!stripe) {
        console.warn("Stripe Secret Key missing! Simulating payment redirect.");
        return {
          checkoutUrl: `${data.origin}/boat/${data.boatId}?payment_success=true&reservationId=${reservation.id}`,
        };
      }

      // Check if the marina has a valid connected Stripe account (not mock)
      const hasRealConnect =
        marina?.stripe_account_id &&
        !marina.stripe_account_id.startsWith("acct_mock_");

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        customer_email: data.customerEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Boat Rental: ${data.hours} hours`,
                description: `Rental at ${marina?.name || "Marina"}. Includes $${securityDeposit} refundable security deposit.`,
              },
              unit_amount: Math.round(totalPrice * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${data.origin}/boat/${data.boatId}?payment_success=true&reservationId=${reservation.id}`,
        cancel_url: `${data.origin}/boat/${data.boatId}?payment_cancelled=true&reservationId=${reservation.id}`,
      };

      if (hasRealConnect) {
        // Construct Stripe Checkout Session with split transfer (destination charge)
        const applicationFeeAmount = Math.round(subtotal * 0.05 * 100);
        sessionParams.payment_intent_data = {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: marina.stripe_account_id!,
          },
        };
      } else {
        console.log(
          "No real Stripe Connect ID. Creating a direct Stripe Checkout session for testing.",
        );
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Update reservation with payment intent or session details
      await supabaseAdmin
        .from("reservations")
        .update({ stripe_payment_intent_id: session.payment_intent as string })
        .eq("id", reservation.id);

      if (!session.url) {
        throw new Error("Failed to generate Stripe checkout session URL.");
      }

      return {
        checkoutUrl: session.url,
      };
    } catch (error: any) {
      throw new Error(`Failed to create Checkout Session: ${error.message}`);
    }
  });

export const confirmReservation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ reservationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      // 1. Update reservation status to confirmed
      const { error: updateErr } = await supabaseAdmin
        .from("reservations")
        .update({ status: "confirmed" })
        .eq("id", data.reservationId);
      if (updateErr) throw updateErr;

      // 2. Fetch reservation details with boat info to send notifications
      const { data: res, error: fetchErr } = await supabaseAdmin
        .from("reservations")
        .select("*, boats(*)")
        .eq("id", data.reservationId)
        .single();

      if (fetchErr) {
        console.error("Failed to fetch reservation details for notifications:", fetchErr);
      } else if (res) {
        // Send email booking confirmation
        try {
          await sendBookingConfirmation({
            data: {
              email: res.customer_email,
              name: res.customer_name,
              boatName: res.boats?.name || "Boat",
              startTime: res.start_time,
              endTime: res.end_time,
              totalPrice: Number(res.total_price),
            },
          });
        } catch (emailErr) {
          console.error("Failed to send email confirmation:", emailErr);
        }

        // Send SMS reminder if phone is provided
        if (res.customer_phone) {
          try {
            await sendSMSReminder({
              data: {
                phone: res.customer_phone,
                name: res.customer_name,
                boatName: res.boats?.name || "Boat",
                startTime: res.start_time,
              },
            });
          } catch (smsErr) {
            console.error("Failed to send SMS reminder:", smsErr);
          }
        }
      }

      return { success: true };
    } catch (e: any) {
      throw new Error(`Failed to confirm reservation: ${e.message}`);
    }
  });

export const signWaiver = createServerFn({ method: "POST" })
  .inputValidator(z.object({ reservationId: z.string().uuid(), signatureText: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin
        .from("reservations")
        .update({
          waiver_signed: true,
          waiver_signature_text: data.signatureText,
          waiver_signed_at: new Date().toISOString(),
        })
        .eq("id", data.reservationId);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      throw new Error(`Failed to sign waiver: ${e.message}`);
    }
  });

export const getReservationDetails = createServerFn({ method: "GET" })
  .inputValidator(z.object({ reservationId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const { data: res, error } = await supabaseAdmin
        .from("reservations")
        .select("*, boats(*, marinas(*))")
        .eq("id", data.reservationId)
        .single();
      if (error) throw error;
      return res;
    } catch (e: any) {
      throw new Error(`Failed to fetch reservation details: ${e.message}`);
    }
  });

export const getLiveWeather = createServerFn({ method: "GET" })
  .inputValidator(z.object({ lakeName: z.string().optional() }))
  .handler(async ({ data }) => {
    const lake = data.lakeName || "Lake Murray";
    // Map lake names to approximate coordinates
    const coords: Record<string, { lat: number; lon: number }> = {
      "Lake Murray": { lat: 34.05, lon: -81.36 },
      "Lake Tahoe": { lat: 39.09, lon: -120.04 },
      "Table Rock Lake": { lat: 36.59, lon: -93.31 },
      "Lake of the Ozarks": { lat: 38.2, lon: -92.62 },
    };
    const { lat, lon } = coords[lake] ?? { lat: 34.05, lon: -81.36 };

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`,
      );
      if (!res.ok) throw new Error("Weather service offline");
      const json = await res.json();
      const tempC = json.current.temperature_2m;
      const tempF = Math.round((tempC * 9) / 5 + 32);
      const windMph = Math.round(json.current.wind_speed_10m * 0.621371);
      const code = json.current.weather_code;

      let desc = "Fair Weather";
      if (code === 0) desc = "Clear Sky";
      else if (code >= 1 && code <= 3) desc = "Partly Cloudy";
      else if (code >= 45 && code <= 48) desc = "Foggy";
      else if (code >= 51 && code <= 67) desc = "Rainy";
      else if (code >= 71 && code <= 86) desc = "Snowy";
      else if (code >= 95 && code <= 99) desc = "Stormy";

      const alertText =
        windMph > 15
          ? "Caution: High wind warnings. Rough waters expected on the lake."
          : "Calm water conditions. Perfect day for boating.";

      return {
        temp: `${tempF}°F · ${desc}`,
        alert: `${alertText} Wind: ${windMph} mph.`,
      };
    } catch (err: any) {
      console.error("Failed to fetch real weather on server:", err);
      return {
        temp: "77°F · Sunny & Warm",
        alert: "Calm water conditions. Life jackets required for passengers.",
      };
    }
  });

export const getCustomerReservations = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string().uuid(), email: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { data: res, error } = await supabaseAdmin
        .from("reservations")
        .select("*, boats(*, marinas(*))")
        .or(`user_id.eq.${data.userId},customer_email.eq.${data.email}`)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return res ?? [];
    } catch (e: any) {
      throw new Error(`Failed to fetch customer reservations: ${e.message}`);
    }
  });

export const getUserBoatReservations = createServerFn({ method: "GET" })
  .inputValidator(z.object({ boatId: z.string().uuid(), userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    try {
      const { data: res, error } = await supabaseAdmin
        .from("reservations")
        .select("*, boats(*, marinas(*))")
        .eq("boat_id", data.boatId)
        .eq("user_id", data.userId)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return res ?? [];
    } catch (e: any) {
      throw new Error(`Failed to fetch user boat reservations: ${e.message}`);
    }
  });

export const signUpUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      fullName: z.string().optional(),
      accountType: z.enum(["customer", "marina"]),
    })
  )
  .handler(async ({ data }) => {
    try {
      const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.fullName,
          account_type: data.accountType,
        },
      });
      if (error) throw error;
      return { success: true, user: user.user };
    } catch (e: any) {
      throw new Error(e.message || "Failed to create account");
    }
  });

export const createMarina = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string(),
      address: z.string().nullable(),
      lake: z.string(),
      timezone: z.string(),
      userId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const { data: marina, error } = await supabaseAdmin
        .from("marinas")
        .insert({
          name: data.name,
          address: data.address,
          lake: data.lake,
          timezone: data.timezone,
          created_by: data.userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return marina;
    } catch (e: any) {
      throw new Error(`Failed to create marina: ${e.message}`);
    }
  });

export const updateMarina = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      address: z.string().nullable(),
      lake: z.string(),
      timezone: z.string(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin
        .from("marinas")
        .update({
          name: data.name,
          address: data.address,
          lake: data.lake,
          timezone: data.timezone,
        })
        .eq("id", data.id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      throw new Error(`Failed to update marina: ${e.message}`);
    }
  });

export const importMarinaBoats = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      marinaId: z.string().uuid(),
      boats: z.array(
        z.object({
          name: z.string(),
          boat_type: z.string(),
          capacity: z.number(),
          year: z.number().optional(),
          hourly_rate: z.number().optional(),
          daily_rate: z.number().optional(),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    try {
      const rows = data.boats.map((b) => ({
        marina_id: data.marinaId,
        name: b.name,
        boat_type: b.boat_type,
        capacity: b.capacity,
        year: b.year ?? null,
        hourly_rate: b.hourly_rate ?? null,
        daily_rate: b.daily_rate ?? null,
      }));
      const { error } = await supabaseAdmin.from("boats").insert(rows);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      throw new Error(`Failed to import boats: ${e.message}`);
    }
  });

export const finishMarinaOnboarding = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      primaryColor: z.string(),
      font: z.string(),
      logoUrl: z.string().nullable(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin
        .from("marinas")
        .update({
          widget_primary_color: data.primaryColor,
          widget_font: data.font,
          widget_logo_url: data.logoUrl,
          onboarding_completed: true,
        })
        .eq("id", data.id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      throw new Error(`Failed to finish onboarding: ${e.message}`);
    }
  });


