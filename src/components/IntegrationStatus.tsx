import { Wifi, WifiOff, Circle, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Step {
  label: string
  status: 'done' | 'ready' | 'todo'
  note: string
}

const STEPS: Step[] = [
  {
    label: 'Wallet connection',
    status: 'done',
    note: 'ConnectKit + wagmi v2. MetaMask detected via injected(). Connects to Arc Testnet (chainId 5042002) and prompts to switch when on a wrong network.',
  },
  {
    label: 'Arc Testnet USDC',
    status: 'ready',
    note: 'USDC (0x3600…0000) available via "Get test USDC" in the Arc Studio sidebar.',
  },
  {
    label: 'MilestoneEscrow contract',
    status: 'todo',
    note: 'Contract holds USDC per milestone. Inspector calls approveMilestone() to release to contractor wallet.',
  },
  {
    label: 'On-chain payment trigger',
    status: 'done',
    note: 'RequestPaymentModal uses useWriteContract() + useWaitForTransactionReceipt() to send real USDC ERC-20 transfers on Arc Testnet and reports success only after on-chain confirmation.',
  },
  {
    label: 'Approval status from chain',
    status: 'todo',
    note: 'Read MilestoneApproved events to set approvalStatus automatically instead of hardcoded demo values.',
  },
  {
    label: 'Explorer links',
    status: 'todo',
    note: 'Build arcExplorerUrl from real txHash and show "View on Arc Explorer" for confirmed payments.',
  },
]

const STEP_CFG = {
  done:  { label: 'Live',  color: '#8dd89f', Icon: CheckCircle2 },
  ready: { label: 'Ready', color: '#acc6e9', Icon: Wifi },
  todo:  { label: 'To do', color: '#94a3b8', Icon: WifiOff },
}

export default function IntegrationStatus() {
  const doneCount  = STEPS.filter(s => s.status === 'done').length
  const readyCount = STEPS.filter(s => s.status === 'ready').length

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
            Arc Testnet Integration Checklist
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--subtle)' }}>
          {doneCount} live · {readyCount} ready · {STEPS.length - doneCount - readyCount} to do
        </span>
      </div>

      {/* Steps */}
      <div>
        {STEPS.map((step, i) => {
          const { label, color, Icon } = STEP_CFG[step.status]
          return (
            <div
              key={step.label}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${color}18` }}
              >
                <Circle size={8} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                    {step.label}
                  </span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: `${color}18`, color }}
                  >
                    <Icon size={9} />
                    {label}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)', lineHeight: 1.55 }}>
                  {step.note}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
