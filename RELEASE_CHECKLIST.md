# Release Checklist (Web)

## Pre-check
- [ ] Confirm branch is `main` and working tree clean
- [ ] Confirm backend target URL and CORS origin list

## Quality gate
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Manual smoke:
  - [ ] Login/logout
  - [ ] Send message online/offline
  - [ ] About page shows version/commit/build time
  - [ ] Connection bar shows queued/failed retry status

## Deploy
- [ ] `git pull`
- [ ] `npm run build`
- [ ] Publish `dist/*` to `/var/www/agent-im/`

## Post-check
- [ ] Open web root and verify HTTP 200
- [ ] Verify static assets load without 404
- [ ] Verify one bot token rotation flow with confirmation dialog
