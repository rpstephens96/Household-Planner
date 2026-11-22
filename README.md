# Home Hub

A static household organiser for tasks, birthdays, Christmas, household records,
and finances. The browser app uses HTML, CSS, and JavaScript; Firebase provides
Google sign-in and optional household synchronisation. There is no build step or
application server.

## Project layout

- `index.html` - page shell and ordered script entry points.
- `css/app.css` - custom styles; Tailwind is loaded from its CDN.
- `js/config.js` - Firebase web app settings, allowed accounts and optional
  default household ID.
- `js/views/` - page rendering grouped by feature.
- `js/` - shared state, helpers, forms, CSV processing, backup, synchronisation,
  actions, routing and Firebase integration.

The application scripts share a browser global scope and must remain in the
order listed in `index.html`. The Firebase SDK integration is an ES module.

## Run and deploy

Serve the project directory over HTTP rather than opening the HTML file
directly. For example, from this directory run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://localhost:8000/`. Python is only needed for this example server,
not for the application. The Firebase SDK, Tailwind, Lucide icons, and Google
Fonts are loaded from external services and require network access. Google
sign-in also requires the hostname to be authorised in Firebase Authentication.

For GitHub Pages or another static host, publish `index.html` **and the entire
`css` and `js` directories**, preserving their relative paths. Configure the
Firebase web app and allowed email addresses in `js/config.js`. The web app
configuration is public: it is not a substitute for Firebase Realtime Database
Security Rules. Publish rules that restrict access to the intended verified
accounts; the app's sync setup displays suggested rules. Keep the allowed
accounts in the configuration and the published rules consistent.

## Existing data

This reorganisation does not change the local storage keys, Firebase database
paths, or backup format. Deploying at the same origin preserves the existing
browser cache; changing the scheme, hostname, or port creates a different local
storage origin. Export a JSON backup from the app before moving or redeploying.
Cloud synchronisation must be configured with the same Firebase project and
household ID to access the existing shared data.

## Planning

- Set one upcoming reminder window in Settings for birthday and renewal
  summaries. Until a window is saved, the original 30-day birthday and 60-day
  renewal windows remain in effect. The saved setting is shared with the
  household and included in backups.
- Add task categories from the Tasks page. Categories are shared and included
  in backups.
- Use the up and down buttons beside checklist items to change their order.
- Christmas recipients start in progress; use **Mark complete** when you have
  finished buying for someone. Expand a recipient to view or edit their gifts.
  Existing recipients must also be marked complete manually; a purchased gift
  no longer automatically marks someone complete. Completion is reset when
  starting a new Christmas year.

All gift ideas and gift history currently belong to the shared household data.
Do not use the app to store gifts you need to keep private from another
household member.
