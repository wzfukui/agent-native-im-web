import { test, expect } from '@playwright/test'

test('friends page can search and send a friend request', async ({ page, request, baseURL }) => {
  const stamp = Date.now().toString(36)
  const requester = {
    username: `friends_a_${stamp}`,
    password: 'Friendpass1',
    display_name: `Friends A ${stamp}`,
  }
  const target = {
    username: `friends_b_${stamp}`,
    password: 'Friendpass1',
    display_name: `Friends B ${stamp}`,
  }

  const registerA = await request.post(`${baseURL}/api/v1/auth/register`, { data: requester })
  expect(registerA.ok()).toBeTruthy()
  const registerB = await request.post(`${baseURL}/api/v1/auth/register`, { data: target })
  expect(registerB.ok()).toBeTruthy()

  await page.goto('/login')
  await page.getByPlaceholder(/username|email/i).fill(requester.username)
  await page.getByPlaceholder(/password/i).fill(requester.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/chat/, { timeout: 15_000 })

  await page.goto('/friends')
  await expect(page.getByRole('heading', { name: /friends|好友/i })).toBeVisible()

  await page.getByPlaceholder(/search users|搜索用户|UUID|bot/i).fill(target.username)
  await expect(page.getByText(target.display_name)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /add|添加/i }).click()
  await expect(page.getByText(/request sent|已发送请求/i)).toBeVisible({ timeout: 10_000 })
})
