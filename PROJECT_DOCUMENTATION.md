# MVP Media Photography Survey Platform - Complete Documentation

## Project Overview

A professional online survey platform for model applications with dual intake forms (standard & artistic nude), moderation dashboards, and Supabase backend storage. Deployed on Vercel at `surverysite.vercel.app`.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Setup & Configuration](#setup--configuration)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Pages](#frontend-pages)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Architecture

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript + Chart.js for analytics
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL + PostgREST API)
- **Storage**: Supabase Storage (Cloudinary fallback for uploads)
- **Deployment**: Vercel (auto-deploy on `main` branch push)

### Project Structure
```
artwebsite/
├── index.html                          # Main survey form (bilingual)
├── artistic-nude-survey.html           # Artistic nude survey form
├── dashboard.html                      # Main moderation dashboard
├── artistic-nude-dashboard.html        # Artistic nude moderation dashboard
├── api/
│   ├── submit-application.js           # POST handler for main survey
│   ├── submit-artistic-nude.js         # POST handler for artistic nude survey
│   ├── dashboard.js                    # GET/PATCH handler for main dashboard data
│   ├── dashboard-artistic-nude.js      # GET/PATCH handler for artistic nude dashboard data
│   ├── admin-login.js                  # [DEPRECATED] password auth endpoint
│   ├── _admin-auth.js                  # [DEPRECATED] auth validation module
│   └── _supabase.js                    # Supabase config helper
├── db/
│   ├── schema.sql                      # model_applications table DDL
│   └── artistic-nude-schema.sql        # artistic_nude_applications table DDL
└── vercel.json                         # Vercel deployment config
```

---

## Setup & Configuration

### Prerequisites
- Node.js 18+
- Git
- Vercel CLI (optional, for local testing)
- Supabase account (free tier works)

### Environment Variables

Create `.env.local` in the project root:

```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Cloudinary (optional for image uploads)
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_PRESET=YOUR_PRESET

# Admin Dashboard (deprecated - passwords removed)
ADMIN_DASHBOARD_PASSWORD=YOUR_PASSWORD
```

### Step 1: Clone & Install

```bash
git clone https://github.com/mvpmedia00-commits/surverysite.git
cd artwebsite
# No npm install needed - all code is vanilla or CDN-based
```

### Step 2: Setup Supabase

1. Create a new Supabase project at https://supabase.com
2. Create two tables using the SQL schemas below:
   - `model_applications` (main survey)
   - `artistic_nude_applications` (artistic nude survey)
3. Enable PostgREST API and get your:
   - Project URL: `Settings > API > Project URL`
   - Service Role Key: `Settings > API > Project API keys > service_role`

### Step 3: Deploy to Vercel

```bash
vercel deploy
# Follow prompts to connect GitHub repo and set env vars
```

Or via Vercel dashboard:
1. Go to https://vercel.com
2. Connect GitHub repository
3. Add environment variables in Settings > Environment Variables
4. Deploy on push to `main` branch

---

## Database Schema

### Table 1: `model_applications`

**Purpose**: Stores main survey applicant data

**Columns**:
- `id` (UUID) - Primary key
- `created_at` (TIMESTAMP) - Application timestamp
- `full_name` (TEXT) - Required
- `preferred_name` (TEXT) - Display name
- `age` (INT) - Required, min 18
- `email` (TEXT) - Required, unique per application
- `city` (TEXT) - Required
- `country` (TEXT) - Required
- `instagram` (TEXT) - Social media
- `tiktok` (TEXT) - Social media
- `hear_about` (TEXT) - Source (dropdown: friends, social, google, etc.)
- `height` (TEXT) - Physical measurement
- `clothing_size` (TEXT) - Sizing
- `bra_size` (TEXT) - Optional
- `bust_measurement`, `waist_measurement`, `hip_measurement` (TEXT) - Optional body measurements
- `shoe_size` (TEXT) - Required
- `hair_color`, `eye_color` (TEXT) - Physical traits
- `experience` (TEXT) - Modeling experience level
- `worked_with_photographers` (TEXT) - Photography background
- `comfortable_snapshots` (TEXT) - Comfort with casual shoots
- `interests` (JSONB) - Array of shoot types (lingerie, swimwear, etc.)
- `comfort_level` (TEXT) - Comfort boundaries
- `avoid_concepts` (TEXT) - Hard limits
- `availability` (JSONB) - Array of available days/times
- `frequency` (TEXT) - Shoot frequency preference
- `travel_willing` (TEXT) - Travel willingness (yes/no/local)
- `travel_distance` (TEXT) - Max travel distance
- `comp_interest` (TEXT) - Compensation interest
- `expected_comp` (TEXT) - Expected pay
- `unpaid_tfp_willing` (BOOLEAN) - **REQUIRED** - Must be true to submit
- `why_work` (TEXT) - Motivation
- `good_fit` (TEXT) - Why good fit for MVP
- `anything_else` (TEXT) - Additional notes
- `consents` (JSONB) - Array of consent checkboxes checked
- `headshot_filename` (TEXT) - Headshot photo path in storage
- `full_body_filename` (TEXT) - Full body photo path in storage
- `language` (TEXT) - Form language (en/es)
- `review_status` (TEXT) - Status: pending/contacted/scheduled/approved/archived/denied
- `review_updated_at` (TIMESTAMP) - Last status update

**Indexes**:
- `created_at` - For sorting
- `review_status` - For filtering
- `hear_about` - For analytics

**Setup SQL**:
```sql
create extension if not exists pgcrypto;

create table if not exists public.model_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  preferred_name text not null,
  age int not null,
  email text not null,
  city text not null,
  country text not null,
  instagram text,
  tiktok text,
  hear_about text not null,
  height text not null,
  clothing_size text not null,
  bra_size text,
  bust_measurement text,
  waist_measurement text,
  hip_measurement text,
  shoe_size text not null,
  hair_color text not null,
  eye_color text not null,
  experience text not null,
  worked_with_photographers text not null,
  comfortable_snapshots text not null,
  interests jsonb not null default '[]'::jsonb,
  comfort_level text not null,
  avoid_concepts text not null,
  availability jsonb not null default '[]'::jsonb,
  frequency text not null,
  travel_willing text not null,
  travel_distance text not null,
  comp_interest text not null,
  expected_comp text not null,
  unpaid_tfp_willing boolean not null default false,
  why_work text not null,
  good_fit text not null,
  anything_else text,
  consents jsonb not null default '[]'::jsonb,
  headshot_filename text,
  full_body_filename text,
  language text not null default 'en',
  review_status text not null default 'pending',
  review_updated_at timestamptz
);

create index if not exists idx_model_applications_created_at on public.model_applications (created_at);
create index if not exists idx_model_applications_source on public.model_applications (hear_about);
create index if not exists idx_model_applications_review_status on public.model_applications (review_status);
```

### Table 2: `artistic_nude_applications`

**Purpose**: Stores artistic nude survey applicant data (expanded consent & boundary fields)

**Key Additional Columns** (beyond model_applications):
- `pronouns` (TEXT) - Pronouns
- `phone` (TEXT) - Contact phone
- `state_province` (TEXT) - State/province
- `previous_modeling_experience` (TEXT) - Modeling background
- `experience_types` (JSONB) - Array of modeling types
- `nude_experience_level` (TEXT) - Prior nude modeling experience
- `portfolio_link` (TEXT) - Portfolio URL
- `body_type` (TEXT) - Body type descriptor
- `notable_features`, `visible_marks`, `health_notes` (TEXT) - Physical descriptors
- `nudity_comfort_levels` (JSONB) - Array of comfort boundaries (full nude, covered, etc.)
- `hard_limits` (TEXT) - Hard boundaries
- `special_conditions` (TEXT) - Special conditions/allergies
- `availability_notes` (TEXT) - Availability details
- `travel_preference` (TEXT) - Travel preference
- `compensation_types` (JSONB) - Array of acceptable compensation
- `release_understanding` (TEXT) - Understanding of image rights
- `intended_use` (JSONB) - Array of intended uses (portfolio, exhibition, etc.)
- `emergency_contact_name`, `emergency_contact_phone` (TEXT) - Emergency contact
- `organizer_questions` (TEXT) - Organizer questions
- `confirm_18_truth` (BOOLEAN) - **REQUIRED** - Age confirmation

**Setup SQL**: See `db/artistic-nude-schema.sql`

---

## API Endpoints

### 1. Submit Main Application

**Endpoint**: `POST /api/submit-application`

**Request Body**:
```json
{
  "full_name": "Jane Doe",
  "preferred_name": "Jane",
  "age": 28,
  "email": "jane@example.com",
  "city": "Los Angeles",
  "country": "USA",
  "instagram": "@janedoe",
  "tiktok": "",
  "hear_about": "Instagram",
  "height": "5'7\"",
  "clothing_size": "M",
  "bra_size": "32B",
  "bust_measurement": "34in",
  "waist_measurement": "26in",
  "hip_measurement": "36in",
  "shoe_size": "8",
  "hair_color": "Brown",
  "eye_color": "Blue",
  "experience": "Beginner",
  "worked_with_photographers": "No",
  "comfortable_snapshots": "Yes",
  "interests": ["Swimwear", "Lingerie"],
  "comfort_level": "Moderate",
  "avoid_concepts": "None",
  "availability": ["Weekends"],
  "frequency": "2-3x per month",
  "travel_willing": "Local only",
  "travel_distance": "10 miles",
  "comp_interest": "Paid only",
  "expected_comp": "$150-200/hr",
  "unpaid_tfp_willing": true,
  "why_work": "Build portfolio",
  "good_fit": "Professional and flexible",
  "anything_else": "",
  "consents": ["privacy", "image_use"],
  "headshot_url": "https://example.com/headshot.jpg",
  "full_body_url": "https://example.com/fullbody.jpg",
  "language": "en"
}
```

**Response** (Success):
```json
{
  "ok": true,
  "id": "uuid-of-application",
  "message": "Application submitted successfully"
}
```

**Response** (Error):
```json
{
  "error": "Error message describing validation failure"
}
```

**Validation**:
- `full_name`, `email`, `unpaid_tfp_willing` are required
- At least one of `headshot_url` or `instagram` must be provided
- `unpaid_tfp_willing` must be `true`

---

### 2. Submit Artistic Nude Application

**Endpoint**: `POST /api/submit-artistic-nude`

**Request Body**: Same as above plus:
```json
{
  "pronouns": "She/her",
  "phone": "+1-555-1234",
  "state_province": "CA",
  "nude_experience_level": "Intermediate",
  "portfolio_link": "https://example.com/portfolio",
  "body_type": "Athletic",
  "notable_features": "Tattoo on shoulder",
  "visible_marks": "None",
  "health_notes": "None",
  "nudity_comfort_levels": ["Partial nude", "Artistic pose"],
  "hard_limits": "No penetration",
  "special_conditions": "Allergic to latex",
  "travel_preference": "Will travel",
  "compensation_types": ["Payment", "Prints"],
  "release_understanding": "Understand photos will be shared",
  "intended_use": ["Portfolio", "Exhibition"],
  "emergency_contact_name": "John Doe",
  "emergency_contact_phone": "+1-555-5678",
  "organizer_questions": "When will photos be available?",
  "confirm_18_truth": true
}
```

**Validation**:
- All required fields must be present
- `confirm_18_truth` must be `true`
- `unpaid_tfp_willing` must be `true`

---

### 3. Get Dashboard Data

**Endpoint**: `GET /api/dashboard`

**Response**:
```json
{
  "totalApplications": 45,
  "bySource": {
    "Instagram": 20,
    "Google": 15,
    "Friends": 10
  },
  "byExperience": {
    "Beginner": 30,
    "Intermediate": 12,
    "Professional": 3
  },
  "byStatus": {
    "pending": 25,
    "contacted": 10,
    "scheduled": 5,
    "approved": 3,
    "archived": 2,
    "denied": 0
  },
  "byCompInterest": {
    "Paid only": 30,
    "TFP": 10,
    "Both": 5
  },
  "byExpectedComp": {
    "$100-150": 15,
    "$150-200": 20,
    "$200+": 10
  },
  "byTravelWilling": {
    "Local only": 25,
    "Regional": 15,
    "Anywhere": 5
  },
  "byInterest": {
    "Swimwear": 25,
    "Lingerie": 20,
    "Artistic": 15
  },
  "trendByMonth": [
    { "month": "2024-05", "count": 10 },
    { "month": "2024-06", "count": 15 }
  ],
  "candidates": [
    {
      "id": "uuid",
      "created_at": "2024-06-15T10:30:00Z",
      "full_name": "Jane Doe",
      "preferred_name": "Jane",
      "age": 28,
      "email": "jane@example.com",
      "city": "Los Angeles",
      "country": "USA",
      "instagram": "@janedoe",
      "tiktok": "",
      "hear_about": "Instagram",
      "height": "5'7\"",
      "clothing_size": "M",
      "experience": "Beginner",
      "interests": ["Swimwear", "Lingerie"],
      "unpaid_tfp_willing": true,
      "review_status": "pending",
      "headshot_url": "https://supabase.../headshot.jpg",
      "full_body_url": "https://supabase.../fullbody.jpg"
    }
  ],
  "recentPhotos": [
    {
      "created_at": "2024-06-15T10:30:00Z",
      "full_name": "Jane Doe",
      "headshot_url": "https://supabase.../headshot.jpg",
      "full_body_url": "https://supabase.../fullbody.jpg"
    }
  ]
}
```

**Filters** (not sent to API, applied in dashboard UI):
- Status: all/pending/contacted/scheduled/approved/archived/denied
- Experience: all/beginner/intermediate/professional
- Source: all/instagram/google/friends/etc
- Search: name/email substring match

---

### 4. Update Candidate Status

**Endpoint**: `PATCH /api/dashboard`

**Request Body**:
```json
{
  "id": "uuid-of-candidate",
  "status": "contacted"
}
```

**Valid Statuses**:
- `pending`
- `contacted`
- `scheduled`
- `approved`
- `archived`
- `denied`

**Response**:
```json
{
  "ok": true
}
```

---

### 5. Get Artistic Nude Dashboard Data

**Endpoint**: `GET /api/dashboard-artistic-nude`

**Response**: Same structure as `/api/dashboard` with artistic nude specific candidate fields

**Update Endpoint**: `PATCH /api/dashboard-artistic-nude` (same format as main dashboard)

---

## Frontend Pages

### 1. Main Survey (`index.html`)

**Features**:
- Bilingual form (English/Spanish toggle)
- Language gate at top
- Hero image with background
- Multi-section form with scroll tracking
- Cloudinary image upload for headshot & full body
- Consent checkboxes
- **Required**: unpaid_tfp_willing checkbox with asterisk (*)
- Form validation on submit
- Error/success messaging

**Key JavaScript Functions**:
- `applyLanguage()` - Toggle form language
- `buildSubmissionPayload()` - Collect form data
- `uploadToCloudinary()` - Upload images
- `submitForm()` - Validate & POST to `/api/submit-application`

---

### 2. Artistic Nude Survey (`artistic-nude-survey.html`)

**Features**:
- Expanded questionnaire with additional fields
- Nudity comfort levels with detailed options
- Hard limits & special conditions
- Emergency contact information
- Age confirmation checkbox (confirm_18_truth)
- Same bilingual support as main survey
- **Required**: unpaid_tfp_willing checkbox with asterisk (*)
- **Required**: confirm_18_truth checkbox with asterisk (*)

---

### 3. Main Dashboard (`dashboard.html`)

**Features**:
- Admin overview (no password required after recent update)
- KPI cards: Total Apps, Top Source, Top Experience, Top Interest, Pending, Approved, Denied
- Charts:
  - Applications by Source (bar)
  - Compensation Interest (pie)
  - Applications Trend (line)
  - Top Interests (horizontal bar)
- Filters: Search (name/email), Status, Experience, Source
- Candidate list with photo links
- Status action buttons: pending/contacted/scheduled/approved/archived/deny
- Profile modal (click "View Profile" or candidate card)
- Export filtered CSV
- Navigation to Artistic Nude Dashboard

**Key JavaScript Functions**:
- `adminFetch()` - Simple fetch to API
- `loadDashboard()` - Fetch data from `/api/dashboard`
- `renderDashboard()` - Render charts & KPIs
- `getFilteredCandidates()` - Apply UI filters
- `openProfileModal()` - Show full applicant details
- `updateCandidateStatus()` - PATCH status change

---

### 4. Artistic Nude Dashboard (`artistic-nude-dashboard.html`)

**Features**:
- Identical to main dashboard but:
  - Data from `/api/dashboard-artistic-nude`
  - Additional fields: pronouns, phone, nude_experience_level, nudity_comfort_levels, hard_limits, etc.
  - Navigation button to main dashboard

---

## Deployment

### Prerequisites
- GitHub repository linked to Vercel
- Environment variables set in Vercel dashboard

### Deploy Process

1. **Local commit**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Vercel auto-deploy**:
   - Vercel detects push to `main`
   - Runs build (no build step needed for this project)
   - Deploys to production at `surverysite.vercel.app`

3. **Manual deploy** (if needed):
   ```bash
   vercel deploy --prod
   ```

### Environment Variables in Vercel

Go to: **Project Settings > Environment Variables**

Add:
- `SUPABASE_URL` = Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key
- `CLOUDINARY_CLOUD_NAME` = Your Cloudinary cloud name (optional)
- `CLOUDINARY_API_KEY` = Your Cloudinary API key (optional)
- `CLOUDINARY_PRESET` = Your Cloudinary preset (optional)

### Status

- **Current Commits**: 
  - Main deployment at `surverysite.vercel.app`
  - Latest: Remove password auth from dashboards
  - Show all profiles in dashboard list by default
  - Allow viewing denied profiles via status filter

---

## Troubleshooting

### Dashboard Shows No Applicants

**Cause**: API query hitting PostgREST row limit

**Fix**: Check that API requests include Range header:
```
Range-Unit: items
Range: 0-999999
```

**Code Location**: `api/dashboard.js` line ~115

---

### Old Applications Don't Show

**Cause**: Dashboard filtering or API ordering issue

**Solution**:
1. Verify records exist in Supabase: `SELECT * FROM model_applications;`
2. Check dashboard filters (Status, Experience, Source)
3. Ensure API returns all records: `?select=*&order=created_at.desc`

---

### Images Not Loading

**Cause**: Supabase Storage path incorrect or unsigned URL

**Fix**: Verify photo URLs are public:
1. In Supabase: Storage > applications bucket > ensure "public" policy
2. Check `toPhotoUrl()` function in API correctly builds URL:
   ```javascript
   `${supabaseUrl}/storage/v1/object/public/applications/${encodedPath}`
   ```

---

### Cannot Update Candidate Status

**Cause**: Missing `review_status` column or PATCH endpoint error

**Fix**:
1. Verify column exists: `\d model_applications` in psql
2. Check PATCH request includes both `id` and `status`
3. Status must be one of: pending/contacted/scheduled/approved/archived/denied

---

### Form Submission Fails

**Cause**: Validation error or missing required fields

**Check**:
- `full_name` not empty
- `email` not empty
- `unpaid_tfp_willing === true`
- At least one photo URL or Instagram provided
- No special characters breaking JSON

---

## Recent Changes

**Latest Commit**: `b987200`

- Removed password authentication from both dashboards
- Simplified `adminFetch` to basic fetch
- All applicants visible immediately without login
- KPIs still exclude denied profiles
- Added Range header to API requests for unlimited row fetch

---

## Contact & Support

- GitHub: `mvpmedia00-commits/surverysite`
- Live: `surverysite.vercel.app`
- Supabase Console: https://app.supabase.com
- Vercel Dashboard: https://vercel.com/dashboard

---

*Last Updated: June 11, 2024*
