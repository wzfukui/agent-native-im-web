import { test, expect } from '@playwright/test'
import { login, loginAndWait, getCredentials } from './helpers'

test.describe('Authentication', () => {
  test('login with valid credentials redirects to /chat', async ({ page }) => {
    await loginAndWait(page)
    await expect(page).toHaveURL(/\/chat/)
  })

  test('login with invalid credentials shows error message', async ({ page }) => {
    await login(page, 'nonexistent_user_xyz', 'wrong_password_123')

    // Should stay on /login and show an error
    await expect(page).toHaveURL(/\/login/)
    // The error message appears in a styled div within the form
    const errorEl = page.locator('form').locator('div').filter({ hasText: /failed|error|invalid|incorrect/i }).first()
    await expect(errorEl).toBeVisible({ timeout: 10_000 })
  })

  test('logout redirects to /login', async ({ page }) => {
    // First login
    await loginAndWait(page)

    // Navigate to settings where the sign-out button lives
    await page.goto('/settings')
    await page.waitForURL(/\/settings/)

    // Click the sign-out button
    const signOutButton = page.getByRole('button', { name: /sign out/i })
    await expect(signOutButton).toBeVisible({ timeout: 10_000 })
    await signOutButton.click()

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('protected route without auth redirects to /login', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()

    // Try to access /chat directly without being logged in
    await page.goto('/chat')

    // Should redirect to /login since there is no auth token
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
