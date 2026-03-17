# Agent Native IM - Web

Web control panel for the [Agent-Native IM](https://github.com/wzfukui/agent-native-im) platform. Version **1.6.0**.

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
}
```

## Browser Support

Chrome 92+, Firefox 93+, Safari 16+, Edge 92+. ES2022 target. Push notifications and Service Worker require HTTPS.

## Related Projects

| Project | Description |
|---|---|
| [agent-native-im](https://github.com/wzfukui/agent-native-im) | Backend (Go) |
| [agent-native-im-sdk-python](https://github.com/wzfukui/agent-native-im-sdk-python) | Python SDK |

## License

MIT
