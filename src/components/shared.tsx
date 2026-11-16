// Shared UI primitives used across SteelFlow views

import { FlaskConical, CheckCircle2, Clock, AlertTriangle, PauseCircle, ClipboardCheck, Ban } from 'lucide-react'
import type { MilestoneStatus, ApprovalStatus, PaymentStatus } from '../data/types'

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmtUSDC(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Simulated data badge ─────────────────────────────────────────────────────

/** Inline pill shown next to any simulated (non-on-chain) value */
export function SimBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${className}`}
      style={{
        background: 'rgba(245,158,11,0.12)',
        color: '#f59e0b',
        border: '1px solid rgba(245,158,11,0.25)',
        letterSpacing: '0.06em',
      }}
      title="This value is demo data — no real on-chain transaction has occurred"
    >
      <FlaskConical size={9} />
      Demo
    </span>
  )
}

// ─── Milestone status config ──────────────────────────────────────────────────

export const MILESTONE_STATUS: Record<
  MilestoneStatus,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  completed:   { label: 'Completed',   color: '#8dd89f', bg: 'rgba(141,216,159,0.12)', Icon: CheckCircle2 },
  in_progress: { label: 'In Progress', color: '#acc6e9', bg: 'rgba(172,198,233,0.12)', Icon: Clock },
  pending:     { label: 'Pending',     color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', Icon: Clock },
  overdue:     { label: 'Overdue',     color: '#e86d7a', bg: 'rgba(232,109,122,0.12)', Icon: AlertTriangle },
  on_hold:     { label: 'On Hold',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  Icon: PauseCircle },
}

// ─── Approval status config ───────────────────────────────────────────────────

export const APPROVAL_STATUS: Record<
  ApprovalStatus,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  approved:           { label: 'Approved',          color: '#8dd89f', bg: 'rgba(141,216,159,0.12)', Icon: CheckCircle2 },
  pending_inspection: { label: 'Pending Inspection', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', Icon: Clock },
  inspection_booked:  { label: 'Booked',             color: '#acc6e9', bg: 'rgba(172,198,233,0.12)', Icon: ClipboardCheck },
  rejected:           { label: 'Rejected',           color: '#e86d7a', bg: 'rgba(232,109,122,0.12)', Icon: Ban },
  not_required:       { label: 'N/A',                color: '#475569', bg: 'rgba(71,85,105,0.10)',   Icon: ClipboardCheck },
}

// ─── Payment status config ────────────────────────────────────────────────────

export const PAYMENT_STATUS_CFG: Record<
  PaymentStatus,
  { label: string; color: string }
> = {
  paid:       { label: 'Paid',       color: '#8dd89f' },
  pending:    { label: 'Pending',    color: '#94a3b8' },
  processing: { label: 'Processing', color: '#acc6e9' },
  failed:     { label: 'Failed',     color: '#e86d7a' },
}

// ─── Segmented payment progress bar ──────────────────────────────────────────

interface ProgressBarProps {
  total: number
  paid: number
  processing: number
  height?: string
}

export function PaymentProgressBar({ total, paid, processing, height = '6px' }: ProgressBarProps) {
  if (total === 0) return null
  const paidPct  = (paid / total) * 100
  const procPct  = (processing / total) * 100
  return (
    <div
      className="rounded-full overflow-hidden flex w-full"
      style={{ background: 'var(--surface-strong)', height }}
    >
      <div style={{ width: `${paidPct}%`, background: 'var(--success)', flexShrink: 0 }} />
      {processing > 0 && (
        <div style={{ width: `${procPct}%`, background: 'var(--accent)', opacity: 0.65, flexShrink: 0 }} />
      )}
    </div>
  )
}
