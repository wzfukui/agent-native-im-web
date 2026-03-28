# Agent-Native IM Web User Stories

> Updated: 2026-03-28

This document captures the current web and PWA product behavior that has already been implemented and released.

## 1. Social Graph And Direct Chat

### Story: Start a direct chat from friends or my own bots
**As a** logged-in user  
**I want to** start a direct conversation from my friends list or my owned bots  
**So that** I can reach the right person or bot without searching the full entity graph

**Acceptance Criteria**
- The direct-chat chooser prioritizes `friends + owned bots`
- The chooser works on both desktop dialog and mobile bottom sheet
- Existing direct conversations are reused instead of duplicated
- Owned bots remain available for direct chat even if they are not listed as friends

### Story: Open a friend card and act immediately
**As a** user  
**I want to** click a friend from the Friends page and see a detail card  
**So that** I can inspect identity details and start messaging quickly

**Acceptance Criteria**
- Clicking a friend name opens a detail card
- The card can open bot details for bot friends
- The card can open or create a direct conversation
- The friend row still supports remove-friend actions

### Story: Create a group from known contacts
**As a** user  
**I want to** build new groups from friends and my owned bots  
**So that** I can create small working groups without browsing unrelated entities

**Acceptance Criteria**
- Group creation surfaces the same friend-first candidate list as direct chat
- Users can select multiple friends and owned bots
- Group titles stay optional
- Mobile and desktop flows remain aligned

## 2. Inbox And Notification Center

### Story: Review all important system events in one inbox
**As a** user  
**I want to** review requests and system events in a unified inbox  
**So that** I do not miss approvals, invites, or work handovers

**Acceptance Criteria**
- Inbox contains friend request events
- Inbox contains invite-joined events
- Inbox contains conversation change request events
- Inbox contains task handover events
- Inbox contains public bot session events
- Inbox cards can open the relevant conversation where applicable

### Story: See synchronized badges across navigation surfaces
**As a** user  
**I want to** see unread notification state in desktop and mobile navigation  
**So that** I know action is required before opening the inbox

**Acceptance Criteria**
- Friends and inbox badges update after new events
- Badge state refreshes after read/accept/reject actions
- Window refocus and WebSocket updates keep state synchronized

## 3. Identity And Routing

### Story: Use stable public identifiers in user-facing routes
**As a** user  
**I want to** open shareable chat and bot URLs that use public identifiers  
**So that** links remain stable and do not expose internal numeric IDs

**Acceptance Criteria**
- Chat routes prefer `/chat/public/:publicId`
- Bot routes prefer `/bots/public/:botIdentifier`
- UI and deep links use `public_id` / `bot_id` when available
- Numeric-ID routes remain compatibility fallbacks only

## 4. Copy And Selection Experience

### Story: Copy exactly what I selected from a message bubble
**As a** desktop user  
**I want to** copy message text without extra blank lines or metadata noise  
**So that** copied content matches what I visually selected

**Acceptance Criteria**
- Right-click copy and native browser selection copy both work
- Plain user text preserves intentional line breaks
- Bot markdown does not gain extra blank lines between paragraphs
- Timestamps and action chrome are excluded from copied text

See also: [FRONTEND_COPY_PITFALLS.md](FRONTEND_COPY_PITFALLS.md)
