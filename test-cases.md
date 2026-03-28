# Agent-Native IM Web Test Cases

> Updated: 2026-03-28

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

## 3. Identity And Routing

### TC-WEB-IDENTITY-001: Public routes are used when available
**Priority:** High  
**Surface:** Chat, bots, inbox links

**Steps**
1. Open a chat from inbox
2. Open a bot workspace from a bot card

**Expected Result**
- Chat route prefers `/chat/public/:publicId`
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
