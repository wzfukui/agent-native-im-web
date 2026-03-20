# Agent Native IM - Web

Web control panel for the [Agent-Native IM](https://github.com/wzfukui/agent-native-im) platform. Version **1.6.0**.

## Current Position

This web client is the current product fact standard for ANI behavior.
Mobile generally follows web semantics even when containers differ.

ANI should be understood as an agent-native communication system, not a generic IM client with AI bolted on.

## Tech Stack

| Dependency | Version |
|---|---|
| React | 19 |
| TypeScript | 5.9 |
| Vite | 7 |
| Tailwind CSS | 4 |
| Zustand | 5 |
| React Router | 7 |

## Features

- **PWA**: Service Worker, offline message queue (outbox), push notifications (HTTPS)
- **Responsive**: Desktop sidebar layout + mobile bottom tab navigation
- **Chat**: Streaming with typing indicators, artifact rendering, Markdown + code highlighting + Mermaid diagrams, reactions, read receipts, image lightbox, clipboard paste, drag-and-drop upload
- **Agent-native UX**: conversation context cards, interaction cards, task handover, bot quick actions, capability boundary messaging
- **Search**: Global full-text search across conversations
- **Bot management**: Create, approve, credentials, diagnostics, quickstart docs download
- **Conversations**: Create/archive/pin, invite links, member roles, system prompt config
- **Offline**: Outbox queue with retry, cached message replay, connection status indicators
- **UI**: Dark/light themes, Chinese/English i18n, emoji picker, skeleton loading states, error boundaries
- **Bot caching**: Entity data cached in IndexedDB for instant display
- **Testing**: E2E tests (Playwright), unit tests (Vitest)

## Development

```bash
# Prerequisites: Node.js 20+
npm install
npm run dev
# http://localhost:5173 — Vite proxies /api/* and /files/* to backend
```

### Build

```bash
npm run build   # Output: dist/
```

### Test

```bash
npm test              # Vitest unit tests
npm run test:e2e      # Playwright E2E tests
```

### Deploy

Static files in `dist/`. Example nginx config:

```nginx
server {
    listen 80;
    root /var/www/agent-im;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:9800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /files/ {
        proxy_pass http://127.0.0.1:9800;
    }

    location /avatar-files/ {
        proxy_pass http://127.0.0.1:9800;
    }
}
```

Note:

- `/files/` are protected conversation attachments
- `/avatar-files/` are stable avatar resources with different caching semantics

For uploads larger than 1 MB, ensure nginx `client_max_body_size` is configured explicitly.

## Browser Support

Chrome 92+, Firefox 93+, Safari 16+, Edge 92+. ES2022 target. Push notifications and Service Worker require HTTPS.

## Important Product Boundaries

### Attachments

The web app can always upload and render ANI attachments through authenticated access.
That does not automatically mean every bot can understand every file type.

Current product truth:

- small text files are the strongest path
- images / audio / video depend on bot model/runtime capability
- PDF / office documents are transport-supported, but parser UX is not yet complete

### Public release

Before broad public release, use these documents as the current source of truth:

- `../../_experience/ani-attachment-capability-matrix-2026-03-20.md`
- `../../_experience/ani-public-release-checklist-2026-03-20.md`

## Related Projects

| Project | Description |
|---|---|
| [agent-native-im](https://github.com/wzfukui/agent-native-im) | Backend (Go) |
| [agent-native-im-mobile](https://github.com/wzfukui/agent-native-im-mobile) | Mobile app (`ANI`) |
| [agent-native-im-sdk-python](https://github.com/wzfukui/agent-native-im-sdk-python) | Python SDK |

## License

MIT
