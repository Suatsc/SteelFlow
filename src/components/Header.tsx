import { useAccount, useSwitchChain, useDisconnect } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ChevronDown, HardHat, MapPin, Wallet, AlertTriangle, LogOut } from 'lucide-react'
import { useState } from 'react'
import type { Project } from '../data/types'
import { requireChain } from '../onchain-facts'

interface HeaderProps {
  project: Project
  projects: Project[]
  onSelectProject: (id: string) => void
}

const PROJECT_STATUS_COLOR = {
  active:    '#8dd89f',
  completed: '#acc6e9',
  paused:    '#f59e0b',
}

const ARC_TESTNET_ID = 5042002

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// ─── Wallet button: injected into ConnectKitButton.Custom ────────────────────
function WalletSection() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { disconnect } = useDisconnect()
  const [showDropdown, setShowDropdown] = useState(false)

  const isArcTestnet = chainId === ARC_TESTNET_ID
  const arcChain = requireChain(ARC_TESTNET_ID)

  // ── Not connected ────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button
            onClick={show}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)' }}
          >
            <Wallet size={12} />
            <span className="hidden sm:block">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </button>
        )}
      </ConnectKitButton.Custom>
    )
  }

  // ── Connected but wrong chain ─────────────────────────────────────────────
  if (!isArcTestnet) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Wrong network badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
          style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.35)',
            color: '#f59e0b',
          }}
        >
          <AlertTriangle size={11} />
          Wrong network
        </div>
        <button
          onClick={() => switchChain({ chainId: ARC_TESTNET_ID })}
          disabled={isSwitching}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{
            background: isSwitching ? 'rgba(245,158,11,0.5)' : '#f59e0b',
            color: '#0d1b2f',
            opacity: isSwitching ? 0.7 : 1,
          }}
        >
          {isSwitching ? 'Switching…' : `Switch to ${arcChain.name}`}
        </button>
      </div>
    )
  }

  // ── Connected on Arc Testnet ──────────────────────────────────────────────
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(v => !v)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
        style={{
          background: 'rgba(141,216,159,0.1)',
          border: '1px solid rgba(141,216,159,0.3)',
          color: '#8dd89f',
        }}
      >
        {/* Green pulse */}
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: '#8dd89f' }}
          />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#8dd89f' }} />
        </span>
        <span className="hidden sm:block">{shortenAddress(address!)}</span>
        <span className="sm:hidden">Connected</span>
        <ChevronDown size={11} style={{ color: 'rgba(141,216,159,0.6)' }} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute right-0 top-full mt-1.5 w-56 rounded-xl py-1.5 z-50"
          style={{
            background: '#0f2035',
            border: '1px solid var(--border)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          {/* Address */}
          <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>Connected wallet</p>
            <p className="mono text-xs mt-0.5 break-all" style={{ color: 'var(--ink-2)' }}>{address}</p>
          </div>
          {/* Network */}
          <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>Network</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#8dd89f' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>{arcChain.name}</p>
            </div>
          </div>
          {/* Testnet note */}
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--subtle)' }}>
              Testnet only. No real funds. Use "Get test USDC" in the Arc Studio sidebar to fund this wallet.
            </p>
          </div>
          {/* Disconnect */}
          <button
            onClick={() => { disconnect(); setShowDropdown(false) }}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs transition-colors"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,109,122,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <LogOut size={11} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Network badge (left of wallet) ─────────────────────────────────────────
function NetworkBadge() {
  const { isConnected, chainId } = useAccount()

  if (!isConnected) {
    return (
      <div
        className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
        style={{
          background: 'rgba(148,163,184,0.08)',
          border: '1px solid rgba(148,163,184,0.2)',
          color: 'var(--subtle)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--subtle)' }} />
        Arc Testnet
      </div>
    )
  }

  const isArcTestnet = chainId === ARC_TESTNET_ID

  if (isArcTestnet) {
    return (
      <div
        className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
        style={{
          background: 'rgba(141,216,159,0.08)',
          border: '1px solid rgba(141,216,159,0.25)',
          color: '#8dd89f',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#8dd89f' }} />
        Arc Testnet
      </div>
    )
  }

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.25)',
        color: '#f59e0b',
      }}
    >
      <AlertTriangle size={11} />
      Wrong network
    </div>
  )
}

// ─── Main header ─────────────────────────────────────────────────────────────
export default function Header({ project, projects, onSelectProject }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 py-3 border-b"
      style={{
        background: 'rgba(13, 27, 47, 0.94)',
        backdropFilter: 'blur(18px)',
        borderColor: 'var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: logo + project switcher */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            <HardHat size={14} style={{ color: '#0d1b2f' }} />
          </div>
          <div className="hidden sm:block">
            <span className="display font-bold text-sm leading-none" style={{ color: 'var(--ink)' }}>
              SteelFlow
            </span>
            <span className="block text-xs leading-none mt-0.5" style={{ color: 'var(--subtle)' }}>
              Construction Payments
            </span>
          </div>
        </div>

        <div className="hidden sm:block w-px h-6" style={{ background: 'var(--border)' }} />

        {/* Project switcher */}
        <div className="relative group">
          <button
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--ink-2)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: PROJECT_STATUS_COLOR[project.status] }}
            />
            <span className="max-w-[140px] truncate hidden sm:block">{project.name}</span>
            <span className="sm:hidden">Project</span>
            <ChevronDown size={11} style={{ color: 'var(--subtle)' }} />
          </button>

          {/* Dropdown */}
          <div
            className="absolute left-0 top-full mt-1.5 w-64 rounded-xl py-1.5 z-50 hidden group-focus-within:block group-hover:block"
            style={{
              background: '#0f2035',
              border: '1px solid var(--border)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
          >
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors"
                style={{ background: p.id === project.id ? 'rgba(172,198,233,0.10)' : 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = p.id === project.id ? 'rgba(172,198,233,0.10)' : 'transparent' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: PROJECT_STATUS_COLOR[p.status] }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{p.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={9} style={{ color: 'var(--subtle)' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--subtle)' }}>{p.location}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: network badge + wallet */}
      <div className="flex items-center gap-1.5">
        <NetworkBadge />
        <div className="w-px h-4 mx-1 hidden sm:block" style={{ background: 'var(--border)' }} />
        <WalletSection />
      </div>
    </header>
  )
}
