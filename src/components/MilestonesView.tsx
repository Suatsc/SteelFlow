import { useState } from 'react'
import { useAccount } from 'wagmi'
import {
  CheckCircle2, RefreshCw, XCircle,
  ChevronDown, ChevronUp, Filter, ArrowUpDown,
  ClipboardCheck, HardHat, FileText, CreditCard,
  ExternalLink,
} from 'lucide-react'
import type { MilestoneStatus, ApprovalStatus } from '../data/types'
import type { LivePayment, TxStatus } from '../data/livePayments'
import { ALL_MILESTONES, STAGE_META } from '../data/sampleData'
import { fmtUSDC, fmtDate, SimBadge, MILESTONE_STATUS, APPROVAL_STATUS, PAYMENT_STATUS_CFG } from './shared'
import RequestPaymentModal from './RequestPaymentModal'

const ARC_TESTNET_ID = 5042002

// Config for on-chain payment status tiles, keyed by TxStatus
const LIVE_PAYMENT_CFG: Record<TxStatus, {
  label: string; color: string; bg: string; border: string; Icon: React.ElementType
}> = {
  confirmed: {
    label:  'Confirmed on-chain',
    color:  '#8dd89f',
    bg:     'rgba(141,216,159,0.07)',
    border: 'rgba(141,216,159,0.25)',
    Icon:   CheckCircle2,
  },
  pending: {
    label:  'Verifying on-chain…',
    color:  'var(--accent)',
    bg:     'rgba(172,198,233,0.07)',
    border: 'rgba(172,198,233,0.25)',
    Icon:   RefreshCw,
  },
  failed: {
    label:  'Transaction failed',
    color:  'var(--danger)',
    bg:     'rgba(232,109,122,0.07)',
    border: 'rgba(232,109,122,0.25)',
    Icon:   XCircle,
  },
}

type SortKey = 'dueDate' | 'paymentAmount' | 'completion' | 'status'

interface MilestonesViewProps {
  livePayments: LivePayment[]
  onPending: (p: LivePayment) => void
  onConfirmed: (id: string, patch: Partial<LivePayment>) => void
}

const TAG_COLORS: Record<string, string> = {
  structural: 'rgba(172,198,233,0.18)', foundation: 'rgba(172,198,233,0.18)',
  structure: 'rgba(172,198,233,0.18)',  'post-tension': 'rgba(172,198,233,0.18)',
  concrete: 'rgba(172,198,233,0.18)',   geotechnical: 'rgba(172,198,233,0.18)',
  earthworks: 'rgba(148,163,184,0.14)', demolition: 'rgba(148,163,184,0.14)',
  site_prep: 'rgba(148,163,184,0.14)',  temporary: 'rgba(148,163,184,0.14)',
  clearing: 'rgba(148,163,184,0.14)',   utilities: 'rgba(148,163,184,0.14)',
  drainage: 'rgba(141,216,159,0.14)',   environment: 'rgba(141,216,159,0.14)',
  pavement: 'rgba(141,216,159,0.14)',   roof: 'rgba(141,216,159,0.14)',
  roofing: 'rgba(141,216,159,0.14)',    facade: 'rgba(141,216,159,0.14)',
  mep: 'rgba(245,158,11,0.14)',         hvac: 'rgba(245,158,11,0.14)',
  electrical: 'rgba(245,158,11,0.14)', its: 'rgba(245,158,11,0.14)',
  fire: 'rgba(232,109,122,0.14)',       safety: 'rgba(232,109,122,0.14)',
  mobilisation: 'rgba(148,163,184,0.14)', traffic: 'rgba(148,163,184,0.14)',
  commissioning: 'rgba(172,198,233,0.18)', handover: 'rgba(172,198,233,0.18)',
  'fit_out': 'rgba(141,216,159,0.14)', finishes: 'rgba(141,216,159,0.14)',
  finishing: 'rgba(141,216,159,0.14)', defects: 'rgba(148,163,184,0.14)',
  waterproofing: 'rgba(172,198,233,0.18)', seismic: 'rgba(232,109,122,0.14)',
  dsa: 'rgba(232,109,122,0.14)',
}

export default function MilestonesView({ livePayments, onPending, onConfirmed }: MilestonesViewProps) {
  const { chainId, address } = useAccount()
  const isArcTestnet = chainId === ARC_TESTNET_ID

  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortAsc, setSortAsc] = useState(true)
  const [filterStatus, setFilterStatus] = useState<MilestoneStatus | 'all'>('all')
  const [filterApproval, setFilterApproval] = useState<ApprovalStatus | 'all'>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalMilestoneId, setModalMilestoneId] = useState<string | null>(null)

  const projects = Array.from(new Set(ALL_MILESTONES.map(m => m.projectName)))

  const filtered = ALL_MILESTONES
    .filter(m => filterStatus === 'all' || m.status === filterStatus)
    .filter(m => filterApproval === 'all' || m.approvalStatus === filterApproval)
    .filter(m => filterProject === 'all' || m.projectName === filterProject)
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'dueDate')        cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      else if (sortKey === 'paymentAmount') cmp = a.paymentAmount - b.paymentAmount
      else if (sortKey === 'completion') cmp = a.completion - b.completion
      else if (sortKey === 'status')     cmp = a.status.localeCompare(b.status)
      return sortAsc ? cmp : -cmp
    })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  // Build a lookup: milestoneId → confirmed live payments for this milestone
  const liveByMilestone = new Map<string, LivePayment[]>()
  for (const lp of livePayments) {
    const arr = liveByMilestone.get(lp.milestoneId) ?? []
    arr.push(lp)
    liveByMilestone.set(lp.milestoneId, arr)
  }

  const contractValue  = filtered.reduce((s, m) => s + m.paymentAmount, 0)
  // Simulated demo paid (from static paymentStatus)
  const simPaidValue   = filtered.filter(m => m.paymentStatus === 'paid').reduce((s, m) => s + m.paymentAmount, 0)
  // On-chain confirmed live payments for milestones in the filtered set
  const livePaidValue  = filtered.reduce((s, m) => {
    const lps = liveByMilestone.get(m.id) ?? []
    return s + lps.filter(lp => lp.txStatus === 'confirmed').reduce((a, lp) => a + lp.amount, 0)
  }, 0)
  const paidValue      = simPaidValue + livePaidValue
  const processingVal  = filtered.filter(m => m.paymentStatus === 'processing').reduce((s, m) => s + m.paymentAmount, 0)
  const remainVal      = Math.max(0, contractValue - paidValue - processingVal)
  const overdueCount   = filtered.filter(m => m.status === 'overdue').length
  const rejectedCount  = filtered.filter(m => m.approvalStatus === 'rejected').length

  // Group by work stage preserving sort within each group? No — show a flat list with stage label inlined
  // Group milestones by stage for the "by stage" grouping header
  const stageOrder = filtered.reduce<Map<string, typeof filtered>>((acc, m) => {
    if (!acc.has(m.workStage)) acc.set(m.workStage, [])
    acc.get(m.workStage)!.push(m)
    return acc
  }, new Map())

  const groupedEntries = Array.from(stageOrder.entries()).sort(([a], [b]) => {
    const oa = STAGE_META[a]?.order ?? 99
    const ob = STAGE_META[b]?.order ?? 99
    return oa - ob
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Contract value */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>Milestone contract value</p>
          <p className="mono text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUSDC(contractValue)}</p>
        </div>

        {/* Amount paid: live + demo breakdown */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
            Amount paid
            {livePaidValue > 0 && (
              <span className="rounded-full px-1.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(141,216,159,0.15)', color: '#8dd89f' }}>
                on-chain
              </span>
            )}
          </p>
          <p className="mono text-xl font-bold tabular-nums" style={{ color: 'var(--success)' }}>{fmtUSDC(paidValue)}</p>
          {livePaidValue > 0 ? (
            <div className="flex flex-col gap-0.5 text-xs mt-1">
              <span style={{ color: '#8dd89f' }}>{fmtUSDC(livePaidValue)} on-chain</span>
              <span className="flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
                + {fmtUSDC(simPaidValue)} <SimBadge className="scale-90 origin-left" />
              </span>
            </div>
          ) : (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
              demo data <SimBadge className="scale-90 origin-left" />
            </p>
          )}
        </div>

        {/* Remaining */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>Remaining</p>
          <p className="mono text-xl font-bold tabular-nums" style={{ color: 'var(--muted)' }}>{fmtUSDC(remainVal)}</p>
        </div>

        {/* Issues */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: overdueCount > 0 ? 'var(--danger)' : 'var(--subtle)' }}>
            {overdueCount > 0 ? `${overdueCount} overdue · ${rejectedCount} rejected` : 'No issues'}
          </p>
          <p className="mono text-xl font-bold tabular-nums" style={{ color: overdueCount > 0 ? 'var(--danger)' : 'var(--subtle)' }}>
            {filtered.length} shown
          </p>
        </div>
      </div>

      {processingVal > 0 && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.22)', color: 'var(--accent)' }}>
          <span className="mono tabular-nums font-semibold">{fmtUSDC(processingVal)}</span>
          <span style={{ color: 'var(--muted)' }}>in processing — payment submitted, awaiting confirmation</span>
          <SimBadge className="ml-auto" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Filter size={12} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
        <span className="text-xs mr-1" style={{ color: 'var(--subtle)' }}>Filter:</span>

        {/* Status */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'completed', 'in_progress', 'pending', 'overdue', 'on_hold'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all"
              style={{
                background: filterStatus === s ? 'rgba(172,198,233,0.2)' : 'var(--surface-strong)',
                color: filterStatus === s ? 'var(--accent)' : 'var(--muted)',
                border: filterStatus === s ? '1px solid rgba(172,198,233,0.4)' : '1px solid var(--border)',
              }}
            >
              {s === 'all' ? 'All status' : MILESTONE_STATUS[s].label}
            </button>
          ))}
        </div>

        {/* Approval filter */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'rejected', 'pending_inspection'] as const).map(s => (
            <button key={s} onClick={() => setFilterApproval(s)}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all"
              style={{
                background: filterApproval === s ? 'rgba(172,198,233,0.2)' : 'var(--surface-strong)',
                color: filterApproval === s ? 'var(--accent)' : 'var(--muted)',
                border: filterApproval === s ? '1px solid rgba(172,198,233,0.4)' : '1px solid var(--border)',
              }}
            >
              {s === 'all' ? 'All approvals' : APPROVAL_STATUS[s].label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>Project:</span>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="text-xs rounded-lg px-2 py-1 outline-none"
            style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            <option value="all">All projects</option>
            {projects.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Grouped table by work stage */}
      {groupedEntries.length === 0 && (
        <div className="py-12 text-center rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--subtle)' }}>
          No milestones match the current filters.
        </div>
      )}

      {groupedEntries.map(([stage, milestones]) => {
        const stageMeta = STAGE_META[stage] ?? { label: stage, shortLabel: stage }
        return (
          <div key={stage} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {/* Stage header */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
                  {stageMeta.label}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: 'var(--surface-strong)', color: 'var(--subtle)' }}
                >
                  {milestones.length} milestone{milestones.length > 1 ? 's' : ''}
                </span>
              </div>
              {/* Sortable column headers (first stage only renders these visually) */}
              <div className="hidden sm:flex items-center gap-6 text-xs mr-2">
                <SortHeader label="Due" sortKey="dueDate" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                <SortHeader label="Value" sortKey="paymentAmount" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                <SortHeader label="Progress" sortKey="completion" current={sortKey} asc={sortAsc} onClick={toggleSort} />
              </div>
            </div>

            {/* Column headers */}
            <div
              className="hidden sm:grid text-xs font-semibold px-4 py-2.5"
              style={{
                gridTemplateColumns: '2fr 1fr 110px 80px 110px 100px 40px',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--subtle)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>Milestone</span>
              <span>Due date</span>
              <span>Value</span>
              <span>Progress</span>
              <span>Work status</span>
              <span>Approval</span>
              <span></span>
            </div>

            {/* Rows */}
            {milestones.map((m, i) => {
              const ms       = MILESTONE_STATUS[m.status]
              const MsIcon   = ms.Icon
              const apr      = APPROVAL_STATUS[m.approvalStatus]
              const AprIcon  = apr.Icon
              const pay      = PAYMENT_STATUS_CFG[m.paymentStatus]
              const isExpanded = expandedId === m.id
              // Live payment records for this specific milestone
              const msLive   = liveByMilestone.get(m.id) ?? []
              // Best live record: prefer confirmed, else most recent
              const bestLive = msLive.find(lp => lp.txStatus === 'confirmed')
                            ?? msLive.find(lp => lp.txStatus === 'pending')
                            ?? msLive[0] ?? null

              return (
                <div key={m.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    className="w-full text-left transition-colors"
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                      background: isExpanded ? 'rgba(172,198,233,0.05)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {/* Mobile layout */}
                    <div className="sm:hidden px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{m.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                            {m.projectName} · {m.contractor}
                          </p>
                        </div>
                        <span className="mono text-sm font-semibold tabular-nums shrink-0" style={{ color: 'var(--ink)' }}>
                          {fmtUSDC(m.paymentAmount)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: ms.bg, color: ms.color }}>
                          <MsIcon size={10} />{ms.label}
                        </span>
                        <span className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: apr.bg, color: apr.color }}>
                          <AprIcon size={10} />{apr.label}
                        </span>
                        {bestLive ? (() => {
                          const cfg = LIVE_PAYMENT_CFG[bestLive.txStatus]
                          const BIcon = cfg.Icon
                          return (
                            <span className="flex items-center gap-1 rounded-full px-2 py-0.5"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              <BIcon size={10} />{cfg.label}
                            </span>
                          )
                        })() : (
                          <>
                            <span className="tabular-nums" style={{ color: pay.color }}>{pay.label}</span>
                            {m.paymentStatus !== 'pending' && <SimBadge />}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Desktop grid */}
                    <div
                      className="hidden sm:grid items-center gap-2 px-4 py-3.5"
                      style={{ gridTemplateColumns: '2fr 1fr 110px 80px 110px 100px 40px' }}
                    >
                      {/* Title */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp size={12} style={{ color: 'var(--subtle)', flexShrink: 0 }} /> : <ChevronDown size={12} style={{ color: 'var(--subtle)', flexShrink: 0 }} />}
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{m.title}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-5">
                          <HardHat size={9} style={{ color: 'var(--subtle)' }} />
                          <span className="text-xs truncate" style={{ color: 'var(--subtle)' }}>{m.contractor}</span>
                          {m.permitRef && (
                            <>
                              <span style={{ color: 'var(--border)' }}>·</span>
                              <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>{m.permitRef}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Due date */}
                      <div>
                        <span className="text-sm tabular-nums" style={{ color: 'var(--ink-2)' }}>{fmtDate(m.dueDate)}</span>
                        {m.completedDate && (
                          <p className="text-xs tabular-nums mt-0.5" style={{ color: 'var(--success)' }}>
                            Done {fmtDate(m.completedDate)}
                          </p>
                        )}
                      </div>

                      {/* Value */}
                      <div className="flex flex-col gap-0.5">
                        <span className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                          {fmtUSDC(m.paymentAmount)}
                        </span>
                        <span className="text-xs" style={{ color: pay.color }}>{pay.label}</span>
                      </div>

                      {/* Progress */}
                      <div className="flex flex-col gap-1">
                        <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{m.completion}%</span>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-strong)' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${m.completion}%`, background: m.completion === 100 ? 'var(--success)' : 'var(--accent)' }} />
                        </div>
                      </div>

                      {/* Work status */}
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium w-fit"
                        style={{ background: ms.bg, color: ms.color }}
                      >
                        <MsIcon size={10} /> {ms.label}
                      </div>

                      {/* Approval */}
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium w-fit"
                        style={{ background: apr.bg, color: apr.color }}
                      >
                        <AprIcon size={10} /> {apr.label}
                      </div>

                      {/* Payment badge: on-chain chip or SimBadge */}
                      <div className="flex justify-center">
                        {bestLive ? (() => {
                          const cfg = LIVE_PAYMENT_CFG[bestLive.txStatus]
                          const BIcon = cfg.Icon
                          return (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                              title={`${cfg.label} — ${fmtUSDC(bestLive.amount)} USDC`}
                            >
                              <BIcon size={9} />
                            </span>
                          )
                        })() : m.paymentStatus !== 'pending' ? <SimBadge /> : null}
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      className="px-6 pb-5 pt-2"
                      style={{ borderTop: '1px solid var(--border)', background: 'rgba(172,198,233,0.04)' }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                        {/* Description + tags */}
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>Description</p>
                          <p className="text-sm" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{m.description}</p>
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {m.tags.map(tag => (
                              <span key={tag} className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{ background: TAG_COLORS[tag] ?? 'var(--surface-strong)', color: 'var(--muted)' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Inspector info */}
                          {(m.inspectorName || m.inspectionDate) && (
                            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
                              <ClipboardCheck size={12} style={{ color: apr.color, flexShrink: 0 }} />
                              {m.inspectorName && <span>{m.inspectorName}</span>}
                              {m.inspectionDate && <span>— {fmtDate(m.inspectionDate)}</span>}
                              <span
                                className="rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{ background: apr.bg, color: apr.color }}
                              >
                                {apr.label}
                              </span>
                            </div>
                          )}

                          {m.permitRef && (
                            <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--subtle)' }}>
                              <FileText size={12} style={{ flexShrink: 0 }} />
                              Permit: <span className="mono">{m.permitRef}</span>
                            </div>
                          )}
                        </div>

                        {/* Deliverables */}
                        <div>
                          <p className="text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>Deliverables</p>
                          <ul className="flex flex-col gap-1">
                            {m.deliverables.map((d, di) => (
                              <li key={di} className="flex items-start gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--subtle)' }} />
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Dependencies */}
                      {m.dependencies.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>Dependencies</p>
                          <div className="flex flex-wrap gap-1.5">
                            {m.dependencies.map(depId => {
                              const dep = ALL_MILESTONES.find(x => x.id === depId)
                              return dep ? (
                                <span key={depId} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                                  style={{ background: 'var(--surface-strong)', color: 'var(--muted)' }}
                                >
                                  <CheckCircle2 size={10} style={{ color: dep.status === 'completed' ? 'var(--success)' : 'var(--subtle)' }} />
                                  {dep.title}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      )}

                      {/* Live payment records for this milestone */}
                      {msLive.map(lp => {
                        const cfg  = LIVE_PAYMENT_CFG[lp.txStatus]
                        const LIcon = cfg.Icon
                        return (
                          <div
                            key={lp.id}
                            className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3 text-xs"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                          >
                            <LIcon size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold" style={{ color: cfg.color }}>
                                  {cfg.label}
                                </span>
                                <span style={{ color: 'var(--subtle)' }}>
                                  {fmtUSDC(lp.amount)} USDC · Arc Testnet · {lp.date}
                                </span>
                              </div>
                              {lp.txStatus === 'confirmed' && lp.transferLogFound === true && (
                                <p className="mt-0.5" style={{ color: '#8dd89f' }}>
                                  USDC Transfer event verified in receipt
                                </p>
                              )}
                              {lp.txStatus === 'confirmed' && lp.transferLogFound === false && (
                                <p className="mt-0.5" style={{ color: 'var(--danger)' }}>
                                  Receipt confirmed but Transfer event not found in logs
                                </p>
                              )}
                              <p className="mono truncate mt-0.5" style={{ color: 'var(--subtle)' }}>
                                {lp.txHash}
                              </p>
                            </div>
                            <a
                              href={lp.arcExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium"
                              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink size={10} /> Explorer
                            </a>
                          </div>
                        )
                      })}

                      {/* Request Payment / testnet note row */}
                      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Testnet note */}
                        <div className="flex-1 flex items-start gap-2 text-xs rounded-lg px-3 py-2"
                          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', color: 'rgba(245,158,11,0.75)' }}>
                          <span className="shrink-0 mt-0.5">⬡</span>
                          <span>
                            Future: a MilestoneEscrow contract would release <strong className="font-semibold">{fmtUSDC(m.paymentAmount)} USDC</strong> automatically on inspector approval.
                            For now, use "Request Payment" to send a direct test USDC transfer.
                          </span>
                        </div>

                        {/* Request Payment button — only for non-paid milestones */}
                        {m.paymentStatus !== 'paid' && (
                          <button
                            onClick={e => { e.stopPropagation(); setModalMilestoneId(m.id) }}
                            className="shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors"
                            style={{
                              background: address && isArcTestnet ? 'var(--accent)' : 'var(--surface-strong)',
                              color: address && isArcTestnet ? '#0d1b2f' : 'var(--subtle)',
                              border: address && isArcTestnet ? 'none' : '1px solid var(--border)',
                              cursor: 'pointer',
                            }}
                            title={!address ? 'Connect wallet to send payment' : !isArcTestnet ? 'Switch to Arc Testnet' : 'Send test USDC for this milestone'}
                          >
                            <CreditCard size={12} />
                            {!address ? 'Connect wallet' : !isArcTestnet ? 'Switch to Arc Testnet' : 'Request Payment'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Request Payment Modal */}
      {modalMilestoneId && (() => {
        const ms = ALL_MILESTONES.find(m => m.id === modalMilestoneId)
        if (!ms) return null
        return (
          <RequestPaymentModal
            milestone={ms}
            projectName={ms.projectName}
            onClose={() => setModalMilestoneId(null)}
            onPending={p => { onPending(p) }}
            onConfirmed={(id, patch) => { onConfirmed(id, patch) }}
          />
        )
      })()}
    </div>
  )
}

function SortHeader({ label, sortKey, current, asc, onClick }: { label: string; sortKey: SortKey; current: SortKey; asc: boolean; onClick: (k: SortKey) => void }) {
  const active = current === sortKey
  return (
    <button onClick={() => onClick(sortKey)} className="flex items-center gap-1"
      style={{ color: active ? 'var(--accent)' : 'var(--subtle)' }}>
      {label}
      {active ? (asc ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ArrowUpDown size={10} style={{ opacity: 0.5 }} />}
    </button>
  )
}
