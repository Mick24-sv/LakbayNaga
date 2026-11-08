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
      create-admin.js            Future admin provisioning placeholder
  test/
    integration/
      health.test.js
      authentication.test.js
      attractions.test.js
      auth-admin.test.js
      features.test.js            TODO
      planner.test.js             TODO
  .env.example
```

Only the starter homepage is currently rendered. Other frontend components retain
existing placeholders; folder organization does not mean those features are complete.

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

## LNK-BE-07 — Itinerary generation API

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
