import { describe, expect, it } from 'vitest'
import { buildBotAccessText, buildBotAccessUrl } from './bot-access'

describe('bot access helpers', () => {
  it('includes token rotation guidance in access text', () => {
    const text = buildBotAccessText({
      gatewayUrl: 'https://agent-native.im',
      wsUrl: 'wss://agent-native.im/api/v1/ws',
      accessToken: 'aim_test_token',
    })

    expect(text).toContain('AGENT_IM_TOKEN=aim_test_token')
    expect(text).toContain('Replace channels.ani.apiKey with the latest token')
    expect(text).toContain('curl https://agent-native.im/api/v1/me')
  })

  it('builds the deep-link access URL', () => {
    const url = buildBotAccessUrl({
      gatewayUrl: 'https://agent-native.im',
      accessToken: 'aim_test_token',
      botIdentifier: 'bot_support_cn',
    })

    expect(url).toContain('aim-bot://connect?base=')
    expect(url).toContain('token=aim_test_token')
    expect(url).toContain('bot_identifier=bot_support_cn')
  })
})
