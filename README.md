# Career Connect

Grambling State University Professional Development Center: students pick a student ambassador and send a request for a resume review, mock interview, or job search prep. The ambassador gets the request by email and replies directly. Ambassador contact details never reach the browser.

## What is here

| Path | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | The site. Static, no build step. |
| `assets/brand/` | GSU tokens and logos from the Identity Standards. |
| `assets/img/` | Campus photography. |
| `netlify/lib/contacts.mjs` | The ambassador roster: emails and phone numbers. Server side only. |
| `netlify/functions/send-request.mjs` | The relay. Looks up the ambassador, sends the email, optionally pings GroupMe. |
| `netlify/functions/contact-link.mjs` | Hands the browser one phone number so the "Text in Messages" button works. |
| `netlify.toml` | Tells Netlify where the site and function live. |
| `.env.example` | The environment variables the function needs. |

## Preview the page locally

```
python3 -m http.server 8080
```

Open http://localhost:8080. The form will say the relay is not connected, which is expected without the function running.

## Run the full thing locally

```
npm install
npm install -g netlify-cli
cp .env.example .env   # then fill it in
netlify dev
```

## Set up email (one time)

You need one sending account. The Gmail route needs no domain and takes about ten minutes.

### Option A: Gmail (recommended for a volunteer-run site)

1. Create a free Gmail account for the program. Do not use a personal account.
2. In that account, open Google Account, then Security, and turn on 2-Step Verification.
3. Still under Security, search for "App passwords," create one named "Career Connect," and copy the 16-character password Google shows.
4. In Netlify, open the site, then Site configuration, then Environment variables. Add:
   - `GMAIL_USER` = the Gmail address
   - `GMAIL_APP_PASSWORD` = the 16-character password
   - `COPY_TO` (optional) = a coordinator who gets a copy of every request
5. Deploy. Gmail allows about 500 messages a day, far more than this site will send.

### Option B: Resend (only if you control a domain)

1. Create a Resend account, add your domain, and add the DNS records it shows. Wait for Verified.
2. Create an API key.
3. In Netlify environment variables add `RESEND_API_KEY`, `FROM_EMAIL` on that domain, and optional `COPY_TO`.

The function uses Gmail when the Gmail variables are present, otherwise Resend.

## Deploy to Netlify

Netlify has to install the email packages, so deploy from Git or the CLI, not by dragging a folder.

1. Push this folder to a GitHub repository.
2. In Netlify, open the existing site (or Add new site, then Import an existing project) and link the repository. Leave the build command empty; `netlify.toml` already sets the publish folder and functions folder.
3. Add the environment variables from the section above.
4. Trigger a deploy. Every later push to GitHub redeploys automatically.

To test, temporarily point one ambassador's email in `netlify/lib/contacts.mjs` at your own, submit the form on the live site, and check your inbox. Errors appear in Netlify under Logs, then Functions.

## Instant phone notifications (optional, free)

For any ambassador, create a GroupMe group with just them, add a bot to it at dev.groupme.com/bots, and put the bot id in that ambassador's entry in `netlify/lib/contacts.mjs` as `groupme: "<bot id>"`. They get a push notification the moment a request lands.

## Adding or removing ambassadors

Edit the `ambassadors` list at the top of `app.js` (name and whether text is offered), then add the matching id with their email and optional phone to `netlify/lib/contacts.mjs`.

## Direct texting (ambassadors who share a number)

Ambassadors with `textRelay: true` in `app.js` and a `phone` in `netlify/lib/contacts.mjs` get two extra things in their panel:

- **Text in Messages.** An `sms:` link that opens iMessage on iPhone or Mac (or the texting app on Android) with the student's name and message already typed. The student just hits send, and the conversation continues in a normal text thread.
- **Save to Contacts.** A vCard (`.vcf`) so the ambassador's name shows up in the thread instead of a bare number.

The number is never printed on the page and is not in any file the browser downloads. When a student opens that ambassador's panel, the browser asks `contact-link` for it and builds the links in memory. Someone determined could still read it from their browser's network tab, which is unavoidable if their phone is going to text it, so only add numbers for ambassadors who agreed. Ambassadors without a `phone` stay email only.

## Keeping the roster private

The roster file is server side. Netlify bundles it into the functions, and `netlify.toml` blocks `/netlify/*` as a static path, so visitors cannot download it. Keep the GitHub repository private, since the file is committed there. `AMBASSADOR_CONTACTS` in Netlify is optional and overrides the file if set.
