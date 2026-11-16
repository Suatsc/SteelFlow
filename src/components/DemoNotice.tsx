import { FlaskConical, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

/**
 * Persistent banner explaining the demo/testnet state.
 * Collapsible so it doesn't dominate on return visits.
 */
export default function DemoNotice() {
  const [open, setOpen] = useState(true)

  return (
    <div
      className="rounded-xl overflow-hidden mb-5"
      style={{ border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.07)' }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <FlaskConical size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
            Prototype — Demo Data Only
          </span>
          <span className="text-xs hidden sm:block" style={{ color: 'rgba(245,158,11,0.7)' }}>
            No real payments have occurred. All values are fictional.
          </span>
        </div>
        <div style={{ color: 'rgba(245,158,11,0.6)', flexShrink: 0 }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div
          className="px-4 pb-4 pt-1 text-sm"
          style={{ color: 'rgba(245,158,11,0.85)', lineHeight: 1.65 }}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold mb-1.5 text-xs uppercase tracking-widest" style={{ letterSpacing: '0.07em' }}>
                What you&apos;re seeing
              </p>
              <ul className="flex flex-col gap-1 text-xs" style={{ color: 'rgba(245,158,11,0.75)' }}>
                <li>• Three fictional construction projects with realistic work stages</li>
                <li>• Milestone approval workflow with simulated inspector sign-offs</li>
                <li>• Payment amounts expressed in USDC — no transactions have been submitted</li>
                <li>• All tx hashes, permit numbers, and company names are invented</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1.5 text-xs uppercase tracking-widest" style={{ letterSpacing: '0.07em' }}>
                Testnet integration plan (Arc Testnet)
              </p>
              <ul className="flex flex-col gap-1 text-xs" style={{ color: 'rgba(245,158,11,0.75)' }}>
                <li>• Connect wallet via the header button (wagmi + ConnectKit, Arc Testnet)</li>
                <li>• Deploy a MilestoneEscrow contract — holds USDC until inspector approves</li>
                <li>• Inspector calls <code className="mono" style={{ fontSize: '0.7rem' }}>approveMilestone()</code> → contract releases USDC to contractor</li>
                <li>• Payment records update from <code className="mono" style={{ fontSize: '0.7rem' }}>source:&apos;simulated&apos;</code> to <code className="mono" style={{ fontSize: '0.7rem' }}>&apos;onchain&apos;</code> with real tx hash</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
