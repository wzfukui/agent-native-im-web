import type { Page } from '@playwright/test'

/** Default test credentials (override via environment variables) */
const DEFAULT_USERNAME = 'chris'
const DEFAULT_PASSWORD = 'testpass123'

export function getCredentials() {
  return {
    username: process.env.E2E_USERNAME ?? DEFAULT_USERNAME,
    password: process.env.E2E_PASSWORD ?? DEFAULT_PASSWORD,
  }
}

/**
 * Fill the login form and submit, then wait for redirect to /chat.
 */
export async function login(
  page: Page,
  username?: string,
  password?: string,
) {
  const creds = getCredentials()
  const user = username ?? creds.username
  const pass = password ?? creds.password

  await page.goto('/login')

  // Fill username/email field
  await page.getByPlaceholder(/username|email/i).fill(user)
  // Fill password field
  await page.getByPlaceholder(/password/i).fill(pass)
  // Click the sign-in button
  await page.getByRole('button', { name: /sign in/i }).click()
}

/**
 * Login and wait for successful redirect to /chat.
 */
export async function loginAndWait(
  page: Page,
  username?: string,
  password?: string,
) {
  await login(page, username, password)
  await page.waitForURL(/\/chat/, { timeout: 15_000 })
}

/**
 * Wait for the WebSocket connection to be established.
 * The ConnectionStatusBar disappears (or shows connected state) when WS is ready.
 */
export async function waitForWS(page: Page) {
  // The connection status bar is only visible when there is a connection issue.
  // Wait for it to be hidden/detached, indicating a healthy WS connection.
  // Use a generous timeout since WS connection can take a few seconds.
  await page.waitForTimeout(1_000)
  // If a status bar with connection issues exists, wait for it to disappear
  const statusBar = page.locator('.connection-status-bar')
  if (await statusBar.isVisible().catch(() => false)) {
    await statusBar.waitFor({ state: 'hidden', timeout: 15_000 })
  }
}
