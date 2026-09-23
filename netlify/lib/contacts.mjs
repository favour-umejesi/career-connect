/* Ambassador contact roster, Fall 2026.
   Server side only. Netlify bundles this into the functions and never serves
   it to the browser (netlify.toml also blocks /netlify/* as a static path).
   Ids match the ambassadors list in app.js. Numbers use full international
   format with no spaces. Leave phone out for anyone who is email only.

   To override without a code change, set AMBASSADOR_CONTACTS in Netlify to a
   JSON object of the same shape. "groupme" (a bot id) is optional. */

export const ROSTER = {
  1: { email: "ablunt1@gsumail.gram.edu" },
  2: { email: "aclaybro@gsumail.gram.edu", phone: "+16154846142" },
  3: { email: "sgaston4@gsumail.gram.edu" },
  4: { email: "nhelair2@gsumail.gram.edu", phone: "+13185213946" },
  5: { email: "vkalenga@gsumail.gram.edu", phone: "+12533254694" },
  6: { email: "ennanna@gsumail.gram.edu", phone: "+14694354455" },
  7: { email: "oonatola@gsumail.gram.edu" },
  8: { email: "orushing@gsumail.gram.edu", phone: "+13189576051" }
};

export function contacts() {
  if (process.env.AMBASSADOR_CONTACTS) {
    try { return JSON.parse(process.env.AMBASSADOR_CONTACTS); } catch { /* fall through to the roster */ }
  }
  return ROSTER;
}
