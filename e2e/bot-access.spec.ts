import { test, expect } from '@playwright/test'
import { waitForWS } from './helpers'

test.describe('Bot access pack', () => {
  test('regenerate token keeps a fresh OpenClaw access pack available', async ({ page }) => {
    const stamp = Date.now()
    const username = `e2e_rot_${stamp}`
    const password = 'E2ePass123!'

    await page.goto('/login')
    await page.getByRole('button', { name: /sign up/i }).click()
    await page.getByPlaceholder(/choose a username/i).fill(username)
    await page.getByPlaceholder(/your email/i).fill(`${username}@example.com`)
    await page.getByPlaceholder(/your display name/i).fill('E2E Rotate User')
    await page.getByPlaceholder(/at least 6 characters/i).fill(password)
    await page.getByPlaceholder(/re-enter password/i).fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/chat/, { timeout: 20_000 })
    await waitForWS(page)

    const token = await page.evaluate(() => sessionStorage.getItem('aim_token'))
    expect(token).not.toBeNull()

    const botId = await page.evaluate(async ({ token, name, botId }) => {
      const res = await fetch('/api/v1/entities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, bot_id: botId, display_name: name, metadata: { description: 'E2E rotate bot' } }),
      })
      const payload = await res.json()
      if (!payload.ok || !payload.data?.entity?.id) {
        throw new Error(`Failed to create bot: ${JSON.stringify(payload)}`)
      }
      return payload.data.entity.id as number
    }, { token, name: `E2E Rotate Bot ${stamp}`, botId: `bot_e2e_rotate_${stamp}` })

    await page.route('**/api/v1/entities/*/regenerate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            message: 'token regenerated',
            entity: { id: 1 },
            api_key: 'aim_e2e_rotated_token',
            disconnected: 2,
          },
        }),
      })
    })

    await page.goto(`/bots/${botId}`)

    const regenerateButton = page.getByTestId('regenerate-token-button')
    await expect(regenerateButton).toBeVisible({ timeout: 10_000 })

    await regenerateButton.click()
    await page.getByRole('button', { name: /regenerate token/i }).last().click()

    await expect(page.getByText(/token rotated\./i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/openclaw plugin.*new token/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /show advanced options/i }).click()
    await expect(page.getByTestId('copy-bot-token-button')).toBeEnabled()
    await expect(page.getByTestId('copy-bot-access-button')).toBeEnabled()
    await expect(page.getByTestId('download-quickstart-button')).toBeEnabled()

    await page.waitForTimeout(800)
    await expect(page.getByText(/token rotated\./i)).toBeVisible()
    await expect(page.getByTestId('copy-bot-token-button')).toBeEnabled()
  })
})
