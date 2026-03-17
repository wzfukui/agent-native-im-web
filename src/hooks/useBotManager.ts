import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import type { Entity } from '@/lib/types'

export function useBotManager() {
  const { token } = useAuthStore()
  const [botEntities, setBotEntities] = useState<Entity[]>([])
  const [createdCredentials, setCreatedCredentials] = useState<{ entity: Entity; key: string; doc: string } | null>(null)
  const [botListRefresh, setBotListRefresh] = useState(0)

  const loadBotEntities = useCallback(async () => {
    if (!token) return
    const res = await api.listEntities(token)
    if (res.ok && res.data) setBotEntities(Array.isArray(res.data) ? res.data : [])
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
