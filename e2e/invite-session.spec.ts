import { test, expect } from '@playwright/test'

test.describe('Invite session restore', () => {
  test('reopened invite tab works with cookie-restored session and no synthetic bearer header', async ({ page }) => {
    let sawSyntheticAuthorization = false

    await page.addInitScript(() => {
      sessionStorage.removeItem('aim_token')
      sessionStorage.removeItem('aim_entity')
    })

    await page.route('**/api/v1/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            id: 7,
            public_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
            entity_type: 'user',
            name: 'cookie-user',
            display_name: 'Cookie User',
            status: 'active',
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      })
    })

    await page.route('**/api/v1/invite/demo-code', async (route) => {
      const authHeader = route.request().headers().authorization
      if (authHeader?.includes('__cookie_session__')) {
        sawSyntheticAuthorization = true
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            conversation: {
              id: 42,
              title: 'Invite Demo',
              conv_type: 'group',
            },
            invite: {
              code: 'demo-code',
            },
          },
        }),
      })
    })

    await page.goto('/join/demo-code')

    await expect(page.getByText('Invite Demo')).toBeVisible({ timeout: 10_000 })
    expect(sawSyntheticAuthorization).toBe(false)
  })
})
