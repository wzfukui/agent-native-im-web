# Agent-Native IM Web Test Cases

> Updated: 2026-04-04

This suite focuses on the current released behavior of the ANI web and PWA client.

## 1. Friends And Direct Chat

### TC-WEB-FRIEND-001: Friend card opens from friends page
**Priority:** High
**Surface:** Friends page

**Preconditions**
- Logged in user has at least one friend

**Steps**
1. Open `/friends`
2. Click a friend's name or identity line

**Expected Result**
- A detail card opens
- The card shows human-readable identity details
- If the friend is a bot, the card offers a way to open bot details

### TC-WEB-FRIEND-002: Direct chat reuses existing 1:1 conversation
**Priority:** High
**Surface:** Friends page, new conversation dialog/sheet

**Preconditions**
- Logged in user already has a direct conversation with a friend or owned bot

**Steps**
1. Open the friend card or direct-chat chooser
2. Choose the same friend or owned bot again

**Expected Result**
- The app opens the existing direct conversation
- No duplicate direct conversation is created

### TC-WEB-FRIEND-003: Direct chat chooser prioritizes friends and owned bots
**Priority:** High
**Surface:** Desktop dialog, mobile sheet

**Preconditions**
- Logged in user has at least one friend and one owned bot

**Steps**
1. Open “new chat” on desktop
2. Open “new chat” on mobile/PWA

**Expected Result**
- The direct-chat path lists friends and owned bots
- The chooser does not require browsing the full entity graph first
- Owned bots are available even when they are not friends

### TC-WEB-FRIEND-004: Group creation uses friend-first candidate list
**Priority:** Medium  
**Surface:** Desktop dialog, mobile sheet

**Preconditions**
- Logged in user has friends and owned bots

**Steps**
1. Open group creation
2. Select multiple friends and/or owned bots
3. Create the group

**Expected Result**
- Group creation succeeds
- Candidates come from the friend-first list
- Selected entities appear correctly before create

### TC-WEB-FRIEND-005: Acting as an owned bot opens a 1:1 chat as that bot
**Priority:** High
**Surface:** Friends page, direct chat helper

**Preconditions**
- logged in user owns at least one bot
- target entity exists

**Steps**
1. Pick the target from a flow that allows acting as the owned bot
2. Open or create the direct conversation

**Expected Result**
- direct-conversation lookup uses the acting bot identity
- the request includes `source_entity_id`
- the resulting chat opens immediately

### TC-WEB-FRIEND-006: Bot detail surfaces explicit social-access policy
**Priority:** High
**Surface:** Bot detail

**Preconditions**
- logged in user owns a bot

**Steps**
1. Open the bot detail page
2. Inspect the policy controls
3. Change `friend_request_policy`
4. Change `direct_message_policy`
5. Save

**Expected Result**
- policy controls are grouped into visibility, interaction, and external access
- `friend_request_policy` and `direct_message_policy` are editable independently
- save persists both fields successfully

### TC-WEB-FRIEND-007: Friend removal happens from the detail card
**Priority:** Medium
**Surface:** Friends page

**Preconditions**
- Logged in user has at least one friend

**Steps**
1. Open `/friends`
2. Verify the list row does not show a delete action by default
3. Open the friend detail card
4. Click the remove action
5. Confirm the destructive dialog

**Expected Result**
- The destructive action is only exposed from the detail card
- A confirmation dialog appears before removal
- After confirmation, the friend is removed from the list

## 2. Inbox And Notifications

### TC-WEB-INBOX-001: Inbox shows system event types
**Priority:** High  
**Surface:** Inbox page

**Steps**
1. Trigger a friend request
2. Trigger an invite join
3. Trigger a conversation change request
4. Trigger a task handover
5. Trigger a public bot visitor session

**Expected Result**
- Inbox shows a card for each event type
- Conversation-scoped cards can open the relevant chat
- Read/unread state updates correctly

### TC-WEB-INBOX-002: Navigation badges stay synchronized
**Priority:** High  
**Surface:** Sidebar, mobile tab bar, inbox

**Steps**
1. Receive a friend request or notification
2. Observe sidebar/mobile badges
3. Mark the notification as read

**Expected Result**
- Badge count increases after the new event
- Badge count decreases after the event is handled or read
- No manual hard refresh is required

### TC-WEB-INBOX-003: Direct header shows Unknown when presence is stale
**Priority:** High
**Surface:** Chat header

**Preconditions**
- direct conversation exists
- client has not yet resolved fresh peer presence or the batch refresh fails

**Steps**
1. Open the direct conversation
2. Observe the chat header status label

**Expected Result**
- header does not force `Offline`
- header can show `Unknown`
- after a successful presence fetch, the header updates to `Online` or `Offline`

## 3. Identity And Routing

### TC-WEB-IDENTITY-001: Public routes are used when available
**Priority:** High  
**Surface:** Chat, bots, inbox links

**Steps**
1. Open a chat from inbox
2. Open a bot workspace from a bot card

**Expected Result**
- Chat route prefers `/chat/:publicId`
- Bot route prefers `/bots/public/:botIdentifier`
- Numeric IDs are used only as compatibility fallback

## 4. Message Copy Behavior

### TC-WEB-COPY-001: Action-menu copy preserves user text
**Priority:** High  
**Surface:** Message action menu

**Steps**
1. Send a multi-line user message
2. Use the message action menu to copy text
3. Paste into a plain-text editor

**Expected Result**
- Intended line breaks are preserved
- No extra leading/trailing blank lines appear

### TC-WEB-COPY-002: Native selection copy preserves user text
**Priority:** High  
**Surface:** Desktop browser selection

**Steps**
1. Select a multi-line user message with mouse drag
2. Press `Cmd+C` / `Ctrl+C`
3. Paste into a plain-text editor

**Expected Result**
- Copied text matches the visual selection
- No extra blank lines are inserted

### TC-WEB-COPY-003: Native selection copy preserves bot markdown paragraphs
**Priority:** High  
**Surface:** Desktop browser selection

**Steps**
1. Render a bot message with multiple markdown paragraphs or lists
2. Select part or all of the message with mouse drag
3. Press `Cmd+C` / `Ctrl+C`
4. Paste into a plain-text editor

**Expected Result**
- Paragraphs remain readable
- Formatting whitespace does not create duplicated blank lines
- Message timestamps and hover actions are not copied

### TC-WEB-COPY-004: More menu replaces custom right-click capture
**Priority:** High
**Surface:** Desktop message bubble

**Steps**
1. Hover a message bubble
2. Verify only one explicit More trigger is shown
3. Click the More trigger
4. Right-click on selected message text

**Expected Result**
- The custom action menu opens adjacent to the More trigger
- Native browser right-click remains available for selected text
- Partial text selection is preserved without the custom menu hijacking it

### TC-WEB-CHAT-001: Draft restores after switching conversations
**Priority:** High
**Surface:** Chat workspace

**Preconditions**
- At least two conversations exist

**Steps**
1. In conversation A, type draft text, add a mention, and upload at least one attachment
2. Switch to conversation B
3. Switch back to conversation A

**Expected Result**
- Conversation A restores the draft text
- Mention pills are restored
- Uploaded attachments remain attached
- Sending the message clears the restored draft afterwards

### TC-WEB-DEVICES-001: Device list labels ANI mobile clients correctly
**Priority:** Medium
**Surface:** Settings > Devices

**Preconditions**
- One web client and one ANI mobile client are connected

**Steps**
1. Open Settings > Devices
2. Wait for the list to refresh

**Expected Result**
- The mobile client appears in the list
- The mobile client is labeled as `Mobile`
- Browser sessions are labeled as `Desktop`
- The page refreshes active devices without a full app reload

### TC-WEB-LISTS-001: Conversation, friends, bots, and inbox rows use seam dividers
**Priority:** Medium
**Surface:** Desktop list views

**Steps**
1. Open Chats, Friends, Bots, and Inbox
2. Inspect a normal list row in each surface

**Expected Result**
- Rows do not use a full card border
- The avatar column remains visually open
- The right-side content region renders a subtle bottom divider seam
- Hover and active states remain readable

### TC-WEB-GROUPS-001: Default group avatar uses the same double-bubble icon as Groups navigation
**Priority:** Low
**Surface:** Desktop group conversation list

**Steps**
1. Open a group conversation list entry without a custom avatar
2. Compare it with the Groups navigation icon in the sidebar

**Expected Result**
- The default group avatar uses the same double-bubble icon family
- It no longer uses the generic people/users icon

### TC-WEB-AVATAR-001: Fresh avatar uploads preview before profile save
**Priority:** High
**Surface:** Avatar picker

**Steps**
1. Open a profile or bot avatar picker
2. Upload a new image
3. Observe the immediate preview before saving the parent form

**Expected Result**
- The preview renders successfully immediately after upload
- The UI does not request `/avatar-files/...` before the entity save succeeds
- No `avatar not found` 404 appears during the temporary preview state

## 5. PWA And Static Asset Delivery

### TC-WEB-PWA-001: Refresh does not produce a black screen
**Priority:** High  
**Surface:** PWA / desktop browser

**Steps**
1. Load the app with an active service worker
2. Refresh after a new deployment

**Expected Result**
- The app renders normally
- No blank/black screen appears
- New assets load successfully

### TC-WEB-ASSET-001: Local static assets replace remote font dependency
**Priority:** Medium  
**Surface:** App shell

**Steps**
1. Open page source or network panel
2. Load the app cold

**Expected Result**
- UI fonts are served from local static assets
- No Google Fonts remote dependency is required for normal rendering
