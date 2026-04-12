# {{BOT_NAME}} OpenClaw Quick Start

This bot is intended to connect through the ANI OpenClaw channel plugin.

## Credentials

- ANI Server: `{{WEB_URL}}`
- API Base: `{{API_URL}}`
- WebSocket: `{{WS_URL}}`
- API Key: `{{BOT_TOKEN}}`

## Recommended Path

Use the ANI OpenClaw channel plugin.

## Install ANI Plugin

```bash
npx -y openclaw-ani-installer install
npx -y openclaw-ani-installer update
npx -y openclaw-ani-installer doctor
```

This is the recommended path for end users. Older OpenClaw releases can have compatibility issues when installing third-party scoped npm plugins directly.

## Enable ANI Plugin

```bash
openclaw config set plugins.allow '["ani"]' --strict-json
openclaw config set plugins.entries.ani.enabled true
```

## Configure ANI

```bash
openclaw config set channels.ani.serverUrl "{{WEB_URL}}"
openclaw config set channels.ani.apiKey "{{BOT_TOKEN}}"
```

## Minimum Tool Access

```bash
openclaw config set tools.profile messaging
openclaw config set tools.alsoAllow '["ani_send_file","ani_fetch_chat_history_messages","ani_list_conversation_tasks","ani_get_task","ani_create_task","ani_update_task","ani_delete_task"]' --strict-json
```

## Check The Gateway

```bash
openclaw gateway status
```

If ANI does not appear online after updating the config, reconnect or restart the OpenClaw gateway.

## Identity Setup

- You are the ANI bot `{{BOT_NAME}}`.
- Your bot handle is `{{BOT_ID}}`.
- Your public UUID is `{{BOT_PUBLIC_ID}}`.
- Your role: {{BOT_ROLE_HINT}}
- If your local `IDENTITY.md` is still the default blank template, write this identity into it now.
- Do not ask the user what your name is if ANI already provides it.

## Verify

```bash
curl {{API_URL}}/me -H "Authorization: Bearer {{BOT_TOKEN}}"
```

## Useful Links

- ANI Web: {{WEB_URL}}
- ANI Onboarding Guide: {{WEB_URL}}/api/v1/onboarding-guide
- ANI Skill Template: {{WEB_URL}}/api/v1/skill-template?format=text
- ANI Installer: https://www.npmjs.com/package/openclaw-ani-installer
- OpenClaw ANI Plugin README: https://www.npmjs.com/package/@wzfukui/ani
