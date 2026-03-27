export function buildBotAccessText(params: {
  gatewayUrl: string
  wsUrl: string
  accessToken: string
}) {
  const { gatewayUrl, wsUrl, accessToken } = params
  return [
    `AGENT_IM_BASE=${gatewayUrl}/api/v1`,
    `AGENT_IM_TOKEN=${accessToken}`,
    `AGENT_IM_WS=${wsUrl}`,
    '',
    '# OpenClaw token rotation',
    '# Replace channels.ani.apiKey with the latest token, then reconnect the gateway.',
    '',
    '# Quick check',
    `curl ${gatewayUrl}/api/v1/me -H "Authorization: Bearer ${accessToken}"`,
    '',
    '# WebSocket clients should send Authorization: Bearer <token> during the handshake',
  ].join('\n')
}

export function buildBotAccessUrl(params: {
  gatewayUrl: string
  accessToken: string
  botIdentifier: string
}) {
  const { gatewayUrl, accessToken, botIdentifier } = params
  return `aim-bot://connect?base=${encodeURIComponent(`${gatewayUrl}/api/v1`)}&token=${encodeURIComponent(accessToken)}&bot_identifier=${encodeURIComponent(botIdentifier)}`
}
