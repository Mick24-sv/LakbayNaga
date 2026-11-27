# Deployment preparation - Vercel + Render + MongoDB Atlas

Status: **prepared locally, not published**. This is deployment groundwork, not approval to release unfinished tickets.

## Architecture

- Vercel serves `frontend/dist` at the public website URL.
- Vercel rewrites `/api/*` to the Render Express service. Browser requests stay on the website origin, including authentication cookies and image URLs.
- Render connects to MongoDB Atlas. Users, sessions, trips, images and settings use MongoDB; no Render filesystem uploads are required.
- The app uses hash routing (`/#home`, `/#planner`, etc.), so frontend pages do not need an additional SPA rewrite.

The root `vercel.json` deliberately contains an `.invalid` API destination. The production build check refuses that placeholder. Do not deploy until the actual Render URL is configured.

## While the remaining tickets are being finished

1. Merge and review Woj, Jaspher and Ramir's final work into the shared integration branch.
2. Run `npm ci`, `npm test`, `npm run build` and `npm run check:deployment` again after the final merge.
3. The local configuration check may report a pending Render URL; that is expected at this stage.
4. Merge the tested release into `main`. This Render blueprint targets `main`; do not deploy the old starter version currently on an incomplete branch.
5. Recheck Google login, password recovery, database access/indexes/backup, mobile navigation and complete user journeys after the final tickets are merged.

The CI workflow runs tests and the frontend build for pull requests and pushes to `main`/the shared branch. It does not publish anything.

## 1. Prepare MongoDB Atlas

Use a production/staging database appropriate for the release. Ramir should confirm indexes, credentials and backups first.

- Configure a database user restricted to the application database.
- Obtain the Render service's outbound IP addresses and add the relevant entries to Atlas Network Access. Your laptop's allowed IP does not grant Render access.
- Set `MONGODB_URI` only in Render's environment settings. Never put it in Vercel's `VITE_*` variables.
- Production startup now refuses to use temporary memory storage if the database URI is missing.

Do not run seed scripts during every deploy. If initial data is needed, run the existing idempotent seed script deliberately after checking the destination database.

## 2. Deploy the backend to Render when the release is approved

Use the root `render.yaml` as a Blueprint, or create a Node Web Service with:

| Setting | Value |
| --- | --- |
| Repository directory | Root of repository |
| Release branch | `main` after the final merge |
| Node version | 24 |
| Build command | `npm ci --omit=dev --workspace backend --include-workspace-root=false` |
| Start command | `npm start --workspace backend` |
| Health check | `/api/ready` |
| Auto deploy | Off initially |

Configure the environment in Render:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV=production` | Enables secure session cookies and persistent-storage requirements |
| `MONGODB_URI` | Atlas database connection string; secret |
| `FRONTEND_URL` | Exact final HTTPS website origin, for example `https://your-project.vercel.app` |
| `GOOGLE_CLIENT_ID` | OAuth web client public ID, matching Vercel's frontend ID |
| `RESEND_API_KEY` | Secret for password-recovery email |
| `AUTH_EMAIL_FROM` | Verified sender accepted by your email service |

Render supplies `PORT`; the server listens on `0.0.0.0` and that port. `FRONTEND_URL` must be a public HTTPS origin with no path, credentials, query or fragment. It is the website URL, not the API URL. To resolve the initial URL dependency, reserve/import the Vercel project first and copy its assigned production domain into Render before the backend's first successful startup.

No OAuth Client secret is needed by the current Google ID-token verification implementation. Never add secrets to a `VITE_*` variable.

After Render is running, `/api/ready` must return HTTP 200 with `{"status":"ok"}`. It returns 503 if the database connection is unavailable. `/api/health` remains the liveness endpoint.

## 3. Configure and deploy the frontend to Vercel

Use the repository root as Vercel's **Root Directory**, not `frontend/`.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Node version | 24 |
| Install command | `npm ci` |
| Build command | `npm run build:vercel` |
| Output directory | `frontend/dist` |
| Production branch | `main` after the final merge |

Once Render has assigned the real API URL, run locally:

```powershell
npm run configure:deployment -- --api https://YOUR-API.onrender.com
npm run check:deployment
```

That command updates only the API rewrite in `vercel.json`; it does not deploy. Review and commit the changed configuration before deploying Vercel. The Render URL is public configuration, not a credential.

Set `VITE_GOOGLE_CLIENT_ID` in Vercel's Production environment to the same ID as Render's `GOOGLE_CLIENT_ID`. Restart/redeploy the frontend when changing a `VITE_*` value; it is compiled into the build. Do not copy your local `.env` files to GitHub.

The frontend continues to call relative `/api` URLs. Do not replace them with direct browser calls to Render: the rewrite preserves the current same-origin session-cookie flow. Test login through the Vercel URL, not just by posting to the Render domain.

Use separate backend/database settings for any optional staging/preview environments; the blueprint does not create previews automatically.

## 4. Google and password-recovery setup

- Add the exact Vercel production origin to the Google OAuth web client's Authorized JavaScript origins. Add a custom domain too if one is used. The current Google button returns an ID token; it does not use a server redirect callback.
- Confirm both providers' Google Client IDs match.
- Confirm `FRONTEND_URL` points reset emails back to the final website.
- Verify an actual reset email arrives, the link opens, a replacement password works and the token cannot be reused.
- Verify the reset token is removed from the address bar while remaining available to the open form.

Google sign-in and email delivery are external acceptance checks; build success alone does not verify them.

## 5. Post-deployment read-only checks

```powershell
npm run smoke:deployment -- --url https://YOUR-SITE.vercel.app
```

This checks the frontend HTML and `/api/health`, `/api/ready`, and `/api/attractions` through the Vercel URL. It performs no database writes. API paths must return JSON, not the frontend HTML.

Then verify with designated test accounts:

- Register, log in, refresh, visit profile, log out and confirm protected routes reject the old session.
- Google sign-in and password recovery.
- Generate, save, reopen, edit and delete an itinerary; verify expenses and ownership.
- Admin attraction creation, publication, archiving and restoration.
- Image upload, crop, removal and retrieval through the Vercel URL, including a file near the permitted size limit.
- Data survives an intentional backend restart.
- Desktop and real-phone navigation, galleries, confirmations and reduced-motion behavior.

Do not automatically run production write tests or seed data as a deployment hook.

## Rollback and operating notes

Render auto-deploy is initially off so later ticket merges do not silently release changes. Enable it only after the group agrees on a release process. Reverting application code does not revert MongoDB data; Ramir's backup/restore ticket remains necessary.

Render's free web services can sleep after inactivity, delaying the first API request. Plan for that behavior during the defense, or select an appropriate always-on plan. No paid resource or hosted deployment has been created by this preparation.

## Reference documentation

- [Vercel external rewrites](https://vercel.com/docs/routing/rewrites)
- [Render Blueprint configuration](https://render.com/docs/blueprint-spec)
- [Render health checks](https://render.com/docs/health-checks)
- [Render free service behavior](https://render.com/docs/free)
- [Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
