# LNK-SEC-03 - Secure database access and credentials

Owner: Ramir Aljanne A. Fullante
Verification date: November 26, 2026

## Results
- Audit script: <passed or failed, paste the passed lines>
- Database user in Atlas: <role and database you saw, for example readWrite on lakbaynaga>
- Atlas IP access list: <the entries now listed; 0.0.0.0/0 removed>
- Backend regression suite: <pass and fail counts from npm.cmd test>
- DB-05 index check: <passed or failed>
- Dependency audit (npm.cmd audit --omit=dev): <result>

## Fixes completed
1. Replaced the database user with a dedicated readWrite user on lakbaynaga and a generated password, and deleted the old user.
2. Replaced the administrator password and removed the ADMIN_* values from backend/.env.
3. Production now refuses to start without MONGODB_URI instead of using temporary memory.
4. Added tests that keep connection strings out of API responses and logs, and an audit script for repository, local and live database checks.

## Repeatable commands
npm.cmd test
node backend/src/scripts/check-sec03-credentials.js
node backend/src/scripts/check-db05-indexes.js

## Known limitations
- The Atlas IP access list and the user list are checked by hand in Atlas; the script checks the user’s privileges, not the IP list.
- Credentials are rotated by hand; there is no secret manager or automatic rotation.
- The administrator is created from values in backend/.env, which must be deleted afterwards.