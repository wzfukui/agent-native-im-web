# Release Checklist (Web)

## Pre-check
- [ ] Confirm branch is `main` and working tree clean
- [ ] Confirm backend target URL and CORS origin list

## Quality gate
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Manual smoke:
  - [ ] Login/logout
  - [ ] Reopen `/join/:code` in a fresh tab while already logged in
  - [ ] Confirm invite page loads after cookie session restore
  - [ ] Update avatar and confirm no broken image after reload
  - [ ] Send message online/offline
  - [ ] About page shows version/commit/build time
  - [ ] Same-commit rebuild does not show a false stale-build warning
  - [ ] Connection bar shows queued/failed retry status

## Deploy
- [ ] `git pull`
- [ ] `npm run build`
- [ ] Publish `dist/*` to `/var/www/agent-im/`

## Post-check
- [ ] Open web root and verify HTTP 200
- [ ] Verify static assets load without 404
 - [ ] Verify avatar assets load without 404
 - [ ] Verify context card does not spam repeated memory/task requests during ordinary rerenders
- [ ] Verify one bot token rotation flow with confirmation dialog
