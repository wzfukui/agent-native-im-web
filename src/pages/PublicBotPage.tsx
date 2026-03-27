import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Loader2, Lock, MessageSquare, Send } from 'lucide-react'
import * as api from '@/lib/api'
import type { Conversation, Entity, Message, PublicBotProfile } from '@/lib/types'

function messageText(message: Message): string {
  return String(message.layers?.summary || message.layers?.thinking || message.layers?.data?.text || '')
}

export function PublicBotPage() {
  const { identifier = '' } = useParams()
  const [searchParams] = useSearchParams()
  const accessCode = searchParams.get('code') || ''
  const [bot, setBot] = useState<PublicBotProfile | null>(null)
  const [loadingBot, setLoadingBot] = useState(true)
  const [sessionToken, setSessionToken] = useState('')
  const [visitor, setVisitor] = useState<Entity | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [guestName, setGuestName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadingBot(true)
    api.getPublicBot(identifier, accessCode || undefined).then((res) => {
      if (cancelled) return
      if (res.ok && res.data?.bot) {
        setBot(res.data.bot)
        setError('')
      } else {
        setError(typeof res.error === 'string' ? res.error : 'bot is not publicly accessible')
      }
      setLoadingBot(false)
    }).catch(() => {
      if (!cancelled) {
        setError('failed to load bot')
        setLoadingBot(false)
      }
    })
    return () => { cancelled = true }
  }, [identifier, accessCode])

  useEffect(() => {
    if (!sessionToken || !conversation) return
    let cancelled = false
    const load = () => {
      api.listMessages(sessionToken, conversation.id).then((res) => {
        if (!cancelled && res.ok && res.data?.messages) {
          setMessages(res.data.messages)
        }
      }).catch(() => {})
    }
    load()
    const timer = window.setInterval(load, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [sessionToken, conversation?.id])

  const title = useMemo(() => bot?.display_name || bot?.bot_id || identifier, [bot, identifier])

  const startSession = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await api.createPublicBotSession(identifier, {
        access_code: accessCode || undefined,
        password: password || undefined,
        display_name: guestName || undefined,
      })
      if (res.ok && res.data) {
        setSessionToken(res.data.token)
        setVisitor(res.data.visitor)
        setConversation(res.data.conversation)
        setMessages([])
      } else {
        setError(typeof res.error === 'string' ? res.error : 'failed to start chat')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const send = async () => {
    if (!sessionToken || !conversation || !draft.trim()) return
    const text = draft.trim()
    setDraft('')
    const res = await api.sendMessage(sessionToken, {
      conversation_id: conversation.id,
      layers: { summary: text },
    })
    if (!res.ok) {
      setError(typeof res.error === 'string' ? res.error : 'failed to send message')
    } else {
      const next = await api.listMessages(sessionToken, conversation.id)
      if (next.ok && next.data?.messages) setMessages(next.data.messages)
    }
  }

  if (loadingBot) {
    return <div className="min-h-screen grid place-items-center bg-[var(--color-bg-primary)]"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" /></div>
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] flex items-center justify-center">
              {bot?.avatar_url ? <img src={bot.avatar_url} alt={title} className="w-full h-full object-cover" /> : <MessageSquare className="w-6 h-6 text-[var(--color-bot)]" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Public Bot Access</p>
              <h1 className="text-2xl font-semibold mt-1">{title}</h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                {sessionToken ? `Public chat session active as ${visitor?.display_name || 'Guest'}.` : 'Start a guest session to talk to this bot without a full platform account.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-[var(--color-error)]/20 bg-[var(--color-error)]/8 px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          {!sessionToken ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Guest name</span>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Guest"
                  className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 text-sm focus:outline-none"
                />
              </label>
              {bot?.require_access_password && (
                <label className="grid gap-2">
                  <span className="text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4" />Access password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 text-sm focus:outline-none"
                  />
                </label>
              )}
              <div className="md:col-span-2">
                <button
                  onClick={startSession}
                  disabled={submitting}
                  className="h-11 rounded-2xl bg-[var(--color-accent)] px-5 text-sm font-medium text-white inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  Start Chat
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
              <div className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">No messages yet. Send the first one.</p>
                ) : messages.map((message) => {
                  const mine = message.sender_id === visitor?.id
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${mine ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]'}`}>
                        <p className="text-[11px] opacity-70 mb-1">{mine ? 'You' : (message.sender?.display_name || 'Bot')}</p>
                        <p className="whitespace-pre-wrap break-words">{messageText(message)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-[var(--color-border)] p-4 flex gap-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
                  placeholder="Type your message"
                  className="flex-1 h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 text-sm focus:outline-none"
                />
                <button
                  onClick={() => void send()}
                  disabled={!draft.trim()}
                  className="w-11 h-11 rounded-2xl bg-[var(--color-accent)] text-white inline-flex items-center justify-center disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
