import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sgMail from "@sendgrid/mail";
import twilio from "twilio";

const sendGridKey = process.env.SENDGRID_API_KEY;
const sendGridSender = process.env.SENDGRID_SENDER || "noreply@lakepass.com";
if (sendGridKey) {
  sgMail.setApiKey(sendGridKey);
}

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "+15005550006";
const twilioClient = twilioSid && twilioAuthToken ? twilio(twilioSid, twilioAuthToken) : null;

export const sendBookingConfirmation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      name: z.string(),
      boatName: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      totalPrice: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const msg = {
        to: data.email,
        from: sendGridSender,
        subject: "Your Boat Booking is Confirmed! — Lake Pass",
        text: `Hi ${data.name},\n\nYour booking for ${data.boatName} is confirmed!\nStart: ${data.startTime}\nEnd: ${data.endTime}\nTotal: $${data.totalPrice}\n\nSee you on the water!`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #0B4F6C; margin-top: 0;">Booking Confirmed!</h2>
            <p>Hi <strong>${data.name}</strong>,</p>
            <p>Your reservation for <strong>${data.boatName}</strong> has been successfully booked.</p>
            <div style="background-color: #f7f7f7; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Start Time:</strong> ${new Date(data.startTime).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>End Time:</strong> ${new Date(data.endTime).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Total Paid:</strong> $${data.totalPrice.toFixed(2)}</p>
            </div>
            <p>Enjoy your day on the water!</p>
            <p>— The Lake Pass Team</p>
          </div>
        `,
      };

      if (!sendGridKey) {
        console.warn(
          "SendGrid API key missing! Simulated booking confirmation email logged below:",
        );
        console.log(JSON.stringify(msg, null, 2));
        return { success: true, mode: "simulated" };
      }

      await sgMail.send(msg);
      return { success: true, mode: "live" };
    } catch (e: any) {
      console.error("Failed to send SendGrid email:", e);
      throw new Error(`Email sending failed: ${e.message}`);
    }
  });

export const sendSMSReminder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      phone: z.string(),
      name: z.string(),
      boatName: z.string(),
      startTime: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const body = `Hi ${data.name}, this is a reminder from Lake Pass that your rental of ${data.boatName} starts on ${new Date(data.startTime).toLocaleString()}. Please remember to sign your digital waiver before arriving!`;

      if (!twilioClient) {
        console.warn("Twilio credentials missing! Simulated SMS reminder logged below:");
        console.log(`To: ${data.phone}\nBody: ${body}`);
        return { success: true, mode: "simulated" };
      }

      await twilioClient.messages.create({
        body,
        from: twilioPhone,
        to: data.phone,
      });
      return { success: true, mode: "live" };
    } catch (e: any) {
      console.error("Failed to send Twilio SMS:", e);
      throw new Error(`SMS sending failed: ${e.message}`);
    }
  });
