import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ProjectOverview from './components/ProjectOverview'
import MilestonesView from './components/MilestonesView'
import PaymentActivity from './components/PaymentActivity'
import TimelineView from './components/TimelineView'
import { usePaymentStore } from './hooks/usePaymentStore'
import { useTxReceiptVerifier } from './hooks/useTxReceiptVerifier'
import type { NavView } from './data/types'
import type { LivePayment } from './data/livePayments'
import { PROJECTS } from './data/sampleData'
import { useState } from 'react'
import { LayoutDashboard, ListChecks, CreditCard, GitBranch } from 'lucide-react'

const BASE_VIEW_META: Record<NavView, { title: string; sub: string }> = {
  overview:   { title: 'Overview',   sub: 'All construction projects at a glance' },
  milestones: { title: 'Milestones', sub: 'Work stages, inspection approvals & payment status' },
  payments:   { title: 'Payments',   sub: 'USDC payment history · Arc Testnet' },
  timeline:   { title: 'Timeline',   sub: 'Milestone schedule by work stage' },
}

const MOBILE_NAV: { id: NavView; label: string; Icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',   Icon: LayoutDashboard },
  { id: 'milestones', label: 'Milestones', Icon: ListChecks },
  { id: 'payments',   label: 'Payments',   Icon: CreditCard },
  { id: 'timeline',   label: 'Timeline',   Icon: GitBranch },
]

export default function App() {
  const [activeView, setActiveView]           = useState<NavView>('overview')
  const [activeProjectId, setActiveProjectId] = useState(PROJECTS[0].id)

  // ── Persistent payment store (localStorage) ──────────────────────────────────
  const { payments: livePayments, add: addPayment, update: updatePayment } = usePaymentStore()

  // ── Re-verify any 'pending' records against the chain on mount ───────────────
  useTxReceiptVerifier({ payments: livePayments, onUpdate: updatePayment })

  // ── Callbacks for the modal ──────────────────────────────────────────────────
  function handlePending(p: LivePayment) {
    addPayment(p)
  }
  function handleConfirmed(id: string, patch: Partial<LivePayment>) {
    updatePayment(id, patch)
  }

  const activeProject = PROJECTS.find(p => p.id === activeProjectId) ?? PROJECTS[0]
  const confirmedCount = livePayments.filter(p => p.txStatus === 'confirmed').length
  const pendingCount   = livePayments.filter(p => p.txStatus === 'pending').length

  const viewMeta = { ...BASE_VIEW_META }
  if (livePayments.length > 0) {
    const parts: string[] = []
    if (confirmedCount > 0) parts.push(`${confirmedCount} confirmed`)
    if (pendingCount   > 0) parts.push(`${pendingCount} pending`)
    viewMeta.payments = {
      title: 'Payments',
      sub: `${parts.join(' · ')} on-chain · Arc Testnet`,
    }
    viewMeta.overview = {
      title: 'Overview',
      sub: confirmedCount > 0
        ? `${confirmedCount} on-chain payment${confirmedCount > 1 ? 's' : ''} confirmed · Arc Testnet`
        : `${pendingCount} payment${pendingCount > 1 ? 's' : ''} pending verification`,
    }
  }
  const { title, sub } = viewMeta[activeView]

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg)' }}>
      <Header
        project={activeProject}
        projects={PROJECTS}
        onSelectProject={setActiveProjectId}
      />

      <div className="flex flex-1 pb-14 sm:pb-0">
        <div className="hidden sm:block">
          <Sidebar active={activeView} onChange={setActiveView} project={activeProject} />
        </div>

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 overflow-auto">
          <div className="mb-5">
            <h1 className="display text-xl font-bold" style={{ color: 'var(--ink)' }}>{title}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--subtle)' }}>{sub}</p>
          </div>

          {activeView === 'overview' && (
            <ProjectOverview livePayments={livePayments} />
          )}
          {activeView === 'milestones' && (
            <MilestonesView
              livePayments={livePayments}
              onPending={handlePending}
              onConfirmed={handleConfirmed}
            />
          )}
          {activeView === 'payments' && (
            <PaymentActivity livePayments={livePayments} />
          )}
          {activeView === 'timeline' && <TimelineView />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-1.5"
        style={{
          background:    'rgba(10, 22, 42, 0.97)',
          backdropFilter:'blur(20px)',
          borderTop:     '1px solid var(--border)',
          zIndex:        50,
        }}
      >
        {MOBILE_NAV.map(({ id, label, Icon }) => {
          const isActive = activeView === id
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[44px] justify-center"
              style={{
                color:      isActive ? 'var(--accent)' : 'var(--subtle)',
                background: isActive ? 'rgba(172,198,233,0.10)' : 'transparent',
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
