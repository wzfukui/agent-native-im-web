import { beforeEach, describe, expect, it } from 'vitest'
import { useNotificationsStore } from './notifications'
import type { Entity, FriendRequest, NotificationRecord } from '@/lib/types'

const makeEntity = (id: number, entityType: Entity['entity_type'] = 'user'): Entity => ({
  id,
  entity_type: entityType,
  name: `entity-${id}`,
  display_name: `Entity ${id}`,
  status: 'active',
  metadata: {},
  created_at: '2026-03-27T10:00:00Z',
  updated_at: '2026-03-27T10:00:00Z',
})

const makeNotification = (overrides: Partial<NotificationRecord> = {}): NotificationRecord => ({
  id: 1,
  recipient_entity_id: 10,
  kind: 'friend.request.received',
  status: 'unread',
  title: 'New friend request',
  body: 'Someone sent you a friend request',
  created_at: '2026-03-27T10:00:00Z',
  updated_at: '2026-03-27T10:00:00Z',
  ...overrides,
})

const makeFriendRequest = (overrides: Partial<FriendRequest> = {}): FriendRequest => ({
  id: 1,
  source_entity_id: 11,
  target_entity_id: 10,
  status: 'pending',
  created_at: '2026-03-27T10:00:00Z',
  updated_at: '2026-03-27T10:00:00Z',
  ...overrides,
})

beforeEach(() => {
  useNotificationsStore.getState().reset()
})

describe('hydrateSnapshot', () => {
  it('deduplicates notifications and derives unread/friend counts', () => {
    useNotificationsStore.getState().hydrateSnapshot({
      trackedEntityIds: [10, 20, 10],
      actingEntities: [makeEntity(10), makeEntity(20, 'bot'), makeEntity(10)],
      notifications: [
        makeNotification({ id: 1, status: 'unread' }),
        makeNotification({ id: 1, status: 'read', read_at: '2026-03-27T10:05:00Z' }),
        makeNotification({ id: 2, recipient_entity_id: 20, created_at: '2026-03-27T11:00:00Z' }),
      ],
      pendingFriendRequests: [
        makeFriendRequest({ id: 1, status: 'pending' }),
        makeFriendRequest({ id: 2, status: 'accepted' }),
        makeFriendRequest({ id: 1, status: 'pending' }),
      ],
    })

    const state = useNotificationsStore.getState()
    expect(state.trackedEntityIds).toEqual([10, 20])
    expect(state.actingEntities.map((entity) => entity.id)).toEqual([10, 20])
    expect(state.notifications).toHaveLength(2)
    expect(state.notifications[0].id).toBe(2)
    expect(state.unreadCount).toBe(1)
    expect(state.friendRequestCount).toBe(1)
  })
})

describe('notification mutations', () => {
  it('upserts and marks notifications read', () => {
    const store = useNotificationsStore.getState()
    store.hydrateSnapshot({
      trackedEntityIds: [10],
      actingEntities: [makeEntity(10)],
      notifications: [makeNotification({ id: 1 }), makeNotification({ id: 2, created_at: '2026-03-27T11:00:00Z' })],
      pendingFriendRequests: [],
    })

    store.upsertNotification(makeNotification({ id: 3, created_at: '2026-03-27T12:00:00Z' }))
    expect(useNotificationsStore.getState().notifications[0].id).toBe(3)
    expect(useNotificationsStore.getState().unreadCount).toBe(3)

    store.applyNotificationReadById(3, 10)
    expect(useNotificationsStore.getState().notifications[0].status).toBe('read')
    expect(useNotificationsStore.getState().unreadCount).toBe(2)

    store.applyNotificationRead(makeNotification({ id: 2, status: 'read', read_at: '2026-03-27T12:01:00Z' }))
    expect(useNotificationsStore.getState().unreadCount).toBe(1)

    store.applyNotificationReadAll(10)
    expect(useNotificationsStore.getState().unreadCount).toBe(0)
  })
})

describe('friend request mutations', () => {
  it('tracks only incoming pending requests and bumps dirty version', () => {
    const store = useNotificationsStore.getState()
    store.hydrateSnapshot({
      trackedEntityIds: [10],
      actingEntities: [makeEntity(10)],
      notifications: [],
      pendingFriendRequests: [],
    })
    const initialDirty = store.dirtyVersion

    store.upsertFriendRequest(makeFriendRequest({ id: 99, source_entity_id: 10, target_entity_id: 77, status: 'pending' }))
    expect(useNotificationsStore.getState().friendRequestCount).toBe(0)
    expect(useNotificationsStore.getState().dirtyVersion).toBe(initialDirty + 1)

    store.upsertFriendRequest(makeFriendRequest({ id: 1, status: 'pending' }))
    expect(useNotificationsStore.getState().friendRequestCount).toBe(1)
    expect(useNotificationsStore.getState().dirtyVersion).toBe(initialDirty + 2)

    store.upsertFriendRequest(makeFriendRequest({ id: 1, status: 'accepted', updated_at: '2026-03-27T10:10:00Z' }))
    expect(useNotificationsStore.getState().friendRequestCount).toBe(0)
    expect(useNotificationsStore.getState().dirtyVersion).toBe(initialDirty + 3)
  })
})
