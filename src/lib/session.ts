const SESSION_KEY = 'cmg_payment_session_expires'
const SESSION_DURATION_MS = 60 * 60 * 1000 // 1 hour

/**
 * Call this IMMEDIATELY after sign-in, before any awaits,
 * to avoid a race condition with onAuthStateChanged.
 */
export function setSessionExpiry(): void {
  localStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_DURATION_MS))
}

export function isSessionExpired(): boolean {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return true
  return Date.now() > parseInt(raw, 10)
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function getRemainingMinutes(): number {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return 0
  const ms = parseInt(raw, 10) - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 60_000)
}
