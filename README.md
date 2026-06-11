# MVP Media Photography - Data Collection and Dashboard

This project now supports:

- Form submission to a server endpoint (`/api/submit-application`)
- Persistent storage in Supabase Postgres
- Analytics endpoint (`/api/dashboard`)
- Dashboard page with bar, pie, and trend charts (`/dashboard`)

## 1) Create database table

Run the SQL in [db/schema.sql](db/schema.sql) in your Supabase SQL editor.
If you already ran an older version of the schema, run it again so the old required-unpaid/TFP constraint is dropped.

## 2) Configure Vercel environment variables

Add these in your Vercel project settings:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_DASHBOARD_PASSWORD`

`ADMIN_DASHBOARD_PASSWORD` protects `/dashboard.html`, `/artistic-nude-dashboard.html`, and their backing API endpoints. Choose a long private password and set it only in Vercel environment variables.

## 3) Deploy

Deploy to Vercel. The site will now:

- POST form data from [index.html](index.html) to `/api/submit-application`
- Store each application row in `model_applications`
- Serve aggregate analytics from `/api/dashboard`
- Render charts on [dashboard.html](dashboard.html)

## 4) Open dashboard

After deployment:

- `/dashboard` (or `/dashboard.html`)

## Notes

- Photo uploads are sent to the configured Cloudinary unsigned upload preset in the browser. If an upload fails on the main form, the application still saves the original filename as a fallback.
- Both public forms include local draft autosave, image file checks, duplicate-email protection, and a hidden spam trap.
