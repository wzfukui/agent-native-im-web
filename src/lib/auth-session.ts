type SessionHooks = {
  getToken: () => string | null
  setToken: (token: string) => void
  onAuthFailure: () => void
}

let hooks: SessionHooks | null = null

export function setSessionHooks(next: SessionHooks) {
  hooks = next
}

export function getSessionHooks(): SessionHooks | null {
  return hooks
}
