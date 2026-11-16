/**
 * LivePayment — a payment record created when an on-chain transaction is
 * submitted or confirmed on Arc Testnet.
 *
 * txStatus lifecycle:
 *   'pending'   — tx hash obtained, waiting for receipt (or app was closed before receipt arrived)
 *   'confirmed' — receipt received AND status === 'success' AND USDC Transfer log present
 *   'failed'    — receipt received but status !== 'success', or receipt check failed
 *
 * Records are persisted to localStorage by usePaymentStore so they survive
 * page reloads. On reload, any 'pending' records are re-verified against the
 * chain by useTxReceiptVerifier before being displayed as confirmed.
 *
 * No private keys, seed phrases, or wallet credentials are stored here.
 * Every field is public on-chain data or user-entered metadata.
 */
export type TxStatus = 'pending' | 'confirmed' | 'failed'

export interface LivePayment {
  // ── Identity ─────────────────────────────────────────────────────────────────
  id: string                       // e.g. "live-1728712345678"

  // ── Milestone context ─────────────────────────────────────────────────────────
  milestoneId: string              // e.g. "ms-105"
  projectId: string                // e.g. "proj-001"
  milestoneTitle: string           // e.g. "Superstructure Levels 1–9"
  projectName: string              // e.g. "Harborview Commercial Tower"
  milestoneContractValue: number   // original milestone paymentAmount (USDC display units)

  // ── Transaction details ───────────────────────────────────────────────────────
  date: string                     // ISO date string of submission, e.g. "2026-10-12"
  submittedAt: string              // ISO timestamp when tx hash was first received
  confirmedAt: string | null       // ISO timestamp when receipt was received; null until then
  receiptVerifiedAt: string | null // ISO timestamp of most recent receipt re-check (null = never re-verified)
  amount: number                   // USDC amount actually transferred (may differ from contractValue for test runs)
  sender: string                   // EVM address of the paying wallet
  recipient: string                // EVM address of the recipient
  txHash: `0x${string}`            // on-chain transaction hash
  arcExplorerUrl: string           // pre-built Arc Testnet Explorer URL
  txStatus: TxStatus               // 'pending' | 'confirmed' | 'failed'

  // ── Verification metadata ─────────────────────────────────────────────────────
  /** True when the on-chain receipt's logs include a USDC Transfer event for this tx */
  transferLogFound: boolean | null  // null until receipt is checked
}
