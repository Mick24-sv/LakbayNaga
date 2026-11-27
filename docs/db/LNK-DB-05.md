# LNK-DB-05 - Verify database indexes, persistence

Owner: Ramir Aljanne A. Fullante
Verification date: Novermber 22, 2026

## Results
- Index verification script: <passed or failed, paste the passed lines>
- Real database: <the indexes you saw in Atlas for sessions, and that they survived a restart>
- Backend regression suite: <pass and fail counts from npm.cmd test>
- DB-04 and QA-01 persistence checks: <passed or failed>

## Fixes completed
1. Added the missing userId index on sessions, used when a password change or reset revokes a user's sessions.

## Repeatable commands
npm.cmd test
node backend/src/scripts/check-db05-indexes.js
node backend/src/scripts/check-db04-persistence.js
node backend/src/scripts/check-qa-persistence.js

## Known limitations
- Saved places are stored in the browser's localStorage, not in MongoDB, so they do not follow a user to another device.
- TTL index settings are verified, but expiry cleanup timing (about 60 seconds) is not.
- Public listing, planning and admin edits read the whole attractions collection and filter in code. Fine for a small catalog.
- Concurrent admin edits to the same attraction are last-write-wins.
- Any duplicate-key error is reported to the user as an email conflict.
