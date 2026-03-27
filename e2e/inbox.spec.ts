import { test, expect } from '@playwright/test'

test('inbox shows incoming friend request and allows accept', async ({ page, request, baseURL }) => {
  const stamp = Date.now().toString(36)
  const requester = {
    username: `inbox_a_${stamp}`,
    password: 'Friendpass1',
    display_name: `Inbox A ${stamp}`,
  }
  const recipient = {
    username: `inbox_b_${stamp}`,
    password: 'Friendpass1',
    display_name: `Inbox B ${stamp}`,
  }

  const registerA = await request.post(`${baseURL}/api/v1/auth/register`, { data: requester })
  expect(registerA.ok()).toBeTruthy()
  const registerAData = await registerA.json()
  const recipientRegister = await request.post(`${baseURL}/api/v1/auth/register`, { data: recipient })
  expect(recipientRegister.ok()).toBeTruthy()
  const recipientData = await recipientRegister.json()

  const createRequest = await request.post(`${baseURL}/api/v1/friends/requests`, {
    headers: {
      Authorization: `Bearer ${registerAData.data.token}`,
      'Content-Type': 'application/json',
    },
    data: {
      target_entity_id: recipientData.data.entity.id,
    },
  })
  expect(createRequest.ok()).toBeTruthy()

  await page.goto('/login')
  await page.getByPlaceholder(/username|email/i).fill(recipient.username)
  await page.getByPlaceholder(/password/i).fill(recipient.password)
  await page.getByRole('button', { name: /sign in|登录/i }).click()
  await page.waitForURL(/\/chat/, { timeout: 15_000 })

  await page.goto('/inbox')
  await expect(page.getByRole('heading', { name: /inbox|消息盒子/i })).toBeVisible()
  await expect(page.getByText(requester.display_name)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /accept|接受/i }).click()
  await expect(page.getByRole('button', { name: /accept|接受/i })).toHaveCount(0, { timeout: 15_000 })
})
