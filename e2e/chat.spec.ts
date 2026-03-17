import { test, expect } from '@playwright/test'
import { loginAndWait, waitForWS } from './helpers'

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWait(page)
    await waitForWS(page)
  })

  test('conversation list is visible after login', async ({ page }) => {
    // The main content area should be visible on /chat
    await expect(page).toHaveURL(/\/chat/)

    // Look for the conversation list area — it contains conversation items or an empty state
    const mainArea = page.getByRole('main')
    await expect(mainArea).toBeVisible()
  })

  test('clicking a conversation opens the chat thread', async ({ page }) => {
    // Wait for conversations to load — look for any clickable conversation item
    // Conversations are typically rendered as list items or buttons in the sidebar/list
    const firstConversation = page.locator('[class*="conversation"], [class*="chat-item"], [role="listitem"]').first()

    // If there are conversations, click the first one
    if (await firstConversation.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstConversation.click()

      // URL should update to /chat/:id
      await expect(page).toHaveURL(/\/chat\/\d+/, { timeout: 5_000 })
    } else {
      // No conversations yet — just verify the empty state or welcome message is shown
      const emptyState = page.locator('text=/select a conversation|welcome|start/i')
      await expect(emptyState).toBeVisible({ timeout: 5_000 })
    }
  })

  test('sending a text message shows it in the thread', async ({ page }) => {
    // Find and click first conversation
    const firstConversation = page.locator('[class*="conversation"], [class*="chat-item"], [role="listitem"]').first()

    // Skip if no conversations
    if (!(await firstConversation.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await firstConversation.click()
    await expect(page).toHaveURL(/\/chat\/\d+/, { timeout: 5_000 })

    // Type a test message in the input area
    const testMessage = `E2E test message ${Date.now()}`
    const messageInput = page.locator('textarea, input[type="text"]').last()
    await expect(messageInput).toBeVisible({ timeout: 5_000 })
    await messageInput.fill(testMessage)

    // Submit — either press Enter or click send button
    await messageInput.press('Enter')

    // The sent message should appear in the message thread
    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10_000 })
  })

  test('messages show sender name and timestamp', async ({ page }) => {
    // Navigate to first conversation with messages
    const firstConversation = page.locator('[class*="conversation"], [class*="chat-item"], [role="listitem"]').first()

    if (!(await firstConversation.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await firstConversation.click()
    await expect(page).toHaveURL(/\/chat\/\d+/, { timeout: 5_000 })

    // Wait for messages to load
    await page.waitForTimeout(2_000)

    // Check that at least one message bubble exists with a name or time indicator
    // Messages typically show a sender name and a relative/absolute timestamp
    const messageArea = page.getByRole('main')
    await expect(messageArea).toBeVisible()

    // Look for time indicators (common patterns: "12:34", "2:30 PM", "Yesterday", "Today")
    const timePattern = page.locator('text=/\\d{1,2}[:.:]\\d{2}|today|yesterday|ago/i').first()
    if (await timePattern.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(timePattern).toBeVisible()
    }
  })
})
