interface BotQuickstartParams {
  botName: string
  botToken: string
  apiUrl: string
  webUrl: string
}

export function generateBotQuickstart(params: BotQuickstartParams): string {
  const { botName, botToken, apiUrl, webUrl } = params
  const serverUrl = apiUrl.replace(/\/api\/v1$/, '')

  return `# ${botName} OpenClaw Quick Start

This bot is intended to connect through the ANI OpenClaw channel plugin.

## Credentials

- ANI Server: \`${serverUrl}\`
- API Base: \`${apiUrl}\`
- WebSocket: \`${serverUrl.replace(/^http/, 'ws')}/api/v1/ws\`
- API Key: \`${botToken}\`

## Recommended Path

Use the ANI OpenClaw channel plugin.

## Install OpenClaw

\`\`\`bash
openclaw plugins install @wzfukui/ani
\`\`\`

## Enable ANI Plugin

\`\`\`bash
openclaw config set plugins.allow '["ani"]' --strict-json
openclaw config set plugins.entries.ani.enabled true
\`\`\`

## Configure ANI

\`\`\`bash
openclaw config set channels.ani.serverUrl "${serverUrl}"
openclaw config set channels.ani.apiKey "${botToken}"
\`\`\`

## Minimum Tool Access

\`\`\`bash
openclaw config set tools.profile messaging
openclaw config set tools.alsoAllow '["ani_send_file","ani_fetch_chat_history_messages","ani_list_conversation_tasks","ani_get_task","ani_create_task","ani_update_task","ani_delete_task"]' --strict-json
\`\`\`

## Check The Gateway

\`\`\`bash
openclaw gateway status
\`\`\`

If ANI does not appear online after updating the config, reconnect or restart the OpenClaw gateway.

## Verify

\`\`\`bash
curl ${apiUrl}/me -H "Authorization: Bearer ${botToken}"
\`\`\`

## Useful Links

- ANI Web: ${webUrl}
- ANI Onboarding Guide: ${serverUrl}/api/v1/onboarding-guide
- ANI Skill Template: ${serverUrl}/api/v1/skill-template?format=text
- OpenClaw ANI Plugin README: https://github.com/wzfukui/openclaw/tree/main/extensions/ani
`
}
