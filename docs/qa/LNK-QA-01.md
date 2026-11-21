# LNK-QA-01 - User journeys, permissions, budgets and API integration

Owner: Mick Daniel Q. Morales  
Verification date: November 21, 2026

## Results

- Backend regression suite: **51 passed, 0 failed, 0 TODO**.
- Financial checks: **189 combinations** covering 1/2/7 days, 1/3/20 travelers, walking/public/private transport, and seven budget boundaries.
- Frontend production build: passed.
- Real browser checks used an isolated Express API and temporary in-memory users/attractions/trips. No application database records were used for the browser fixtures.
- MongoDB verification used randomly named `verify_qa01_<random>_*` collections. Profile, password, session and saved itinerary survived disconnect/reconnect. Verification collections were removed afterwards.

## Journeys checked

| Journey | Result and evidence |
| --- | --- |
| Guest browsing and login-required planning | Guest can browse; generation requires authentication. Planner values survive login/registration. |
| Registration and authenticated planning | Browser registration returns to the planner; generation uses server attraction records and produces a result. |
| Saved itinerary lifecycle | Generate, save, list, reopen, edit, update, cancel deletion, confirm deletion, and genuine empty state passed. |
| Account updates | Name changes persist and update the header. Email and role cannot be mass-assigned through the profile endpoint. |
| Password change | Current password checked; weak password rejected; password stored hashed; current session rotated; other sessions revoked. Old password rejected and replacement password accepted. |
| Simultaneous password changes | Only one request can replace the same old password; the losing request cannot overwrite it. |
| Logout and re-login | Protected access is revoked, logout reaches Home reliably, and new-password browser login succeeds. |
| Admin attraction lifecycle | Create draft, upload image, update fee, publish, archive, restore as draft, and republish passed. Public browsing and generation reflect those changes. |
| Permissions | Guests/forged sessions rejected with 401, ordinary users rejected from admin routes with 403, other owners (including administrators) receive 404 for private trips. |
| API failure and recovery | Saved-trip service failure shows an error and retry rather than a false empty state. Retry recovers. |
| Calendar boundaries | Leap day/year crossing work; trips extending beyond year 9999 return a validation error instead of malformed dates. |
| Monetary calculations | Entrance fees and transport multiplied by travelers; food by travelers/days; accommodation by nights. Independent integer-cent calculations verify totals, remaining budget, unique stops, exclusions and daily time limits. |
| Persistent storage | Live MongoDB temporary-collection check passed for updated profile, changed password, rotated session and saved-trip retrieval after reconnect. |

## Fixes completed

1. Implemented authenticated `PUT /api/profile` and `PUT /api/profile/password`, replacing nonfunctional profile-page actions. Both temporary and MongoDB stores implement these operations. Responses expose only public account fields.
2. Password replacement uses a comparison with the previous stored hash to prevent two concurrent requests from both overwriting the password.
3. Connected the profile forms with busy guards, clear success/error feedback and preservation of input after failure.
4. Fixed the stale protected-page guard that could race with logout navigation and unexpectedly redirect away from Home.
5. Reject multi-day date ranges extending beyond the supported four-digit calendar year.
6. Replaced obsolete TODO-only tests with real session-policy and concurrent-password regression checks. Updated deprecated Mongoose update options.

## Repeatable commands

From the repository root:

```powershell
npm test
npm run build
node --test backend/test/integration/user-journeys.test.js backend/test/integration/budget-qa.test.js
node backend/src/scripts/check-qa-persistence.js
node backend/src/scripts/check-db04-persistence.js
```

The last two commands require the local backend MongoDB environment configuration and Atlas network access. They write only to guarded, randomly named verification collections and remove those collections at completion. Do not commit `.env` files or credentials.

## Browser evidence

The screenshots contain isolated QA fixture data:

- [Generated itinerary on desktop](screenshots/qa01-planner-desktop.png)
- [Saved itinerary on mobile](screenshots/qa01-saved-trips-mobile.png)
- [Profile/password update on mobile](screenshots/qa01-profile-mobile.png)
- [API error and retry on desktop](screenshots/qa01-api-retry-desktop.png)

## External/manual acceptance checks

These results do not certify external services or a deployment that was not tested:

- Real Google account authorization/consent and the production OAuth origin. Existing Google tests verify rejected credentials and simulated verified claims; they do not perform a live Google account login.
- Actual password-reset email delivery. Automated recovery tests use an injected mailer.
- Hosted HTTPS deployment, production domain/cookies, actual-phone interactions and the database backup/restore procedure. Those remain release/database acceptance checks.
