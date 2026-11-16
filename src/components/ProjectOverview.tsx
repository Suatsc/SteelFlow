import { MapPin, Calendar, Users, CheckCircle2, Clock, AlertTriangle, HardHat, Layers } from 'lucide-react'
import { PROJECTS, STAGE_META } from '../data/sampleData'
import { fmtUSDC, fmtDate, PaymentProgressBar, SimBadge } from './shared'
import DemoNotice from './DemoNotice'
import type { LivePayment } from '../data/livePayments'

const PROJECT_TYPE_LABEL = {
  commercial:     'Commercial',
  infrastructure: 'Infrastructure',
  residential:    'Residential',
  industrial:     'Industrial',
}

const STATUS_STYLE = {
  active:    { color: '#8dd89f', bg: 'rgba(141,216,159,0.12)', label: 'Active'    },
  completed: { color: '#acc6e9', bg: 'rgba(172,198,233,0.12)', label: 'Completed' },
  paused:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Paused'    },
}

interface ProjectOverviewProps {
  livePayments: LivePayment[]
}

export default function ProjectOverview({ livePayments }: ProjectOverviewProps) {
  const allMs = PROJECTS.flatMap(p => p.milestones)

  // ── Totals: combine simulated demo data with real on-chain transactions ─────
  const contractValue    = allMs.reduce((s, m) => s + m.paymentAmount, 0)
  // Demo "paid" from static records
  const simPaid          = PROJECTS.reduce((s, p) => s + p.paidOut, 0)
  // Real on-chain confirmed this session
  const livePaid         = livePayments.reduce((s, p) => s + p.amount, 0)
  // Combined
  const amountPaid       = simPaid + livePaid
  const amountProc       = allMs.filter(m => m.paymentStatus === 'processing').reduce((s, m) => s + m.paymentAmount, 0)
  const amountRemain     = Math.max(0, contractValue - amountPaid - amountProc)
  const totalMs          = allMs.length
  const completedMs      = allMs.filter(m => m.status === 'completed').length
  const overdueMs        = allMs.filter(m => m.status === 'overdue').length
  const rejectedAppr     = allMs.filter(m => m.approvalStatus === 'rejected').length

  return (
    <div className="flex flex-col gap-5">
      <DemoNotice />

      {/* Hero financial summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Total contract value</p>
          <p className="mono text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUSDC(contractValue)}</p>
          <p className="text-xs" style={{ color: 'var(--accent)' }}>{PROJECTS.length} projects · {totalMs} milestones</p>
        </div>

        {/* Amount paid: shows live vs demo breakdown when both exist */}
        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
            Amount paid
            {livePaid > 0 && (
              <span className="rounded-full px-1.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(141,216,159,0.15)', color: '#8dd89f' }}>
                {livePayments.length} on-chain
              </span>
            )}
          </p>
          <p className="mono text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUSDC(amountPaid)}</p>
          {livePaid > 0 ? (
            <div className="flex flex-col gap-0.5 text-xs">
              <span style={{ color: '#8dd89f' }}>{fmtUSDC(livePaid)} confirmed on-chain</span>
              <span className="flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
                + {fmtUSDC(simPaid)} <SimBadge className="scale-90 origin-left" />
              </span>
            </div>
          ) : (
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--subtle)' }}>
              {((amountPaid / contractValue) * 100).toFixed(1)}% of contract <SimBadge className="scale-90 origin-left" />
            </p>
          )}
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--subtle)' }}>In processing <SimBadge className="scale-90 origin-left" /></p>
          <p className="mono text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUSDC(amountProc)}</p>
          <p className="text-xs" style={{ color: 'var(--accent)' }}>submitted, not confirmed (demo)</p>
        </div>

        <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>Remaining</p>
          <p className="mono text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUSDC(amountRemain)}</p>
          <p className="text-xs" style={{ color: overdueMs > 0 ? 'var(--danger)' : 'var(--subtle)' }}>
            {completedMs}/{totalMs} milestones done
          </p>
        </div>
      </div>

      {/* Reconciliation + alert row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div
          className="flex-1 rounded-xl px-4 py-3 text-xs"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--subtle)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--muted)' }}>Reconciliation: </span>
          <span className="mono tabular-nums">{fmtUSDC(amountPaid)}</span> paid
          {amountProc > 0 && <> + <span className="mono tabular-nums">{fmtUSDC(amountProc)}</span> processing</>}
          {' '}+ <span className="mono tabular-nums">{fmtUSDC(amountRemain)}</span> remaining
          {' '}= <span className="mono font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>{fmtUSDC(contractValue)}</span>
        </div>
        {(overdueMs > 0 || rejectedAppr > 0) && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs"
            style={{ background: 'rgba(232,109,122,0.08)', border: '1px solid rgba(232,109,122,0.25)', color: 'var(--danger)' }}
          >
            <AlertTriangle size={12} style={{ flexShrink: 0 }} />
            {overdueMs > 0 && <span>{overdueMs} overdue milestone{overdueMs > 1 ? 's' : ''}</span>}
            {overdueMs > 0 && rejectedAppr > 0 && <span>·</span>}
            {rejectedAppr > 0 && <span>{rejectedAppr} failed inspection{rejectedAppr > 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>

      {/* Overall payment bar */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Overall payment progress</p>
          <span className="mono text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
            {fmtUSDC(amountPaid)} / {fmtUSDC(contractValue)}
          </span>
        </div>
        <PaymentProgressBar total={contractValue} paid={amountPaid} processing={amountProc} height="8px" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--subtle)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--success)' }} />
            Paid {((amountPaid / contractValue) * 100).toFixed(1)}%
          </span>
          {amountProc > 0 && (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--subtle)' }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--accent)', opacity: 0.7 }} />
              Processing {((amountProc / contractValue) * 100).toFixed(1)}%
            </span>
          )}
          <span className="ml-auto" style={{ color: 'var(--subtle)' }}>
            {fmtUSDC(amountRemain)} remaining
          </span>
        </div>
      </div>

      {/* Project cards */}
      <div>
        <p className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
          All projects
        </p>
        <div className="flex flex-col gap-3">
          {PROJECTS.map(project => {
            const ms           = project.milestones
            const done         = ms.filter(m => m.status === 'completed').length
            const inProg       = ms.filter(m => m.status === 'in_progress').length
            const overdue      = ms.filter(m => m.status === 'overdue').length
            const onHold       = ms.filter(m => m.status === 'on_hold').length
            const rejected     = ms.filter(m => m.approvalStatus === 'rejected').length
            const msTotal      = ms.reduce((s, m) => s + m.paymentAmount, 0)
            // Combine demo paid + on-chain confirmed for this specific project
            const msSimPaid    = project.paidOut
            const msLivePaid   = livePayments
              .filter(lp => lp.projectId === project.id)
              .reduce((s, lp) => s + lp.amount, 0)
            const msPaid       = msSimPaid + msLivePaid
            const msProc       = ms.filter(m => m.paymentStatus === 'processing').reduce((s, m) => s + m.paymentAmount, 0)
            const msRemain     = Math.max(0, msTotal - msPaid - msProc)
            const { color, bg, label } = STATUS_STYLE[project.status]
            const stageMeta  = STAGE_META[project.currentStage]

            return (
              <div
                key={project.id}
                className="rounded-xl p-5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
                        {project.name}
                      </h3>
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: bg, color }}>
                        {label}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: 'var(--surface-strong)', color: 'var(--subtle)' }}
                      >
                        {PROJECT_TYPE_LABEL[project.projectType]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--subtle)' }}>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {project.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardHat size={10} /> {project.contractor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers size={10} />
                        <span style={{ color: 'var(--accent)' }}>Stage: {stageMeta.label}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                      {fmtUSDC(msTotal)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--subtle)' }}>contract value</p>
                  </div>
                </div>

                <p className="text-sm my-3" style={{ color: 'var(--muted)', lineHeight: 1.55 }}>
                  {project.description}
                </p>

                {/* Segmented payment bar */}
                <PaymentProgressBar total={msTotal} paid={msPaid} processing={msProc} height="6px" />
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 mb-3 text-xs">
                  <span className="tabular-nums flex items-center gap-1" style={{ color: 'var(--success)' }}>
                    {fmtUSDC(msPaid)} paid
                    {msLivePaid === 0 && <SimBadge className="scale-90 origin-left" />}
                    {msLivePaid > 0 && (
                      <span className="rounded-full px-1.5 py-0.5 font-semibold" style={{ background: 'rgba(141,216,159,0.15)', color: '#8dd89f' }}>
                        {fmtUSDC(msLivePaid)} on-chain
                      </span>
                    )}
                  </span>
                  {msProc > 0 && <span className="tabular-nums" style={{ color: 'var(--accent)' }}>{fmtUSDC(msProc)} processing</span>}
                  <span className="tabular-nums ml-auto" style={{ color: 'var(--subtle)' }}>{fmtUSDC(msRemain)} remaining</span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs mb-3" style={{ color: 'var(--subtle)' }}>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={11} />
                    {fmtDate(project.startDate)} → {fmtDate(project.endDate)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={11} />
                    {project.team.length} team member{project.team.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Milestone chips */}
                <div
                  className="flex flex-wrap gap-1.5 pt-3"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <span className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1" style={{ background: 'rgba(141,216,159,0.12)', color: '#8dd89f' }}>
                    <CheckCircle2 size={11} /> {done} done
                  </span>
                  {inProg > 0 && (
                    <span className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1" style={{ background: 'rgba(172,198,233,0.12)', color: 'var(--accent)' }}>
                      <Clock size={11} /> {inProg} in progress
                    </span>
                  )}
                  {overdue > 0 && (
                    <span className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1" style={{ background: 'rgba(232,109,122,0.12)', color: 'var(--danger)' }}>
                      <AlertTriangle size={11} /> {overdue} overdue
                    </span>
                  )}
                  {onHold > 0 && (
                    <span className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                      {onHold} on hold
                    </span>
                  )}
                  {rejected > 0 && (
                    <span className="flex items-center gap-1 text-xs rounded-full px-2.5 py-1" style={{ background: 'rgba(232,109,122,0.12)', color: 'var(--danger)' }}>
                      <AlertTriangle size={11} /> {rejected} inspection failed
                    </span>
                  )}
                  <span className="ml-auto text-xs" style={{ color: 'var(--subtle)' }}>
                    {ms.length} milestones total
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
