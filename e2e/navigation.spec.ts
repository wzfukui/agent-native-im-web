import { test, expect } from '@playwright/test'
import { loginAndWait, waitForWS } from './helpers'

test.describe('Navigation', () => {
  test('mobile viewport: bottom tab bar visible, sidebar hidden', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAndWait(page)
    await waitForWS(page)

    // Mobile tab bar should be visible (it uses the MobileTabBar component)
    const tabBar = page.locator('nav[role="navigation"][aria-label]').last()
    await expect(tabBar).toBeVisible({ timeout: 5_000 })

    // Desktop sidebar (w-16 nav) should NOT be visible on mobile
    // The sidebar is only rendered when !isMobile
    const sidebar = page.locator('nav.w-16')
    await expect(sidebar).not.toBeVisible()
  })

  test('desktop viewport: sidebar visible, no tab bar', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAndWait(page)
    await waitForWS(page)

    // Desktop sidebar should be visible
    const sidebar = page.locator('nav[role="navigation"]').first()
    await expect(sidebar).toBeVisible({ timeout: 5_000 })

    // Mobile tab bar class should not be visible
    const mobileTabBar = page.locator('.mobile-tab-bar')
    await expect(mobileTabBar).not.toBeVisible()
  })

  test('navigate between Chat/Bots/Settings tabs', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAndWait(page)
    await waitForWS(page)

    // Start on /chat
    await expect(page).toHaveURL(/\/chat/)

    // Click Bots tab (uses aria-label from i18n: "Manage Bots")
    await page.getByRole('button', { name: /bots|agents/i }).click()
    await expect(page).toHaveURL(/\/bots/, { timeout: 5_000 })

    // Click Settings tab
    await page.getByRole('button', { name: /settings/i }).click()
    await expect(page).toHaveURL(/\/settings/, { timeout: 5_000 })

    // Click Chat tab to go back (uses aria-label "Messages")
    await page.getByRole('button', { name: /messages|chat/i }).click()
    await expect(page).toHaveURL(/\/chat/, { timeout: 5_000 })
  })

  test('URL updates on navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAndWait(page)
    await waitForWS(page)

    // Verify starting URL
    await expect(page).toHaveURL(/\/chat/)

    // Navigate to /bots
    await page.goto('/bots')
    await expect(page).toHaveURL(/\/bots/)

    // Navigate to /settings
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings/)

    // Navigate back to /chat
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/chat/)
  })
})
