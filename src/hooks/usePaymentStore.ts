/**
 * usePaymentStore
 *
 * Persists LivePayment records to localStorage under STORAGE_KEY.
 * Loads existing records on first mount. Exposes add, update, and clear.
 *
 * Storage format: JSON array of LivePayment objects.
 * No sensitive data is stored — only public on-chain facts (tx hashes,
 * addresses, amounts, timestamps) and user-entered milestone metadata.
 *
 * On corrupt/unreadable data the store silently starts empty rather than
 * crashing the app.
 */
import { useState, useEffect, useCallback } from 'react'
import type { LivePayment } from '../data/livePayments'

const STORAGE_KEY = 'steelflow_live_payments_v1'

function loadFromStorage(): LivePayment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Basic shape check — must have at least id + txHash
    return parsed.filter(
      (item): item is LivePayment =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).txHash === 'string',
    )
  } catch {
    return []
  }
}

function saveToStorage(payments: LivePayment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payments))
  } catch {
    // Quota exceeded or private-browsing — degrade gracefully (in-memory only)
  }
}

export interface PaymentStore {
  payments: LivePayment[]
  /** Prepend a new record and persist. */
  add: (payment: LivePayment) => void
  /** Patch one record by id and persist. */
  update: (id: string, patch: Partial<LivePayment>) => void
  /** Remove all records from state and storage. */
  clear: () => void
}

export function usePaymentStore(): PaymentStore {
  const [payments, setPayments] = useState<LivePayment[]>(() => loadFromStorage())

  // Keep storage in sync whenever payments change
  useEffect(() => {
    saveToStorage(payments)
  }, [payments])

  const add = useCallback((payment: LivePayment) => {
    setPayments(prev => {
      // Guard against double-adds (e.g. StrictMode)
      if (prev.some(p => p.id === payment.id)) return prev
      return [payment, ...prev]
    })
  }, [])

  const update = useCallback((id: string, patch: Partial<LivePayment>) => {
    setPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, ...patch } : p)),
    )
  }, [])

  const clear = useCallback(() => {
    setPayments([])
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  return { payments, add, update, clear }
}
