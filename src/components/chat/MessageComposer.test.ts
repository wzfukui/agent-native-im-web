import { describe, expect, it } from 'vitest'
import { parseComposerDraft, serializeComposerDraft, type PendingFile } from './MessageComposer'

describe('composer draft helpers', () => {
  it('serializes text, mentions, reply preview, and uploaded attachments', () => {
    const payload = serializeComposerDraft({
      text: '  Investigate this thread  ',
      replyTo: {
        id: 42,
        conversation_id: 7,
        sender_id: 1,
        sender_type: 'user',
        content_type: 'text',
        layers: { summary: 'Original reply target' },
        created_at: '2026-04-06T00:00:00Z',
        sender: {
          id: 1,
          entity_type: 'user',
          name: 'alice',
          display_name: 'Alice',
          status: 'active',
          metadata: {},
          created_at: '',
          updated_at: '',
        },
      },
      mentionIds: [2, 3],
      pendingFiles: [
        {
          name: 'brief.md',
          type: 'text/markdown',
          size: 512,
          status: 'uploaded',
          url: 'https://example.test/brief.md',
        } satisfies PendingFile,
        {
          name: 'draft.txt',
          type: 'text/plain',
          size: 10,
          status: 'uploading',
          file: new File(['draft'], 'draft.txt', { type: 'text/plain' }),
        } satisfies PendingFile,
      ],
    })

    expect(payload).not.toBeNull()
    expect(parseComposerDraft(payload)).toEqual({
      text: 'Investigate this thread',
      replyTo: {
        id: 42,
        sender: {
          id: 1,
          entity_type: 'user',
          name: 'alice',
          display_name: 'Alice',
          status: 'active',
          metadata: {},
          created_at: '',
          updated_at: '',
        },
        layers: { summary: 'Original reply target' },
      },
      mentionIds: [2, 3],
      attachments: [
        {
          name: 'brief.md',
          type: 'text/markdown',
          size: 512,
          status: 'uploaded',
          url: 'https://example.test/brief.md',
        },
      ],
    })
  })

  it('falls back to plain text when draft payload is legacy raw text', () => {
    expect(parseComposerDraft('legacy raw draft')).toEqual({
      text: 'legacy raw draft',
      replyTo: null,
      mentionIds: [],
      attachments: [],
    })
  })
})
