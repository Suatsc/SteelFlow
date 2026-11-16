/**
 * RequestPaymentModal
 *
 * Four-step payment flow:
 *   1. Input     — enter recipient address + amount (pre-filled from milestone)
 *   2. Review    — full payment details before any wallet interaction
 *   3. Submitting — waiting for MetaMask confirmation + block confirmation
 *   4. Result    — confirmed tx hash + Arc Explorer link, or error
 *
 * Storage contract:
 *   - When txHash is received (wallet approved), immediately call onPending()
 *     with txStatus: 'pending'. This persists the record to localStorage NOW,
 *     so even if the user closes the browser before the receipt arrives, the
 *     record survives and useTxReceiptVerifier re-verifies it on next load.
 *   - When receipt is confirmed (isSuccess = true), call onConfirmed() which
 *     patches the existing record to txStatus: 'confirmed'.
 *   - Success is NEVER reported until useWaitForTransactionReceipt returns
 *     isSuccess = true.
 *
 * Uses wagmi v2: useWriteContract + useWaitForTransactionReceipt.
 * Amounts parsed via @/onchain-money. No private keys stored.
 */

import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { erc20Abi, isAddress } from 'viem'
import {
  X, ArrowRight, CheckCircle2, XCircle, Loader2,
  ExternalLink, AlertTriangle, Wallet, FlaskConical,
} from 'lucide-react'
import { getUsdc, buildTxExplorerUrl } from '../onchain-facts'
import { parseAmount } from '../onchain-money'
import type { Milestone } from '../data/types'
import type { LivePayment } from '../data/livePayments'

const ARC_TESTNET_ID = 5042002
const usdcFact = getUsdc(ARC_TESTNET_ID)!

type Step = 'input' | 'review' | 'submitting' | 'confirmed' | 'failed'

interface Props {
  milestone: Milestone
  projectName: string
  onClose: () => void
  /** Called as soon as txHash is received — record is 'pending'. */
  onPending: (payment: LivePayment) => void
  /** Called when receipt confirms success — patches the existing record. */
  onConfirmed: (id: string, patch: Partial<LivePayment>) => void
}

function shortenAddr(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-6)}`
}

export default function RequestPaymentModal({
  milestone, projectName, onClose, onPending, onConfirmed,
}: Props) {
  const { address: senderAddress, chainId } = useAccount()

  const defaultAmount = String(milestone.paymentAmount)
  const [recipientRaw, setRecipientRaw] = useState('')
  const [amountRaw, setAmountRaw]       = useState(defaultAmount)
  const [step, setStep]                 = useState<Step>('input')
  const [errorMsg, setErrorMsg]         = useState('')
  const [pendingId, setPendingId]       = useState<string | null>(null)

  const isArcTestnet = chainId === ARC_TESTNET_ID

  // ── Validation ───────────────────────────────────────────────────────────────
  const recipientTrimmed = recipientRaw.trim()
  const recipientValid   = isAddress(recipientTrimmed)
  const amountNum        = parseFloat(amountRaw)
  const amountValid      = !isNaN(amountNum) && amountNum > 0 && amountNum <= 1_000_000

  // ── wagmi write ──────────────────────────────────────────────────────────────
  const {
    writeContract,
    data: txHash,
    isPending: isWalletPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: ARC_TESTNET_ID,
  })

  // ── Save pending record as soon as txHash arrives ───────────────────────────
  const pendingHashRef = useRef<string | null>(null)
  useEffect(() => {
    if (!txHash) return
    if (pendingHashRef.current === txHash) return
    pendingHashRef.current = txHash

    const now = new Date().toISOString()
    const id = `live-${Date.now()}`
    const live: LivePayment = {
      id,
      milestoneId:            milestone.id,
      projectId:              milestone.projectId,
      milestoneTitle:         milestone.title,
      projectName,
      milestoneContractValue: milestone.paymentAmount,
      date:                   now.split('T')[0],
      submittedAt:            now,
      confirmedAt:            null,
      receiptVerifiedAt:      null,
      amount:                 amountNum,
      sender:                 senderAddress ?? '0x0000000000000000000000000000000000000000',
      recipient:              recipientTrimmed,
      txHash,
      arcExplorerUrl:         buildTxExplorerUrl(ARC_TESTNET_ID, txHash),
      txStatus:               'pending',
      transferLogFound:       null,
    }
    setPendingId(id)
    onPending(live)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txHash])

  // ── Upgrade to confirmed after receipt ──────────────────────────────────────
  const confirmedHashRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isSuccess || !txHash || !pendingId) return
    if (confirmedHashRef.current === txHash) return
    confirmedHashRef.current = txHash

    const now = new Date().toISOString()
    onConfirmed(pendingId, {
      txStatus:          'confirmed',
      confirmedAt:       now,
      receiptVerifiedAt: now,
      // transferLogFound will be set by useTxReceiptVerifier on next load;
      // we don't have the receipt logs here without an extra RPC call.
      transferLogFound:  null,
    })
    setStep('confirmed')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, txHash])

  // ── Handle errors ────────────────────────────────────────────────────────────
  const erroredRef = useRef<string | null>(null)
  useEffect(() => {
    if (!writeError && !isReceiptError) return
    const raw = writeError?.message ?? receiptError?.message ?? 'Unknown error'
    if (erroredRef.current === raw) return
    erroredRef.current = raw
    if (raw.toLowerCase().includes('user rejected') || raw.toLowerCase().includes('user denied')) {
      setStep('review')
      return
    }
    // If we have a pendingId, mark it failed
    if (pendingId) {
      onConfirmed(pendingId, {
        txStatus:          'failed',
        receiptVerifiedAt: new Date().toISOString(),
        transferLogFound:  false,
      })
    }
    setErrorMsg(parseOnchainError(raw))
    setStep('failed')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeError, isReceiptError])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleReview() {
    if (!recipientValid || !amountValid) return
    setStep('review')
  }

  function handleSubmit() {
    if (!recipientValid || !amountValid || !isArcTestnet) return
    setStep('submitting')
    try {
      const parsed = parseAmount(ARC_TESTNET_ID, amountRaw)
      writeContract({
        address:      usdcFact.address as `0x${string}`,
        abi:          erc20Abi,
        functionName: 'transfer',
        args:         [recipientTrimmed, parsed.raw],
        chainId:      ARC_TESTNET_ID,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(parseOnchainError(msg))
      setStep('failed')
    }
  }

  function handleBack() {
    resetWrite()
    setErrorMsg('')
    setStep('review')
  }

  function handleRetry() {
    resetWrite()
    setErrorMsg('')
    setPendingId(null)
    pendingHashRef.current = null
    confirmedHashRef.current = null
    erroredRef.current = null
    setStep('input')
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(5,14,28,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-lg rounded-none sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: '#0d1b2f', border: '1px solid var(--border)', maxHeight: '95dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <p className="display font-semibold text-sm" style={{ color: 'var(--ink)' }}>Request Payment</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{milestone.title} · {projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--subtle)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['input', 'review', 'submitting', step === 'failed' ? 'failed' : 'confirmed'] as const).map((s, i, arr) => {
            const labels: Record<string, string> = {
              input: 'Details', review: 'Review', submitting: 'Confirm',
              confirmed: 'Done', failed: 'Error',
            }
            const done   = (['input', 'review', 'submitting', 'confirmed'] as Step[]).indexOf(step) > i
            const active = step === s
                        || (step === 'confirmed' && s === 'confirmed')
                        || (step === 'failed'    && s === 'failed')
            return (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--surface-strong)',
                      color: done || active ? '#0d1b2f' : 'var(--subtle)',
                    }}
                  >
                    {done ? <CheckCircle2 size={11} /> : i + 1}
                  </div>
                  <span className="text-xs font-medium" style={{ color: active ? 'var(--ink)' : 'var(--subtle)' }}>
                    {labels[s]}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="w-8 h-px mx-2" style={{ background: done ? 'var(--success)' : 'var(--border)' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex flex-col gap-4" style={{ flex: 1 }}>

          {/* ── STEP 1: INPUT ─────────────────────────────────────────────────── */}
          {step === 'input' && (
            <>
              {!isArcTestnet && (
                <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Wallet is not connected to Arc Testnet. Please switch networks before continuing.</span>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs"
                style={{ background: 'rgba(172,198,233,0.07)', border: '1px solid rgba(172,198,233,0.2)', color: 'var(--accent)' }}>
                <FlaskConical size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  This sends <strong>test USDC</strong> on Arc Testnet. No real funds involved.
                  Direct ERC-20 <code className="mono">transfer()</code> from your wallet to the recipient.
                  The payment record is saved locally as soon as your wallet approves the transaction.
                </span>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                  Milestone
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{milestone.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{projectName} · {milestone.contractor}</p>
                <p className="mono text-base font-bold tabular-nums mt-2" style={{ color: 'var(--accent)' }}>
                  Contract value: ${milestone.paymentAmount.toLocaleString('en-US')} USDC
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                  From (your wallet)
                </label>
                <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <Wallet size={13} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
                  <span className="mono text-sm" style={{ color: 'var(--muted)' }}>
                    {senderAddress ? shortenAddr(senderAddress) : 'Not connected'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                  Recipient address <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="0x… (paste a real EVM testnet address)"
                  value={recipientRaw}
                  onChange={e => setRecipientRaw(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 mono text-sm outline-none"
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${recipientRaw.length > 5 && !recipientValid ? 'var(--danger)' : 'var(--border)'}`,
                    color: 'var(--ink)',
                    caretColor: 'var(--accent)',
                  }}
                />
                {recipientRaw.length > 5 && !recipientValid && (
                  <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Not a valid EVM address</p>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>
                  Enter any Arc Testnet address you control for testing.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                  Amount (USDC) <span style={{ color: 'var(--subtle)' }}>— you can enter a smaller test amount</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.000001"
                    max="1000000"
                    step="any"
                    value={amountRaw}
                    onChange={e => setAmountRaw(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 mono text-sm outline-none pr-16"
                    style={{
                      background: 'var(--surface)',
                      border: `1px solid ${amountRaw && !amountValid ? 'var(--danger)' : 'var(--border)'}`,
                      color: 'var(--ink)',
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: 'var(--subtle)' }}>
                    USDC
                  </span>
                </div>
                {amountRaw && !amountValid && (
                  <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Enter a positive amount up to 1,000,000 USDC</p>
                )}
              </div>

              <button
                onClick={handleReview}
                disabled={!recipientValid || !amountValid || !isArcTestnet || !senderAddress}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold transition-colors mt-1"
                style={{
                  background: recipientValid && amountValid && isArcTestnet && senderAddress ? 'var(--accent)' : 'var(--surface-strong)',
                  color:      recipientValid && amountValid && isArcTestnet && senderAddress ? '#0d1b2f' : 'var(--subtle)',
                  cursor:     recipientValid && amountValid && isArcTestnet && senderAddress ? 'pointer' : 'not-allowed',
                }}
              >
                Review payment <ArrowRight size={14} />
              </button>
            </>
          )}

          {/* ── STEP 2: REVIEW ────────────────────────────────────────────────── */}
          {step === 'review' && (
            <>
              <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.07em' }}>
                  Payment summary
                </p>
                {[
                  { label: 'Milestone', value: milestone.title },
                  { label: 'Project',   value: projectName },
                  { label: 'From',      value: senderAddress ? shortenAddr(senderAddress) : '—', mono: true },
                  { label: 'To',        value: shortenAddr(recipientTrimmed), mono: true },
                  { label: 'Network',   value: 'Arc Testnet (chainId 5042002)' },
                  { label: 'Token',     value: `USDC · ${shortenAddr(usdcFact.address)}` },
                  { label: 'Amount',    value: `${Number(amountRaw).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`, highlight: true },
                ].map(row => (
                  <div key={row.label} className="flex items-start justify-between gap-4">
                    <span className="text-xs" style={{ color: 'var(--subtle)', flexShrink: 0 }}>{row.label}</span>
                    <span
                      className={`text-sm text-right ${row.mono ? 'mono' : ''}`}
                      style={{ color: row.highlight ? 'var(--accent)' : 'var(--ink)', fontWeight: row.highlight ? 700 : 400, wordBreak: 'break-all' }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs"
                style={{ background: 'rgba(232,109,122,0.07)', border: '1px solid rgba(232,109,122,0.22)', color: 'var(--danger)' }}>
                <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  You are about to sign a real blockchain transaction on Arc Testnet.
                  <strong> Test USDC only</strong> — no real funds — but the transaction cannot be reversed once submitted.
                  The record is saved locally as soon as MetaMask approves it.
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 rounded-xl py-3 text-sm font-medium"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
                  style={{ background: 'var(--accent)', color: '#0d1b2f' }}
                >
                  Confirm in MetaMask <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: SUBMITTING ────────────────────────────────────────────── */}
          {step === 'submitting' && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(172,198,233,0.10)', border: '1px solid rgba(172,198,233,0.25)' }}>
                {isWalletPending
                  ? <Wallet size={26} style={{ color: 'var(--accent)' }} />
                  : <Loader2 size={26} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                }
              </div>
              <div className="text-center">
                <p className="display font-semibold" style={{ color: 'var(--ink)' }}>
                  {isWalletPending ? 'Waiting for wallet confirmation…' : isConfirming ? 'Transaction submitted' : 'Processing…'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--subtle)' }}>
                  {isWalletPending
                    ? 'Check MetaMask and approve the transaction.'
                    : isConfirming
                    ? 'Record saved. Waiting for block confirmation on Arc Testnet.'
                    : 'Sending transaction…'}
                </p>
              </div>
              {txHash && (
                <div className="w-full rounded-xl px-4 py-3 flex items-center gap-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--subtle)' }}>Tx hash:</span>
                  <span className="mono text-xs flex-1 truncate" style={{ color: 'var(--ink-2)' }}>{txHash}</span>
                </div>
              )}
              {txHash && (
                <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
                  Payment record saved to local storage. You can safely close this window —
                  the record will remain in the Payments page and will be re-verified when you reload.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 4: CONFIRMED ─────────────────────────────────────────────── */}
          {step === 'confirmed' && txHash && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(141,216,159,0.12)', border: '1px solid rgba(141,216,159,0.35)' }}>
                <CheckCircle2 size={28} style={{ color: '#8dd89f' }} />
              </div>
              <div className="text-center">
                <p className="display font-semibold text-lg" style={{ color: 'var(--ink)' }}>Transaction confirmed</p>
                <p className="text-sm mt-1" style={{ color: 'var(--subtle)' }}>
                  {Number(amountRaw).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC transferred on Arc Testnet
                </p>
              </div>
              <div className="w-full rounded-xl p-4 flex flex-col gap-2"
                style={{ background: 'var(--surface)', border: '1px solid rgba(141,216,159,0.25)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs" style={{ color: 'var(--subtle)' }}>Transaction hash</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ background: 'rgba(141,216,159,0.12)', color: '#8dd89f' }}>
                    <CheckCircle2 size={9} /> Confirmed · Arc Testnet
                  </span>
                </div>
                <p className="mono text-xs break-all" style={{ color: 'var(--ink-2)' }}>{txHash}</p>
              </div>
              <a
                href={buildTxExplorerUrl(ARC_TESTNET_ID, txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
                style={{ background: 'rgba(172,198,233,0.12)', color: 'var(--accent)', border: '1px solid rgba(172,198,233,0.3)' }}
              >
                View on Arc Testnet Explorer <ExternalLink size={13} />
              </a>
              <button
                onClick={onClose}
                className="w-full rounded-xl py-3 text-sm font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                Close
              </button>
            </div>
          )}

          {/* ── STEP: FAILED ──────────────────────────────────────────────────── */}
          {step === 'failed' && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(232,109,122,0.10)', border: '1px solid rgba(232,109,122,0.3)' }}>
                <XCircle size={28} style={{ color: 'var(--danger)' }} />
              </div>
              <div className="text-center">
                <p className="display font-semibold" style={{ color: 'var(--ink)' }}>Transaction failed</p>
                <p className="text-sm mt-2" style={{ color: 'var(--subtle)', lineHeight: 1.6 }}>{errorMsg}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={handleBack} className="flex-1 rounded-xl py-3 text-sm font-medium"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  Back to review
                </button>
                <button onClick={handleRetry} className="flex-1 rounded-xl py-3 text-sm font-semibold"
                  style={{ background: 'var(--surface-strong)', color: 'var(--ink)' }}>
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Error parser ───────────────────────────────────────────────────────────────
function parseOnchainError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('insufficient funds') || m.includes('exceeds balance') || m.includes('transfer amount exceeds balance'))
    return 'Insufficient USDC balance. Add test USDC from the Arc Studio sidebar ("Get test USDC") and try again.'
  if (m.includes('reverted')) {
    const reason = message.match(/reason="([^"]+)"/)
    return reason ? `Transaction reverted: ${reason[1]}` : 'Transaction reverted. Check your USDC balance and recipient address.'
  }
  if (m.includes('network') || m.includes('timeout') || m.includes('rpc'))
    return 'Network error. Check your connection and try again.'
  if (m.includes('gas'))
    return 'Gas estimation failed. The transaction may revert — check your balance.'
  return 'Transaction failed. Please check your wallet balance, network connection, and try again.'
}
