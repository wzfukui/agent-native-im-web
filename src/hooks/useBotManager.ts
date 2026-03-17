import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { getCachedEntities, cacheEntities } from '@/lib/cache'
import type { Entity } from '@/lib/types'

export function useBotManager() {
  const { token } = useAuthStore()
  const [botEntities, setBotEntities] = useState<Entity[]>([])
  const [createdCredentials, setCreatedCredentials] = useState<{ entity: Entity; key: string; doc: string } | null>(null)
  const [botListRefresh, setBotListRefresh] = useState(0)

  // Load cached entities on first render for instant display
  useEffect(() => {
    getCachedEntities().then((cached) => {
      if (cached.length > 0) setBotEntities(cached)
    })
  }, [])

  const loadBotEntities = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.listEntities(token)
      if (res.ok && res.data) {
        const list = Array.isArray(res.data) ? res.data : []
        setBotEntities(list)
        if (list.length > 0) cacheEntities(list)
      }
    } catch {
      // Network failed — cached data remains visible
    }
  }, [token])

  const handleDisableBot = async (botId: number) => {
    try {
      await api.deleteEntity(token!, botId)
      loadBotEntities()
      setBotListRefresh(prev => prev + 1)
    } catch (error) {
      void error
    }
  }

  const handleReactivateBot = async (botId: number) => {
    try {
      await api.reactivateEntity(token!, botId)
      loadBotEntities()
      setBotListRefresh(prev => prev + 1)
    } catch (error) {
      void error
    }
  }

  const handleHardDeleteBot = async (botId: number) => {
    try {
      await api.deleteEntity(token!, botId)
      loadBotEntities()
      setBotListRefresh(prev => prev + 1)
    } catch (error) {
      void error
    }
  }

  return {
    botEntities,
    createdCredentials,
    setCreatedCredentials,
    botListRefresh,
    loadBotEntities,
    handleDisableBot,
    handleReactivateBot,
    handleHardDeleteBot,
  }
}
