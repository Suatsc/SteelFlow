/**
 * TxDetailPanel
 *
 * Inline expandable drawer shown inside a payment row in PaymentActivity.
 * Displays all fields of a LivePayment with clear labels, status chips,
 * and a direct link to the Arc Testnet Explorer.
 *
 * Deliberately verbose — every field is shown so there is no ambiguity
 * about what the transaction was, where it went, and what it cost.
 */

import { CheckCircle2, ExternalLink, Copy, ChevronUp, RefreshCw, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { LivePayment } from '../data/livePayments'
import { fmtUSDC } from './shared'

interface TxDetailPanelProps {
  payment: LivePayment
  onClose: () => void
}

function Row({ label, value, mono = false, highlight = false, children }: {
  label: string
  value?: string
  mono?: boolean
  highlight?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs shrink-0 pt-0.5" style={{ color: 'var(--subtle)', minWidth: '9rem' }}>{label}</span>
      {children ?? (
        <span
          className={`text-sm text-right break-all ${mono ? 'mono' : ''}`}
          style={{ color: highlight ? 'var(--accent)' : 'var(--ink-2)', fontWeight: highlight ? 600 : 400 }}
        >
          {value}
        </span>
      )}
    </div>
  )
}

function CopyableHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    void navigator.clipboard.writeText(hash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <div className="flex items-center gap-2 justify-end flex-wrap">
      <span className="mono text-xs break-all text-right" style={{ color: 'var(--ink-2)' }}>{hash}</span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium shrink-0 transition-colors"
        style={{
          background: copied ? 'rgba(141,216,159,0.12)' : 'var(--surface-strong)',
          color: copied ? '#8dd89f' : 'var(--muted)',
          border: '1px solid var(--border)',
        }}
        title="Copy transaction hash"
      >
        <Copy size={10} /> {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function fmtTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'short',
  })
}

function shortenAddr(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-6)}`
}

export default function TxDetailPanel({ payment, onClose }: TxDetailPanelProps) {
  const isTestAmount  = payment.amount < payment.milestoneContractValue
  const isConfirmed   = payment.txStatus === 'confirmed'
  const isPending     = payment.txStatus === 'pending'

  const statusChip = isConfirmed
    ? { bg: 'rgba(141,216,159,0.12)', color: '#8dd89f',      border: 'rgba(141,216,159,0.3)',  Icon: CheckCircle2, label: 'Confirmed · Arc Testnet' }
    : isPending
    ? { bg: 'rgba(172,198,233,0.10)', color: 'var(--accent)', border: 'rgba(172,198,233,0.3)',  Icon: RefreshCw,    label: 'Pending verification' }
    : { bg: 'rgba(232,109,122,0.10)', color: 'var(--danger)', border: 'rgba(232,109,122,0.3)',  Icon: XCircle,      label: 'Failed' }

  const StatusChipIcon = statusChip.Icon

  return (
    <div
      className="px-5 pb-5 pt-3"
      style={{ background: 'rgba(141,216,159,0.03)', borderTop: '1px solid rgba(141,216,159,0.2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: statusChip.bg, color: statusChip.color, border: `1px solid ${statusChip.border}` }}
          >
            <StatusChipIcon size={11} /> {statusChip.label}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: 'rgba(172,198,233,0.10)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.22)' }}
          >
            Direct ERC-20 transfer · no escrow
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs rounded-lg px-2 py-1"
          style={{ color: 'var(--subtle)', background: 'var(--surface-strong)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ink)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--subtle)' }}
        >
          <ChevronUp size={12} /> Collapse
        </button>
      </div>

      {/* Detail rows */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="px-4" style={{ background: 'var(--surface)' }}>
          <Row label="Milestone"         value={payment.milestoneTitle} />
          <Row label="Project"           value={payment.projectName} />
          <Row label="Submitted at"      value={fmtTimestamp(payment.submittedAt)} />
          {payment.confirmedAt && (
            <Row label="Confirmed at"    value={fmtTimestamp(payment.confirmedAt)} />
          )}
          {payment.receiptVerifiedAt && (
            <Row label="Receipt verified">
              <div className="text-right">
                <span className="text-sm" style={{ color: isConfirmed ? '#8dd89f' : isPending ? 'var(--accent)' : 'var(--danger)' }}>
                  {fmtTimestamp(payment.receiptVerifiedAt)}
                </span>
                {payment.transferLogFound === true && (
                  <p className="text-xs mt-0.5" style={{ color: '#8dd89f' }}>
                    USDC Transfer event found in receipt logs
                  </p>
                )}
                {payment.transferLogFound === false && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>
                    Transfer event not found in receipt logs
                  </p>
                )}
                {payment.transferLogFound === null && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                    Transfer log check pending
                  </p>
                )}
              </div>
            </Row>
          )}
          <Row label="Network"           value="Arc Testnet  ·  chainId 5042002" />
          <Row label="Token"             value="USDC  ·  0x3600…0000  ·  6 decimals" />

          <Row label="Amount transferred" highlight>
            <div className="text-right">
              <span className="mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
                {fmtUSDC(payment.amount)}
              </span>
              {isTestAmount && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
                  Test amount · milestone contract value is {fmtUSDC(payment.milestoneContractValue)}
                </p>
              )}
            </div>
          </Row>

          <Row label="From (sender)">
            <span className="mono text-sm text-right" style={{ color: 'var(--ink-2)' }} title={payment.sender}>
              {shortenAddr(payment.sender)}
            </span>
          </Row>

          <Row label="To (recipient)">
            <span className="mono text-sm text-right" style={{ color: 'var(--ink-2)' }} title={payment.recipient}>
              {shortenAddr(payment.recipient)}
            </span>
          </Row>

          <Row label="Transaction hash">
            <CopyableHash hash={payment.txHash} />
          </Row>

          {/* Last row — no bottom border */}
          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-xs shrink-0" style={{ color: 'var(--subtle)', minWidth: '9rem' }}>Arc Explorer</span>
            <a
              href={payment.arcExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: '#8dd89f' }}
            >
              View transaction <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--subtle)' }}>
        This is a direct USDC ERC-20 <code className="mono" style={{ color: 'var(--muted)' }}>transfer()</code> from the sender wallet
        to the recipient. It is <strong style={{ color: 'var(--muted)' }}>not</strong> escrowed and is{' '}
        <strong style={{ color: 'var(--muted)' }}>not</strong> automatically released by a smart contract.
        Records survive page reloads via local storage and are re-verified against the chain on load.
        A MilestoneEscrow contract is a planned future integration.
      </p>
    </div>
  )
}
