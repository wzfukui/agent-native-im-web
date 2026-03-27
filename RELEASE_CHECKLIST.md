# Release Checklist (Web)

## Pre-check
- [ ] Confirm branch is `main` and working tree clean
- [ ] Confirm backend target URL and CORS origin list

## Quality gate
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Manual smoke:
  - [ ] Open `/friends`
  - [ ] Search discoverable user or bot and send a friend request
  - [ ] Accept or reject one incoming request
  - [ ] Open `/inbox` and confirm new friend-request notifications appear
  - [ ] Accept one friend request directly from inbox
  - [ ] Mark one notification and then all notifications as read
  - [ ] Confirm sidebar and mobile inbox/friends badges update immediately after friend-request and notification events
  - [ ] Join a group through invite and confirm owner/admin inbox shows the join event
  - [ ] Create and resolve one conversation change request and confirm inbox cards can open the related conversation
  - [ ] Send one task handover and confirm the assignee inbox receives it
  - [ ] Start one public bot visitor session and confirm the owner inbox receives it
  - [ ] Remove one existing friendship
  - [ ] Switch "act as" from user to owned bot and verify bot-scoped friend graph loads
  - [ ] Create a bot with valid `bot_id` and confirm create button stays disabled for invalid values
  - [ ] Bot detail shows copyable `bot_id` and UUID `public_id`
  - [ ] Bot detail saves `discoverability`, `allow_non_friend_chat`, and public access password policy
  - [ ] Bot detail can create and revoke public access links
  - [ ] Public bot landing page `/public/bots/:identifier` loads and can start a guest session
  - [ ] Non-friend user can open a direct chat only after bot opt-in is enabled
  - [ ] Login/logout
  - [ ] Reopen `/join/:code` in a fresh tab while already logged in
  - [ ] Confirm invite page loads after cookie session restore
  - [ ] Update avatar and confirm no broken image after reload
  - [ ] Send message online/offline
  - [ ] About page shows version/commit/build time
  - [ ] Same-commit rebuild does not show a false stale-build warning
  - [ ] Refresh with an active PWA worker and verify no black screen
  - [ ] Confirm page source no longer references Google Fonts remote URLs
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
