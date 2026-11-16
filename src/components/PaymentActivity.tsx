import { useState } from 'react'
import {
  CheckCircle2, Clock, Loader2, XCircle,
  FlaskConical, ChevronDown, ChevronUp, Filter,
  AlertCircle, RefreshCw,
} from 'lucide-react'
import type { PaymentStatus } from '../data/types'
import type { LivePayment } from '../data/livePayments'
import { ALL_PAYMENTS, PROJECTS } from '../data/sampleData'
import { fmtUSDC, fmtDate, SimBadge } from './shared'
import IntegrationStatus from './IntegrationStatus'
import TxDetailPanel from './TxDetailPanel'

// ── Status config for simulated demo records ───────────────────────────────────
// Label names deliberately say "Demo" so there is no ambiguity.
const SIM_STATUS_CFG: Record<PaymentStatus, { label: string; color: string; Icon: React.ElementType }> = {
  paid:       { label: 'Demo – Paid',       color: '#8dd89f', Icon: CheckCircle2 },
  pending:    { label: 'Pending Approval',   color: '#94a3b8', Icon: Clock },
  processing: { label: 'Processing (Demo)',  color: '#acc6e9', Icon: Loader2 },
  failed:     { label: 'Failed',             color: '#e86d7a', Icon: XCircle },
}

interface PaymentActivityProps {
  livePayments: LivePayment[]
}

export default function PaymentActivity({ livePayments }: PaymentActivityProps) {
  const [filterProject, setFilterProject] = useState<string>('all')
  const [showIntegration, setShowIntegration] = useState(false)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

  const projects = Array.from(new Set(ALL_PAYMENTS.map(p => p.projectName)))

  const filteredSim = ALL_PAYMENTS
    .filter(p => filterProject === 'all' || p.projectName === filterProject)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filteredLive = filterProject === 'all'
    ? livePayments
    : livePayments.filter(p => p.projectName === filterProject)

  // ── Totals (single source of truth) ─────────────────────────────────────────
  const allMs            = PROJECTS.flatMap(p => p.milestones)
  const totalMsValue     = allMs.reduce((s, m) => s + m.paymentAmount, 0)
  // Live (on-chain confirmed this session)
  const totalLive        = livePayments.reduce((s, p) => s + p.amount, 0)
  // Simulated demo "paid" records
  const totalSimPaid     = ALL_PAYMENTS.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  // Combined settled
  const totalSettled     = totalSimPaid + totalLive
  // Simulated "processing" records
  const totalProcessing  = ALL_PAYMENTS.filter(p => p.status === 'processing').reduce((s, p) => s + p.amount, 0)
  const totalOutstanding = Math.max(0, totalMsValue - totalSettled - totalProcessing)

  // Status label for a simulated PaymentStatus, mapping to the requested vocabulary
  function simStatusLabel(status: PaymentStatus): string {
    const map: Record<PaymentStatus, string> = {
      paid:       'Approved · Demo paid',
      pending:    'Pending Approval',
      processing: 'Processing',
      failed:     'Failed',
    }
    return map[status]
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── On-chain banner ──────────────────────────────────────────────────── */}
      {livePayments.length > 0 && (() => {
        const confirmed = livePayments.filter(p => p.txStatus === 'confirmed').length
        const pending   = livePayments.filter(p => p.txStatus === 'pending').length
        const failed    = livePayments.filter(p => p.txStatus === 'failed').length
        return (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(141,216,159,0.07)', border: '1px solid rgba(141,216,159,0.28)', color: '#8dd89f' }}
          >
            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div className="flex-1">
              <p className="font-semibold">
                {confirmed > 0 && `${confirmed} confirmed`}
                {confirmed > 0 && pending > 0 && ' · '}
                {pending   > 0 && <span style={{ color: '#acc6e9' }}>{pending} verifying</span>}
                {(confirmed > 0 || pending > 0) && failed > 0 && ' · '}
                {failed    > 0 && <span style={{ color: 'var(--danger)' }}>{failed} failed</span>}
                {' '}on Arc Testnet
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(141,216,159,0.7)' }}>
                Records are persisted to local storage and survive page reloads.
                {pending > 0 && ' Pending records are being re-verified against the chain.'}
                {' '}Expand any row to see full details and Explorer link.
              </p>
            </div>
          </div>
        )
      })()}

      {/* ── Demo data banner ────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
      >
        <FlaskConical size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p className="font-semibold">Historic records are simulated demo data — no real transactions.</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(245,158,11,0.72)' }}>
            The "Demo" label appears on every simulated record. Only rows in the
            "On-chain" section above represent real Arc Testnet transactions.
          </p>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1 flex items-center gap-1.5" style={{ color: 'var(--subtle)' }}>
            Confirmed on-chain
            {livePayments.length > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums"
                style={{ background: 'rgba(141,216,159,0.15)', color: '#8dd89f' }}
              >
                {livePayments.length}
              </span>
            )}
          </p>
          <p className="mono text-xl font-bold tabular-nums" style={{ color: '#8dd89f' }}>
            {fmtUSDC(totalLive)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
            {livePayments.length === 0 ? 'No on-chain transactions yet' : 'Arc Testnet · this session'}
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1 flex items-center gap-1.5" style={{ color: 'var(--subtle)' }}>
            Demo paid <SimBadge className="ml-0.5 align-middle" />
          </p>
          <p className="mono text-xl font-bold tabular-nums" style={{ color: 'var(--success)' }}>
            {fmtUSDC(totalSimPaid)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>simulated records only</p>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1 flex items-center gap-1.5" style={{ color: 'var(--subtle)' }}>
            Processing <SimBadge className="ml-0.5 align-middle" />
          </p>
          <p className="mono text-xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
            {fmtUSDC(totalProcessing)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>submitted, not confirmed (demo)</p>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>Outstanding</p>
          <p className="mono text-xl font-bold tabular-nums" style={{ color: 'var(--muted)' }}>
            {fmtUSDC(totalOutstanding)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>milestone obligations unpaid</p>
        </div>
      </div>

      {/* ── Reconciliation footnote ──────────────────────────────────────────── */}
      <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--subtle)' }}>
        <span className="font-semibold" style={{ color: 'var(--muted)' }}>Reconciliation: </span>
        <span className="mono tabular-nums" style={{ color: '#8dd89f' }}>{fmtUSDC(totalLive)}</span>
        <span> on-chain + </span>
        <span className="mono tabular-nums">{fmtUSDC(totalSimPaid)}</span>
        <span> demo paid + </span>
        <span className="mono tabular-nums">{fmtUSDC(totalProcessing)}</span>
        <span> processing + </span>
        <span className="mono tabular-nums">{fmtUSDC(totalOutstanding)}</span>
        <span> outstanding = </span>
        <span className="mono font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>{fmtUSDC(totalMsValue)}</span>
        <span> total milestone value</span>
      </div>

      {/* ── Project filter ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Filter size={12} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
        <span className="text-xs" style={{ color: 'var(--subtle)' }}>Project:</span>
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...projects] as string[]).map(p => (
            <button
              key={p}
              onClick={() => setFilterProject(p)}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all"
              style={{
                background: filterProject === p ? 'rgba(172,198,233,0.2)' : 'var(--surface-strong)',
                color: filterProject === p ? 'var(--accent)' : 'var(--muted)',
                border: filterProject === p ? '1px solid rgba(172,198,233,0.4)' : '1px solid var(--border)',
              }}
            >
              {p === 'all' ? 'All projects' : p}
            </button>
          ))}
        </div>
      </div>

      {/* ── On-chain transactions (this session) ────────────────────────────── */}
      {filteredLive.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(141,216,159,0.3)' }}>
          {/* Section header */}
          {(() => {
            const nConf = filteredLive.filter(p => p.txStatus === 'confirmed').length
            const nPend = filteredLive.filter(p => p.txStatus === 'pending').length
            const nFail = filteredLive.filter(p => p.txStatus === 'failed').length
            const parts: string[] = []
            if (nConf > 0) parts.push(`${nConf} confirmed`)
            if (nPend > 0) parts.push(`${nPend} verifying`)
            if (nFail > 0) parts.push(`${nFail} failed`)
            return (
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(141,216,159,0.06)', borderBottom: '1px solid rgba(141,216,159,0.2)' }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} style={{ color: '#8dd89f' }} />
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8dd89f', letterSpacing: '0.08em' }}>
                    On-chain · Arc Testnet
                  </p>
                </div>
                <span className="text-xs" style={{ color: 'rgba(141,216,159,0.6)' }}>
                  {parts.join(' · ')} · click row to expand
                </span>
              </div>
            )
          })()}

          {/* Rows */}
          {filteredLive.map((lp, i) => {
            const isExpanded = expandedTxId === lp.id
            const isConfirmed = lp.txStatus === 'confirmed'
            const isPending   = lp.txStatus === 'pending'
            const isFailed    = lp.txStatus === 'failed'

            const statusBadge = isConfirmed
              ? { bg: 'rgba(141,216,159,0.12)', color: '#8dd89f',     border: 'rgba(141,216,159,0.25)', Icon: CheckCircle2, label: 'Confirmed' }
              : isPending
              ? { bg: 'rgba(172,198,233,0.10)', color: 'var(--accent)', border: 'rgba(172,198,233,0.25)', Icon: RefreshCw,    label: 'Verifying…' }
              : { bg: 'rgba(232,109,122,0.10)', color: 'var(--danger)', border: 'rgba(232,109,122,0.25)', Icon: XCircle,      label: 'Failed' }

            const iconBg = isConfirmed ? 'rgba(141,216,159,0.12)' : isPending ? 'rgba(172,198,233,0.10)' : 'rgba(232,109,122,0.10)'
            const iconColor = isConfirmed ? '#8dd89f' : isPending ? 'var(--accent)' : 'var(--danger)'
            const StatusRowIcon = statusBadge.Icon

            return (
              <div key={lp.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                  style={{ background: isExpanded ? 'rgba(141,216,159,0.04)' : 'transparent' }}
                  onClick={() => setExpandedTxId(isExpanded ? null : lp.id)}
                  onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                    <StatusRowIcon size={14} style={{ color: iconColor }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{lp.milestoneTitle}</p>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}
                      >
                        <StatusRowIcon size={9} /> {statusBadge.label}
                      </span>
                      {isFailed && (
                        <span className="text-xs" style={{ color: 'var(--danger)' }}>
                          Receipt check failed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs truncate max-w-[130px]" style={{ color: 'var(--subtle)' }}>{lp.projectName}</span>
                      <span style={{ color: 'var(--border)' }}>·</span>
                      <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>{fmtDate(lp.date)}</span>
                      <span style={{ color: 'var(--border)' }}>·</span>
                      <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>
                        {lp.txHash.slice(0, 10)}…{lp.txHash.slice(-6)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                      {fmtUSDC(lp.amount)}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: statusBadge.color }}>
                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {isExpanded ? 'Collapse' : 'Details'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <TxDetailPanel payment={lp} onClose={() => setExpandedTxId(null)} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Simulated / demo transaction list ───────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <FlaskConical size={12} style={{ color: '#f59e0b' }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
              Demo records
            </p>
          </div>
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>{filteredSim.length} records</span>
        </div>

        {filteredSim.map((payment, i) => {
          const { color, Icon } = SIM_STATUS_CFG[payment.status]
          const label = simStatusLabel(payment.status)
          return (
            <div
              key={payment.id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
            >
              {/* Status icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                <Icon size={14} style={{ color }} />
              </div>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{payment.description}</p>
                  <SimBadge />
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs truncate max-w-[150px]" style={{ color: 'var(--subtle)' }}>{payment.projectName}</span>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>{fmtDate(payment.date)}</span>
                  <span style={{ color: 'var(--border)' }}>·</span>
                  <span className="text-xs truncate max-w-[120px]" style={{ color: 'var(--subtle)' }}>{payment.recipient}</span>
                </div>
              </div>

              {/* Amount + status */}
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <span className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                  {fmtUSDC(payment.amount)}
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color }}>
                  <Icon size={10} /> {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Integration status accordion ─────────────────────────────────────── */}
      <div>
        <button
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2 text-left transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          onClick={() => setShowIntegration(v => !v)}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-strong)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface)'}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={13} style={{ color: 'var(--subtle)' }} />
            <span className="text-sm font-medium">Arc Testnet integration status</span>
          </div>
          {showIntegration ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showIntegration && <IntegrationStatus />}
      </div>
    </div>
  )
}
