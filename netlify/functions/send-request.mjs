/* Career Connect relay.
   Receives a student's request, looks up the chosen ambassador's private
   contact details from environment variables, and delivers the message.

   Pick ONE sender. Set its variables in Netlify > Site configuration > Environment variables.

   Option A, Gmail (no domain needed):
     GMAIL_USER            the Gmail address that sends, e.g. gsucareerconnect@gmail.com
     GMAIL_APP_PASSWORD    a 16-character App Password from that Google account

   Option B, Resend (needs a domain you can add DNS records to):
     RESEND_API_KEY        Resend API key
     FROM_EMAIL            e.g. "Career Connect <careerconnect@yourdomain.org>"

   Always:
     AMBASSADOR_CONTACTS   JSON: {"1":{"email":"a@gsumail.gram.edu","groupme":"<bot id>"}, "2":{...}}
   Optional:
     SCHOOL_DOMAIN         student email domain, defaults to gsumail.gram.edu
     COPY_TO               a PDC coordinator address that receives a copy of every request
*/

import { Resend } from "resend";
import nodemailer from "nodemailer";

const SCHOOL_DOMAIN = process.env.SCHOOL_DOMAIN || "gsumail.gram.edu";
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request body" }, 400); }

  const ambassadorId = String(body.ambassadorId || "");
  const studentName = clean(body.studentName, 80);
  const studentEmail = clean(body.studentEmail, 120).toLowerCase();
  const helpType = clean(body.helpType, 40) || "Resume review";
  const channel = body.channel === "text" ? "text" : "email";
  const message = clean(body.message, 2000);

  if (!studentName || !studentEmail || !message) return json({ error: "Please fill in every field." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail) || !studentEmail.endsWith(`@${SCHOOL_DOMAIN}`)) {
    return json({ error: `Please use your @${SCHOOL_DOMAIN} email address.` }, 400);
  }

  let contacts;
  try { contacts = JSON.parse(process.env.AMBASSADOR_CONTACTS || "{}"); } catch { contacts = {}; }
  const ambassador = contacts[ambassadorId];
  if (!ambassador || !ambassador.email) return json({ error: "That ambassador is not set up to receive requests yet." }, 400);

  const useGmail = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const useResend = Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);
  if (!useGmail && !useResend) {
    return json({ error: "The email relay is not configured yet." }, 503);
  }

  const id = `PDC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const subject = `[Career Connect ${id}] ${helpType} request from ${studentName}`;
  const text = [
    `${studentName} is asking for help with: ${helpType}`,
    ``,
    message,
    ``,
    `Reply to this email to reach ${studentName} directly at ${studentEmail}.`,
    `Reference: ${id}`
  ].join("\n");

  try {
    if (useGmail) {
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
      await transport.sendMail({
        from: `Career Connect <${process.env.GMAIL_USER}>`,
        to: ambassador.email,
        cc: process.env.COPY_TO || undefined,
        replyTo: studentEmail,
        subject,
        text
      });
    } else {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: ambassador.email,
        cc: process.env.COPY_TO ? [process.env.COPY_TO] : undefined,
        replyTo: studentEmail,
        subject,
        text
      });
      if (error) throw error;
    }
  } catch (error) {
    console.error("Email send failed", error);
    return json({ error: "We could not deliver your request. Please try again in a moment." }, 502);
  }

  // Instant phone ping. GroupMe bots are free and post to one private group per ambassador.
  // Add a "groupme" bot id to the ambassador's entry in AMBASSADOR_CONTACTS to turn this on.
  if (ambassador.groupme) {
    await fetch("https://api.groupme.com/v3/bots/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bot_id: ambassador.groupme,
        text: `New Career Connect request (${id}) from ${studentName}: ${helpType}. Check your email to reply.`
      })
    }).catch(err => console.error("GroupMe error", err));
  }

  // SMS slot. When a texting provider is ready (Textbee, or Twilio after toll-free
  // verification), send here when channel === "text" && ambassador.phone is set.
  // For now a "text" choice still delivers by email plus the GroupMe ping above.

  return json({ ok: true, id, delivered: { email: true, groupme: Boolean(ambassador.groupme), text: false, requestedChannel: channel } });
};

function clean(value, max) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
