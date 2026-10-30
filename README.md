# MeetingMind JARVIS PWA

A mobile-first, installable MeetingMind assistant. The app is local-first: meetings, contacts, tasks, quotation drafts, payment follow-ups, approved memories, preferences, and conversation history are stored in the browser on this device. It works offline after the first successful load.

## Run locally

Install Node.js 20 or later, then run:

```powershell
npm start
```

Open <http://localhost:4173>. The browser needs a secure context for install prompts, service workers, microphone, and notifications; `localhost` is supported. Do not open `index.html` with a `file://` URL when testing installation.

## Install on a phone

After the site is deployed over HTTPS, open it in the browser on the device:

- Android: Chrome or Samsung Internet → browser menu → **Install app** / **Add to Home screen**.
- iPhone: Safari → **Share** → **Add to Home Screen**.
- Desktop: use the browser's install icon or menu.

The GitHub Actions workflow deploys the static PWA when the `main` branch is pushed. The expected site URL is `https://codex26-dev.github.io/MeetingMind/`. In the repository, set **Settings → Pages → Build and deployment → Source → GitHub Actions** if Pages has not already been enabled.

## Email sign-in with one-time code and cloud sync

The sign-in page accepts an email and a six-digit code. Email auth/cloud sync is optional; **Continue on this device** works without an account. To enable email sign-in and cross-device sync:

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor. It creates one JSONB row per authenticated user and enables row-level security so users can only read or update their own row.
3. In Supabase **Authentication → Email Templates → Magic Link**, configure the message to include `{{ .Token }}` (not only `{{ .ConfirmationURL }}`) so the user receives a code. Example subject: `Your MeetingMind sign-in code is {{ .Token }}`; body: `<p>Your MeetingMind code is <strong>{{ .Token }}</strong>.</p>`.
4. Add the deployed URL (and `http://localhost:4173`) to **Authentication → URL Configuration → Redirect URLs / Site URL** as applicable.
5. On MeetingMind's sign-in page, expand **Connect email sign-in and cloud sync**, enter the project URL and its **publishable/anon key**, then save. Never enter a `service_role` key in the app.

The app sends the code through Supabase Auth's email OTP endpoint, verifies it with the email and code, then syncs the signed-in user's app data row. The key is a public client key and row-level security is required. See [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [email template variables](https://supabase.com/docs/guides/auth/auth-email-templates).

## Optional live AI answers

The PWA's core assistant actions work locally without an AI key. For open-ended answers, run the included Node server and configure an AI provider on the server (the key never belongs in browser storage):

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` and optionally `AI_MODEL`, or select `AI_PROVIDER=ollama` and set `OLLAMA_URL` / `AI_MODEL` for a local Ollama server.
2. Run `npm start` and open `http://localhost:4173`.

The server forwards a user query and only the selected local context to the configured model. The app shows whether AI is configured. GitHub Pages is static and does not run `server.mjs`; live AI needs a separately hosted Node server with HTTPS and server-side secrets. Do not add API keys to the repository or static client.

## What works in this PWA

- Email sign-in using an emailed one-time code when Supabase is configured; local mode remains available.
- Offline shell and installable app manifest with 192px and 512px icons.
- Add, edit, search, and remove contacts; call a contact only after an explicit confirmation.
- Manage meetings and export each as an `.ics` calendar event.
- Create and complete tasks/reminders, view schedules, manage quotation drafts and payment follow-ups.
- Save, review, and delete user-approved memories; export/import a JSON backup or delete local/cloud app data.
- Push-to-talk speech recognition and spoken replies when the browser/device provides those APIs and permissions.
- Local command handling for schedule lookups, meeting context, reminders, contacts, voice/language preferences, quotes, and payment summaries.
- Optional live model answers through the server-side AI endpoint.

## Platform and integration boundaries

- Wake-word listening is not implemented. The app never continuously streams microphone audio and never starts meeting recording from a voice command.
- Calendar events are exported as `.ics`; there is no direct Google/Outlook calendar OAuth connection yet.
- Notifications depend on browser permission and platform behavior. A locally scheduled timer is not a guaranteed background reminder if the browser or device stops the app.
- Calls open the device's phone handler after confirmation. WhatsApp/email sending, payments, full meeting recording/transcription, and native Android/iOS background services are not connected.
- Browser speech voices vary by operating system and language. The voice selector stores a preference; it does not bundle licensed voice packs.
- Supabase session tokens and local app data are stored in browser storage. Use a device screen lock and do not use shared/public devices for business data. No voice recordings are stored.

## Data and security

Actions that place calls, delete stored items, or delete all app data require explicit confirmation. Messages, emails, payments, and recording are not sent/started by assistant commands. To clear data, use **Settings → App data & installation → Delete all local data**; signed-in cloud data is deleted for that account as well.
