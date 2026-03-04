/**
 * Message deduplication and ordering utilities
 */

import type { Message } from './types'

// Message sequence tracking
interface MessageSequence {
  conversationId: number
  lastSequence: number
  messageIds: Set<number>
  pendingMessages: Map<number, Message>
}

class MessageDedupManager {
  private sequences = new Map<number, MessageSequence>()
  private recentMessageIds = new Set<string>()
  private maxRecentIds = 1000

  /**
   * Add a message and check for duplicates
   * @returns true if message is new, false if duplicate
   */
  addMessage(message: Message): boolean {
    const msgKey = `${message.conversation_id}-${message.id}`

    // Check if we've seen this message recently
    if (this.recentMessageIds.has(msgKey)) {
      return false
    }

    // Add to recent messages set
    this.recentMessageIds.add(msgKey)

    // Trim set if it gets too large
    if (this.recentMessageIds.size > this.maxRecentIds) {
      const toDelete = Array.from(this.recentMessageIds).slice(0, 100)
      toDelete.forEach(id => this.recentMessageIds.delete(id))
    }

    // Track in conversation sequence
    const convSeq = this.getOrCreateSequence(message.conversation_id)
    if (convSeq.messageIds.has(message.id)) {
      return false
    }

    convSeq.messageIds.add(message.id)
    return true
  }

  /**
   * Process messages with sequence ordering
   */
  processMessagesWithOrder(
    messages: Message[],
    existingMessages: Message[]
  ): Message[] {
    // Create a map of existing message IDs for O(1) lookup
    const existingIds = new Set(existingMessages.map(m => m.id))

    // Filter out duplicates
    const newMessages = messages.filter(msg => {
      if (existingIds.has(msg.id)) {
        return false
      }
      return this.addMessage(msg)
    })

    // Combine and sort by ID (assuming IDs are sequential)
    const combined = [...existingMessages, ...newMessages]
    combined.sort((a, b) => a.id - b.id)

    return combined
  }

  /**
   * Handle out-of-order message delivery
   */
  handleOutOfOrderMessage(
    message: Message,
    expectedSequence: number
  ): { shouldBuffer: boolean; missingRange?: [number, number] } {
    const convSeq = this.getOrCreateSequence(message.conversation_id)

    // If message ID is much higher than expected, we may have missed messages
    if (message.id > expectedSequence + 10) {
      // Buffer this message and request missing range
      convSeq.pendingMessages.set(message.id, message)
      return {
        shouldBuffer: true,
        missingRange: [expectedSequence + 1, message.id - 1]
      }
    }

    return { shouldBuffer: false }
  }

  /**
   * Clear pending messages once gap is filled
   */
  processPendingMessages(conversationId: number): Message[] {
    const convSeq = this.sequences.get(conversationId)
    if (!convSeq || convSeq.pendingMessages.size === 0) {
      return []
    }

    const pending = Array.from(convSeq.pendingMessages.values())
    convSeq.pendingMessages.clear()
    return pending.sort((a, b) => a.id - b.id)
  }

  private getOrCreateSequence(conversationId: number): MessageSequence {
    if (!this.sequences.has(conversationId)) {
      this.sequences.set(conversationId, {
        conversationId,
        lastSequence: 0,
        messageIds: new Set(),
        pendingMessages: new Map()
      })
    }
    return this.sequences.get(conversationId)!
  }

  /**
   * Clear data for a conversation (e.g., when leaving)
   */
  clearConversation(conversationId: number) {
    this.sequences.delete(conversationId)
    // Also clear from recent IDs
    const prefix = `${conversationId}-`
    this.recentMessageIds.forEach(id => {
      if (id.startsWith(prefix)) {
        this.recentMessageIds.delete(id)
      }
    })
  }
}

// Singleton instance
export const messageDedupManager = new MessageDedupManager()

/**
 * Hook to use deduplication in components
 */
export function useMessageDedup() {
  return {
    isNewMessage: (msg: Message) => messageDedupManager.addMessage(msg),
    processMessages: (msgs: Message[], existing: Message[]) =>
      messageDedupManager.processMessagesWithOrder(msgs, existing),
    clearConversation: (convId: number) =>
      messageDedupManager.clearConversation(convId)
  }
}