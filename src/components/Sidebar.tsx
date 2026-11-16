import {
  LayoutDashboard, ListChecks, CreditCard, GitBranch,
  HardHat, MapPin, AlertTriangle
} from 'lucide-react'
import type { NavView } from '../data/types'
import type { Project } from '../data/types'
import { fmtUSDC } from './shared'

interface SidebarProps {
  active: NavView
  onChange: (view: NavView) => void
  project: Project
}

const NAV_ITEMS: { id: NavView; label: string; icon: React.ElementType; sub: string }[] = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard, sub: 'All projects'     },
  { id: 'milestones', label: 'Milestones', icon: ListChecks,      sub: 'Approval & work stages' },
  { id: 'payments',   label: 'Payments',   icon: CreditCard,      sub: 'USDC history'     },
  { id: 'timeline',   label: 'Timeline',   icon: GitBranch,       sub: 'Stage schedule'   },
]

const STATUS_COLOR = {
  active:    { dot: '#8dd89f', label: 'Active'    },
  completed: { dot: '#acc6e9', label: 'Completed' },
  paused:    { dot: '#f59e0b', label: 'Paused'    },
}

export default function Sidebar({ active, onChange, project }: SidebarProps) {
  const ms   = project.milestones
  const done = ms.filter(m => m.status === 'completed').length
  const ovrd = ms.filter(m => m.status === 'overdue').length
  const paidMs = ms.filter(m => m.paymentStatus === 'paid')
  const paidAmt = paidMs.reduce((s, m) => s + m.paymentAmount, 0)
  const totalAmt = ms.reduce((s, m) => s + m.paymentAmount, 0)
  const paidPct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0
  const { dot, label: statusLabel } = STATUS_COLOR[project.status]

  return (
    <aside
      className="flex flex-col w-56 shrink-0 border-r"
      style={{
        background: 'rgba(10,22,42,0.70)',
        borderColor: 'var(--border)',
        minHeight: 'calc(100dvh - 49px)',
      }}
    >
      {/* Current project card */}
      <div className="px-3 pt-4 pb-3">
        <div
          className="rounded-xl p-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(172,198,233,0.12)' }}
            >
              <HardHat size={13} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--ink-2)' }}>
                {project.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={9} style={{ color: 'var(--subtle)' }} />
                <span className="text-xs truncate" style={{ color: 'var(--subtle)' }}>
                  {project.location}
                </span>
              </div>
            </div>
          </div>

          {/* Payment progress */}
          <div className="mt-2.5">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--subtle)' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: dot }} />
                {statusLabel}
              </span>
              <span className="tabular-nums mono" style={{ color: 'var(--muted)' }}>
                {paidPct}% paid
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-strong)' }}>
              <div
                className="h-1 rounded-full"
                style={{ width: `${paidPct}%`, background: 'var(--success)' }}
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3 mt-2.5">
            <div>
              <p className="text-xs tabular-nums font-semibold" style={{ color: 'var(--ink)' }}>
                {done}/{ms.length}
              </p>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>milestones</p>
            </div>
            <div>
              <p className="text-xs tabular-nums font-semibold mono" style={{ color: 'var(--ink)' }}>
                {fmtUSDC(paidAmt)}
              </p>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>paid</p>
            </div>
          </div>

          {/* Overdue alert */}
          {ovrd > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: 'var(--danger)' }}>
              <AlertTriangle size={10} />
              {ovrd} milestone{ovrd > 1 ? 's' : ''} overdue
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3" style={{ height: '1px', background: 'var(--border)' }} />

      {/* Nav */}
      <nav className="px-3 pt-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-left transition-all"
              style={{
                background: isActive ? 'rgba(172, 198, 233, 0.13)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                border: isActive ? '1px solid rgba(172, 198, 233, 0.20)' : '1px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget).style.color = 'var(--ink-2)' } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = 'var(--muted)' } }}
            >
              <Icon size={14} style={{ flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{item.label}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: isActive ? 'rgba(172,198,233,0.65)' : 'var(--subtle)', opacity: 0.9 }}>
                  {item.sub}
                </p>
              </div>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
