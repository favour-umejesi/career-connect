# Career Connect

Grambling State University Professional Development Center: students pick a student ambassador and send a request for a resume review, mock interview, or job search prep. The ambassador gets the request by email and replies directly. Ambassador contact details never reach the browser.

## What is here

| Path | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | The site. Static, no build step. |
| `assets/brand/` | GSU tokens and logos from the Identity Standards. |
| `assets/img/` | Campus photography. |
| `netlify/functions/send-request.mjs` | The relay. Looks up the ambassador, sends the email through Resend, optionally pings GroupMe. |
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

1. Create a free Gmail account for the program, for example `gsucareerconnect@gmail.com`. Do not use a personal account.
2. In that account, open Google Account, then Security, and turn on 2-Step Verification.
3. Still under Security, search for "App passwords," create one named "Career Connect," and copy the 16-character password Google shows.
4. In Netlify, open the site, then Site configuration, then Environment variables. Add:
   - `GMAIL_USER` = the Gmail address
   - `GMAIL_APP_PASSWORD` = the 16-character password
   - `AMBASSADOR_CONTACTS` = JSON mapping each ambassador id in `app.js` to their email, on one line
   - `COPY_TO` (optional) = a coordinator who gets a copy of every request
5. Deploy. Gmail allows about 500 messages a day, far more than this site will send.

### Option B: Resend (only if you control a domain)

1. Create a Resend account, add your domain, and add the DNS records it shows. Wait for Verified.
2. Create an API key.
3. In Netlify environment variables add `RESEND_API_KEY`, `FROM_EMAIL` on that domain, plus `AMBASSADOR_CONTACTS` and optional `COPY_TO` as above.

The function uses Gmail when the Gmail variables are present, otherwise Resend.

## Deploy to Netlify

Netlify has to install the email packages, so deploy from Git or the CLI, not by dragging a folder.

1. Push this folder to a GitHub repository.
2. In Netlify, open the existing site (or Add new site, then Import an existing project) and link the repository. Leave the build command empty; `netlify.toml` already sets the publish folder and functions folder.
3. Add the environment variables from the section above.
4. Trigger a deploy. Every later push to GitHub redeploys automatically.

To test, point one ambassador's entry in `AMBASSADOR_CONTACTS` at your own email, submit the form on the live site, and check your inbox. Errors appear in Netlify under Logs, then Functions.

## Instant phone notifications (optional, free)

For any ambassador, create a GroupMe group with just them, add a bot to it at dev.groupme.com/bots, and put the bot id in that ambassador's entry as `"groupme": "<bot id>"`. They get a push notification the moment a request lands.

## Adding or removing ambassadors

Edit the `ambassadors` list at the top of `app.js` (name and whether text is offered), then add the matching id to `AMBASSADOR_CONTACTS` in Netlify.

## Brand

Colors, type, and logo usage follow the GSU Identity Standards v1.4.2. Black and gold carry the identity, red is reserved for the error state. Display headlines use Oswald, the approved condensed web alternate, in capitals; body and interface text use Poppins.
