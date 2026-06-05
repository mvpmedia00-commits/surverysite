# MVP Media Photography - Data Collection and Dashboard

This project now supports:

- Form submission to a server endpoint (`/api/submit-application`)
- Persistent storage in Supabase Postgres
- Analytics endpoint (`/api/dashboard`)
- Dashboard page with bar, pie, and trend charts (`/dashboard`)

## 1) Create database table

Run the SQL in [db/schema.sql](db/schema.sql) in your Supabase SQL editor.

## 2) Configure Vercel environment variables

Add these in your Vercel project settings:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

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

- File uploads are currently captured as filenames only (`headshot_filename`, `full_body_filename`).
- To store actual images, use Supabase Storage, Cloudinary, or S3 in a follow-up step.
