# Supabase Setup

1. Create a Supabase project and run `schema.sql` in the SQL Editor.
2. In Authentication -> URL Configuration, add your GitHub Pages URL and the local preview URL to Redirect URLs.
3. In Authentication -> Email Templates, customize the invitation email when a custom SMTP provider is configured. The template can include `{{ .ConfirmationURL }}` and `{{ .Data.invite_code }}`. Supabase's free default email provider does not allow template modification; the invitation link still works, and the generated code is shown to the administrator in `admin.html`.
4. In Database -> Publications -> `supabase_realtime`, add `study_sessions`, `topics`, and `replies` so the page receives live updates.
5. Deploy the function with `supabase functions deploy send-invite --no-verify-jwt`.
6. Add the function environment variable `SITE_URL` with your published website URL (for example, `https://username.github.io/m304-lab-website`; a trailing `/` is also accepted). Supabase already provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; do not put the service-role key in browser files.
7. Create the first administrator from Supabase Auth dashboard, copy its UUID, then run the final bootstrap `insert` statement in `schema.sql`.
8. Open `admin.html` while signed in as that account to send member invitations.

The browser only needs the public project URL and anonymous key in `supabase-config.js`. Email delivery requires the Supabase Auth email provider or a configured custom SMTP provider.
