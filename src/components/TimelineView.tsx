import { useState } from 'react'
import { CheckCircle2, Circle, Clock, AlertTriangle, PauseCircle, ClipboardCheck, Ban, MapPin } from 'lucide-react'
import type { MilestoneStatus, ApprovalStatus } from '../data/types'
import { PROJECTS, STAGE_META } from '../data/sampleData'
import { fmtUSDC, fmtShort, fmtDate, SimBadge, MILESTONE_STATUS, APPROVAL_STATUS } from './shared'

const PROJECT_ACCENTS = ['#acc6e9', '#8dd89f', '#f59e0b']

const STATUS_CFG: Record<MilestoneStatus, { color: string; Icon: React.ElementType; label: string }> = {
  completed:   { color: '#8dd89f', Icon: CheckCircle2, label: 'Completed'   },
  in_progress: { color: '#acc6e9', Icon: Clock,        label: 'In Progress' },
  pending:     { color: '#94a3b8', Icon: Circle,       label: 'Pending'     },
  overdue:     { color: '#e86d7a', Icon: AlertTriangle,label: 'Overdue'     },
  on_hold:     { color: '#f59e0b', Icon: PauseCircle,  label: 'On Hold'     },
}

const APPROVAL_ICON: Record<ApprovalStatus, React.ElementType> = {
  approved:           CheckCircle2,
  pending_inspection: Clock,
  inspection_booked:  ClipboardCheck,
  rejected:           Ban,
  not_required:       Circle,
}

const TODAY = '2026-10-11'  // demo "today" matches dataset

export default function TimelineView() {
  const [selectedProject, setSelectedProject] = useState<string>('all')

  const displayProjects = selectedProject === 'all'
    ? PROJECTS
    : PROJECTS.filter(p => p.id === selectedProject)

  return (
    <div className="flex flex-col gap-5">
      {/* Legend + project filter */}
      <div
        className="flex flex-wrap items-center gap-4 rounded-xl px-4 py-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex flex-wrap items-center gap-3 mr-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
            Status
          </span>
          {(Object.entries(STATUS_CFG) as [MilestoneStatus, typeof STATUS_CFG[MilestoneStatus]][]).map(([key, cfg]) => {
            const Icon = cfg.Icon
            return (
              <span key={key} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                <Icon size={11} style={{ color: cfg.color }} />
                {cfg.label}
              </span>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--subtle)' }}>Show:</span>
          <div className="flex gap-1.5">
            {[{ id: 'all', label: 'All' }, ...PROJECTS.map(p => ({ id: p.id, label: p.name.split(' ').slice(0, 2).join(' ') }))].map(opt => (
              <button key={opt.id} onClick={() => setSelectedProject(opt.id)}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-all"
                style={{
                  background: selectedProject === opt.id ? 'rgba(172,198,233,0.2)' : 'var(--surface-strong)',
                  color: selectedProject === opt.id ? 'var(--accent)' : 'var(--muted)',
                  border: selectedProject === opt.id ? '1px solid rgba(172,198,233,0.35)' : '1px solid var(--border)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Today marker info */}
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs"
        style={{ background: 'rgba(172,198,233,0.07)', border: '1px solid rgba(172,198,233,0.18)', color: 'var(--accent)' }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
        <span>Today: <strong className="font-semibold">{fmtDate(TODAY)}</strong></span>
        <span className="hidden sm:block" style={{ color: 'var(--muted)' }}>—</span>
        <span className="hidden sm:block" style={{ color: 'var(--muted)' }}>
          Milestones past their due date without completion are shown as overdue.
        </span>
      </div>

      {/* Per-project timelines */}
      {displayProjects.map((project, pi) => {
        const accentColor = PROJECT_ACCENTS[pi % PROJECT_ACCENTS.length]

        // Group milestones by work stage
        const stageGroups = project.milestones.reduce<Map<string, typeof project.milestones>>((acc, m) => {
          if (!acc.has(m.workStage)) acc.set(m.workStage, [])
          acc.get(m.workStage)!.push(m)
          return acc
        }, new Map())

        const sortedGroups = Array.from(stageGroups.entries()).sort(([a], [b]) => {
          return (STAGE_META[a]?.order ?? 99) - (STAGE_META[b]?.order ?? 99)
        })

        const msTotal  = project.milestones.reduce((s, m) => s + m.paymentAmount, 0)
        const msPaid   = project.paidOut
        const msRemain = msTotal - msPaid
        const done     = project.milestones.filter(m => m.status === 'completed').length

        return (
          <div key={project.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {/* Project header */}
            <div
              className="px-5 py-4"
              style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: accentColor }} />
                    <span className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>{project.name}</span>
                    <span className="text-xs" style={{ color: 'var(--subtle)' }}>{project.client}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--subtle)' }}>
                    <span className="flex items-center gap-1"><MapPin size={10} />{project.location}</span>
                    <span>{fmtDate(project.startDate)} → {fmtDate(project.endDate)}</span>
                    <span style={{ color: 'var(--accent)' }}>Stage: {STAGE_META[project.currentStage]?.label}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                    {fmtUSDC(msPaid)} / {fmtUSDC(msTotal)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                    {done}/{project.milestones.length} milestones · {fmtUSDC(msRemain)} remaining
                  </p>
                </div>
              </div>
            </div>

            {/* Work stages */}
            {sortedGroups.map(([stage, milestones]) => {
              const stageMeta = STAGE_META[stage] ?? { label: stage }
              const allDone = milestones.every(m => m.status === 'completed')

              return (
                <div key={stage} style={{ borderTop: '1px solid var(--border)' }}>
                  {/* Stage label */}
                  <div
                    className="flex items-center gap-2 px-5 py-2"
                    style={{ background: allDone ? 'rgba(141,216,159,0.05)' : 'transparent' }}
                  >
                    <div
                      className="w-1 h-4 rounded-full shrink-0"
                      style={{ background: allDone ? 'var(--success)' : accentColor, opacity: allDone ? 0.6 : 0.4 }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                      {stageMeta.label}
                    </span>
                    {allDone && (
                      <CheckCircle2 size={11} style={{ color: 'var(--success)' }} />
                    )}
                  </div>

                  {/* Milestones in this stage */}
                  <div className="px-5 pb-3 flex flex-col gap-0">
                    {milestones.map((milestone, mi) => {
                      const { color, Icon } = STATUS_CFG[milestone.status]
                      const AprIcon = APPROVAL_ICON[milestone.approvalStatus]
                      const aprCfg  = APPROVAL_STATUS[milestone.approvalStatus]
                      const isLast  = mi === milestones.length - 1
                      const isPastDue = !milestone.completedDate && milestone.dueDate < TODAY

                      return (
                        <div key={milestone.id} className="flex gap-4">
                          {/* Spine */}
                          <div className="flex flex-col items-center" style={{ width: '22px', flexShrink: 0 }}>
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center z-10 mt-0.5"
                              style={{
                                background: milestone.status === 'completed' ? 'rgba(141,216,159,0.15)' : 'var(--surface-strong)',
                                border: `2px solid ${color}`,
                              }}
                            >
                              <Icon size={10} style={{ color }} />
                            </div>
                            {!isLast && (
                              <div
                                className="flex-1 w-px mt-0.5"
                                style={{
                                  background: milestone.status === 'completed' ? 'rgba(141,216,159,0.25)' : 'var(--border)',
                                  minHeight: '16px',
                                }}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-3.5" style={{ paddingBottom: isLast ? '4px' : '14px' }}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{milestone.title}</p>
                                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--muted)', lineHeight: 1.55 }}>
                                  {milestone.description}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                                  {fmtUSDC(milestone.paymentAmount)}
                                </p>
                                <p className="text-xs tabular-nums mt-0.5" style={{ color: isPastDue ? 'var(--danger)' : 'var(--subtle)' }}>
                                  due {fmtShort(milestone.dueDate)}
                                </p>
                              </div>
                            </div>

                            {/* Progress bar */}
                            {milestone.completion > 0 && milestone.completion < 100 && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-strong)' }}>
                                  <div className="h-1 rounded-full" style={{ width: `${milestone.completion}%`, background: 'var(--accent)' }} />
                                </div>
                                <span className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>{milestone.completion}%</span>
                              </div>
                            )}

                            {/* Status + approval row */}
                            <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                                style={{ background: MILESTONE_STATUS[milestone.status].bg, color }}
                              >
                                <Icon size={9} /> {MILESTONE_STATUS[milestone.status].label}
                              </span>

                              {/* Approval status */}
                              {milestone.approvalStatus !== 'not_required' && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                                  style={{ background: aprCfg.bg, color: aprCfg.color }}
                                >
                                  <AprIcon size={9} /> {aprCfg.label}
                                  {milestone.inspectorName && (
                                    <span className="ml-0.5 opacity-70">· {milestone.inspectorName.split(' ')[0]}</span>
                                  )}
                                </span>
                              )}

                              {/* Sim badge for paid/processing */}
                              {(milestone.paymentStatus === 'paid' || milestone.paymentStatus === 'processing') && (
                                <SimBadge />
                              )}

                              {milestone.completedDate && (
                                <span className="text-xs tabular-nums" style={{ color: 'var(--success)' }}>
                                  Completed {fmtShort(milestone.completedDate)}
                                </span>
                              )}
                            </div>

                            {/* Deliverables chips */}
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {milestone.deliverables.slice(0, 3).map((d, di) => (
                                <span key={di} className="text-xs rounded-full px-2 py-0.5"
                                  style={{ background: 'var(--surface-strong)', color: 'var(--subtle)' }}>
                                  {d}
                                </span>
                              ))}
                              {milestone.deliverables.length > 3 && (
                                <span className="text-xs rounded-full px-2 py-0.5"
                                  style={{ background: 'var(--surface-strong)', color: 'var(--subtle)' }}>
                                  +{milestone.deliverables.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
