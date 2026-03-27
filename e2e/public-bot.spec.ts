import { test, expect } from '@playwright/test'

test('external public bot can issue a guest session and send a message', async ({ page, request, baseURL }) => {
  const stamp = Date.now().toString(36)
  const owner = {
    username: `public_owner_${stamp}`,
    password: 'Friendpass1',
    display_name: `Public Owner ${stamp}`,
  }

  const register = await request.post(`${baseURL}/api/v1/auth/register`, { data: owner })
  expect(register.ok()).toBeTruthy()
  const registerBody = await register.json()
  const token = registerBody.data.token as string

  const createBot = await request.post(`${baseURL}/api/v1/entities`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'public-support', bot_id: `bot_public_${stamp}` },
  })
  expect(createBot.ok()).toBeTruthy()
  const createBotBody = await createBot.json()
  const bot = createBotBody.data.entity

  const updateBot = await request.put(`${baseURL}/api/v1/entities/${bot.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      discoverability: 'external_public',
      allow_non_friend_chat: true,
      require_access_password: true,
      access_password: 'guestpass1',
    },
  })
  expect(updateBot.ok()).toBeTruthy()

  const createLink = await request.post(`${baseURL}/api/v1/bots/${bot.id}/access-links`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  })
  expect(createLink.ok()).toBeTruthy()
  const createLinkBody = await createLink.json()
  const code = createLinkBody.data.code as string

  await page.goto(`/public/bots/${bot.bot_id}?code=${code}`)
  await expect(page.getByRole('heading', { name: bot.display_name })).toBeVisible({ timeout: 15_000 })
  await page.getByPlaceholder(/guest/i).fill('Smoke Guest')
  await page.locator('input[type="password"]').fill('guestpass1')
  await page.getByRole('button', { name: /start chat/i }).click()
  await page.getByPlaceholder(/type your message/i).fill('hello public bot')
  await page.locator('button').filter({ has: page.locator('svg.lucide-send, svg') }).last().click()
  await expect(page.getByText('hello public bot')).toBeVisible({ timeout: 10_000 })
})
