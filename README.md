# LakbayNaga

React/Vite frontend and Express backend, organized by feature and responsibility.

## Setup

Requires Node.js 22 or newer and npm. From the project root:

```powershell
npm.cmd install
Copy-Item backend/.env.example backend/.env
npm.cmd run dev
```

The frontend runs at http://localhost:5173 and proxies `/api` to the backend,
which defaults to http://localhost:3001. Configure `PORT` in `backend/.env`.

```powershell
npm.cmd test       # Backend tests
npm.cmd run build  # Frontend production build
npm.cmd start      # Backend only
```

Do not commit `.env`, `node_modules`, or generated `dist` files.

## Project structure

```text
frontend/
  src/
    main.jsx                     React startup and global styles
    App.jsx                      Page composition; future navigation
    pages/
      home/
        HomePage.jsx
        HomePage.css
      authentication/
        AccountPage.jsx
      itineraries/
        TripsPage.jsx
      profile/
        ProfilePage.jsx
      admin/
        AdminPage.jsx
        AdminPage.css
    components/
      forms/PasswordInput.jsx
      maps/RouteMap.jsx
      media/
        AttractionGallery.jsx
        ImageCropper.jsx
        Images.jsx
    data/catalog.js              Frontend reference data placeholder
    styles/global.css            Shared styles only
  index.html
  vite.config.js

backend/
  src/
    app.js                       Configure Express and register routes
    server.js                    Environment loading and server startup
    routes/
      authRoutes.js              Authentication and profile URL mappings
      attractionRoutes.js        Public and administrator attraction URLs
      featuresRoutes.js          Future feature routes placeholder
    controllers/
      authController.js          Authentication request handling
      attractionController.js    Attraction request validation/responses
    services/
      authService.js             Password hashing and account validation
      attractionService.js       Public visibility/search/category rules
      plannerService.js          Future itinerary logic placeholder
    middleware/
      authMiddleware.js          Session loading and access permissions
      asyncHandler.js            Express 4 async error forwarding
      errorHandler.js            JSON error and not-found responses
    repositories/
      memoryStore.js             In-memory account/session storage
    data/
      attractions.js             Temporary planning records
    scripts/
      create-admin.js            Administrator provisioning
  test/
    integration/
      health.test.js
      authentication.test.js
      attractions.test.js
      auth-admin.test.js
      features.test.js            Concurrent password-change regression
      planner.test.js             Planner validation and budget checks
      budget-qa.test.js           Independent cent/calendar calculations
      user-journeys.test.js       Complete API user/admin journeys
  .env.example
```

The application now includes attraction browsing/details, accounts, itinerary planning, saved trips, profile editing, and the admin workspace. See the ticket-specific sections below for API contracts and verification scope.

## Organization rules

- Keep a page and its specific CSS in `pages/<feature>/`.
- When a page needs reusable feature logic, place it alongside the page, for example
  `pages/attractions/attractionsLogic.js`. Do not add empty logic files unnecessarily.
- Keep components used by multiple pages in `components/`.
- `main.jsx` starts React; `App.jsx` selects and composes pages.
- Backend routes define URLs and permission middleware. Controllers handle requests
  and responses. Services contain reusable rules. Repositories handle storage.
- Add database models/configuration when MongoDB is implemented. At that stage,
  replace the temporary data source with database reads managed through repositories.
- Keep tests in `backend/test/integration/` and import production modules using
  their new locations.

## Existing ticket verification

All existing API URLs are preserved:

| Endpoint | Access |
| --- | --- |
| GET /api/health | Public; returns `{"status":"ok"}` |
| GET /api/attractions | Public; published, non-archived records only |
| POST /api/auth/register | Public |
| POST /api/auth/login | Public |
| GET /api/auth/me | Public session inspection |
| POST /api/auth/logout | Ends the current session |
| GET /api/profile | Login required |
| PUT /api/profile | Login required; update firstName and lastName only |
| PUT /api/profile/password | Login required; currentPassword and newPassword; rotates/revokes sessions |
| GET /api/admin/attractions | Administrator required |

Attraction query examples:

```text
/api/attractions?q=plaza
/api/attractions?category=City%20spaces
/api/attractions?q=plaza&category=City%20spaces
```

Run individual ticket checks from the backend folder:

```powershell
node --test test/integration/health.test.js
node --test test/integration/authentication.test.js
node --test test/integration/attractions.test.js
node --test test/integration/auth-admin.test.js
```

Accounts and sessions currently live in memory and reset on server restart.
Attraction records are temporary planning data; fees, durations, and coordinates
require local verification. MongoDB, admin provisioning, and the remaining feature
placeholders are separate implementation work.

## File migration reference

| Previous location | Current location |
| --- | --- |
| frontend/src/Home.jsx | frontend/src/pages/home/HomePage.jsx |
| frontend/src/Account.jsx | frontend/src/pages/authentication/AccountPage.jsx |
| frontend/src/Trips.jsx | frontend/src/pages/itineraries/TripsPage.jsx |
| frontend/src/Admin.jsx and admin.css | frontend/src/pages/admin/ |
| frontend/src/Profile.jsx | frontend/src/pages/profile/ProfilePage.jsx |
| frontend/src/style.css | frontend/src/styles/global.css |
| backend/src/auth.js | services/authService.js and middleware/authMiddleware.js |
| backend/src/store.js | backend/src/repositories/memoryStore.js |
| backend/src/attractions.js | backend/src/data/attractions.js |
| backend/src/planner.js | backend/src/services/plannerService.js |
| backend/src/features.js | backend/src/routes/featuresRoutes.js |
| backend/src/create-admin.js | backend/src/scripts/create-admin.js |
| backend/test/*.test.js | backend/test/integration/*.test.js |

The former inline routes in `app.js` now use `routes/`, `controllers/`, and
`services/`. Backend tests and frontend imports have been updated accordingly.

## LNK-BE-07 � Itinerary generation API

`POST /api/itineraries/generate` requires the current login session cookie.
Guests receive HTTP 401. Invalid settings receive HTTP 400 with a JSON error.

Example JSON request:

```json
{
  "budget": 1500,
  "hours": 6,
  "people": 2,
  "days": 1,
  "startDate": "2026-11-22",
  "pace": "balanced",
  "transport": "public",
  "preferences": ["Faith & heritage", "City spaces"],
  "foodPerPersonDay": 100,
  "lodgingPerNight": 0
}
```

Budget is for the entire group and whole trip; hours are per day. Supported paces:
relaxed, balanced, active. Supported transport: walk, public, private. Empty interests
allow all categories. Food is per traveler per day; lodging is per group per night
(days minus one). At most 7 days, 20 travelers, and 12 hours per day are accepted.

Response fields match the completed system's planner:
- `settings`: normalized inputs.
- `days`: day number, optional date, stops, minutes, and approximate distance.
- `stops`: flattened list across days, with no repeated attraction IDs.
- `totals`: admissions, transportAllowance, food, lodging, total, remaining,
  minutes, and distanceKm.
- `notice`: qualifications about planning estimates.

A stop's `startMinutes` is elapsed time from the start of that day. The finished
frontend displays these offsets relative to 09:00; they are not verified opening hours.
Pace adjusts visit durations. The planner selects affordable stops per day, then
orders them by nearby coordinates. It is a planning heuristic, not a guaranteed
optimal road route. Missing coordinates contribute zero to distance estimates.
Transport allowances are PHP 0/50/100 per traveler per stop for walk/public/private;
transfer estimates are 45/30/20 minutes between stops respectively. These are demo
planning assumptions, not live fares or travel-time estimates.

Only published, non-archived attractions with valid numeric fees and durations
are eligible. Records come through the existing repository (MongoDB when configured).
No attraction data is embedded in the service. Empty or unaffordable catalogs return
an empty plan; food/lodging exceeding the budget produce HTTP 400. Client-supplied
stops or totals are ignored. Generation does not save an itinerary.

Implementation:
- `backend/src/services/plannerService.js`: validation and planning algorithm.
- `backend/src/controllers/itineraryController.js`: repository access and responses.
- `backend/src/routes/itineraryRoutes.js`: authenticated endpoint registration.
- `backend/test/integration/planner.test.js`: budget/time, dates, preferences,
  visibility, validation, and session checks using temporary test fixtures.

Run the ticket tests from the project root:

```powershell
node --test backend/test/integration/planner.test.js
```


## LNK-BE-08: Saved itinerary APIs

All endpoints require the session cookie from login or registration.

| Method | Endpoint | Response |
| --- | --- | --- |
| GET | /api/itineraries | 200, current user's trips |
| POST | /api/itineraries | 201, created trip |
| GET | /api/itineraries/:id | 200, owned trip |
| PUT | /api/itineraries/:id | 200, updated trip |
| DELETE | /api/itineraries/:id | 204, no response body |

POST and PUT take the same body:

```json
{
  "name": "My Naga visit",
  "settings": { "budget": 1500, "hours": 6, "days": 1, "people": 1 }
}
```

Responses contain id, ownerId, name, plan, createdAt, and updatedAt.
The plan uses the BE-07 response format. PUT requires both name and settings.
Settings are revalidated and the plan is regenerated from current published,
non-archived attractions. Supplied ownerId, id, timestamps, stops, and totals
cannot override server values. Saving an empty plan returns 400. Regenerating
on update may change stops as attraction availability or fees change.
Guests receive 401; missing and other users' trip IDs both return 404.
Administrators also access only their own saved itineraries.

Storage now uses MongoDB when MONGODB_URI is configured. Without MongoDB,
itineraries use temporary memory and disappear on restart. MongoDB startup injects
mongoItineraryRepository into createApp. All repository queries enforce ownership.
The async interface remains list(ownerId), find(id, ownerId), create(ownerId, data),
update(id, ownerId, data), and delete(id, ownerId).

Run: node --test backend/test/integration/saved-itineraries.test.js


## LNK-BE-10: Google sign-in and password recovery

- `POST /api/auth/google` accepts a Google Identity Services ID token in `credential` (or `idToken`). The backend verifies the token with Google, checks the configured client ID and verified email, then creates or links the account and starts the normal session.
- `POST /api/auth/password-reset/request` accepts `{ "email": "..." }`. It always returns the same response whether or not an account exists. Known accounts receive a single-use link that expires after 30 minutes.
- `POST /api/auth/password-reset/complete` accepts `{ "token": "...", "password": "..." }`. Passwords must be 12–128 characters; successful tokens cannot be reused.

Set `GOOGLE_CLIENT_ID` in `backend/.env` and the matching `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` to the OAuth web client ID. Configure `FRONTEND_URL` to the public frontend origin, plus `RESEND_API_KEY` and `AUTH_EMAIL_FROM` for recovery email delivery through Resend. The reset email link opens the frontend reset form. Without the required provider/email configuration, those integrations report an unavailable status or log email delivery failure; password reset requests still use the same privacy-preserving response.

Run the focused success/failure flow checks with `node --test backend/test/integration/google-password-recovery.test.js`.


## LNK-DB-04: Persistent trips, images, and website settings

With MONGODB_URI configured, startup initializes MongoDB repositories and indexes:
- itineraries: ownerId, name, plan, timestamps; index on ownerId + createdAt.
- images: unique 32-character id, contentType, size, binary data, uploadedBy, timestamps.
- settings: unique key (site), value containing logo, hero, account image URLs.

Without MongoDB, each repository uses isolated temporary memory. No credentials
are stored in the source. Existing image documents and saved trip records are preserved.

GET /api/settings (alias /api/site-images) is public. PUT /api/admin/settings
(alias /api/admin/site-images) requires an admin and accepts any subset of logo,
hero, account. Omitted fields are preserved. An empty string clears a selected
image. Nonempty values must reference an existing uploaded /api/images/<id> URL.
Unknown keys, wrong types, and missing uploads return JSON 400 errors.

POST /api/admin/images (alias /api/admin/uploads) accepts raw JPEG, PNG, or WebP
bytes up to 5 MB and requires an administrator. The declared MIME type must match
the file signature. Response: { url, imageUrl }, both containing the public URL.
GET /api/images/:id serves the original bytes and MIME type with nosniff protection.
This endpoint checks file signatures, not complete decoding or re-encoding;
advanced processing/cropping belongs to the image-management integration ticket.

Run npm test for regression tests. To verify real MongoDB persistence, run:

```powershell
node backend/src/scripts/check-db04-persistence.js
```

The script uses uniquely named verification collections inside the configured database.
It checks trip CRUD/ownership, image byte retrieval, settings updates, and persistence
after disconnect/reconnect. It drops only its verification collections afterward;
it never edits the real trips, images, settings, or credentials. The database user
needs read/write, index-creation, and collection-removal permissions.

Google local setup: set `GOOGLE_CLIENT_ID` in `backend/.env` and the same public ID as `VITE_GOOGLE_CLIENT_ID` in `frontend/.env.local`. Never put the client secret in a Vite variable. Restart Vite after changing frontend environment variables. Add the frontend origin (for example `http://localhost:5173`) to the OAuth web client authorized JavaScript origins in Google Cloud. The account screen uses the Google-rendered sign-in button; its credential is verified by the backend before a session is created.

## LNK-DB-05: Index and persistence verification

The MongoDB connection sets `autoIndex` to `false`, so indexes are created only by each repository's `initialize()` call at startup. Required indexes:
- users: unique email; unique sparse `googleId`.
- sessions: unique digest; TTL on `expiresAt`; `userId` (added in DB-05 for session revocation).
- password resets: unique digest; TTL on `expiresAt`.
- attractions and images: unique `id`; settings: unique `key`.
- itineraries: `ownerId` + `createdAt` (descending).

To verify indexes, duplicate rejection, query plans, and persistence after reconnection, run:

```powershell
node backend/src/scripts/check-db05-indexes.js
```

The script uses randomly named verification collections and removes them afterward. It does not edit real application records. The database user needs read/write, index-creation, and collection-removal permissions.

Verification result: startup created the required indexes, duplicate constraints were checked, and repository query plans used indexes without collection scans or in-memory sorts. The run then failed after reconnect with MongoDB error 11000 because the verification script attempts to insert the same `u900@example.test` fixture again. The script removed its temporary collections; the overall DB-05 check is not yet passing until that fixture is made unique across both duplicate checks.

## LNK-SEC-01: API authorization and input-validation audit

Run `node --test backend/test/integration/security.test.js` from the project root. These tests use isolated memory stores and do not write to MongoDB. They cover guest/forged-session rejection (401), ordinary-user rejection on every admin route (403), immediate role-change enforcement, saved-trip ownership (including administrator accounts), forged ownership fields, structured database-style input, and rejected requests leaving records unchanged. Search is limited to 200 characters, category to 40 characters, and planner preferences to 32 entries. This ticket verifies API authorization and validation; authentication rate limits, database configuration, and upload hardening remain separate security tickets.

## LNK-QA-01 verification

See [the QA report](docs/qa/LNK-QA-01.md) for verified journeys, bug fixes, screenshots, repeatable commands, and external acceptance checks. Run `npm test` and `npm run build` from the root. `node backend/src/scripts/check-qa-persistence.js` verifies profile/password/session/trip persistence in isolated MongoDB collections and cleans them up. Profile APIs accept only the documented fields; the password route requires the current password.

## Deployment preparation

The release target is Vercel (frontend), Render (Express API), and MongoDB Atlas. See [the deployment guide](docs/deployment/README.md). `vercel.json` contains a deliberate placeholder until the real Render URL is known; `npm run build:vercel` blocks publishing with that placeholder. `npm run check:deployment` validates the local template without publishing. The root `render.yaml` targets the finished `main` branch with automatic deployment initially off. Production startup requires MongoDB and a valid HTTPS frontend origin. Remaining team tickets and hosted acceptance checks must be completed before release.
