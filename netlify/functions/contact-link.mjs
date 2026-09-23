/* Career Connect texting handoff.
   Returns the phone number for one ambassador so the browser can open
   Messages with the student's note already typed. Numbers live in
   netlify/lib/contacts.mjs, which is server side and never sent to the browser.

   GET /.netlify/functions/contact-link?id=2  ->  { "phone": "+1..." }
   Ambassadors without a "phone" entry return 404 and the button stays hidden. */

import { contacts } from "../lib/contacts.mjs";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

export default async (request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^\d{1,3}$/.test(id)) return json({ error: "Missing ambassador id" }, 400);

  const phone = String(contacts()[id]?.phone || "").replace(/[^\d+]/g, "");
  if (!/^\+\d{8,15}$/.test(phone)) return json({ error: "This ambassador is reachable by email only." }, 404);

  return json({ phone });
};
