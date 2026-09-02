import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'rti-route:driver-emails'

let emails: Record<string, string> = {}
let hydrated = false
const listeners = new Set<() => void>()

function hydrate() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) emails = JSON.parse(raw) as Record<string, string>
  } catch {
    emails = {}
  }
}

function persist() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(emails))
  } catch {
    /* storage unavailable — keep in memory only */
  }
}

export function setDriverEmail(truckId: string, email: string) {
  hydrate()
  emails = { ...emails, [truckId]: email }
  persist()
  listeners.forEach((l) => l())
}

export function getDriverEmails() {
  hydrate()
  return emails
}

export function useDriverEmails() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => {
      hydrate()
      return emails
    },
    () => emails,
  )
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}
