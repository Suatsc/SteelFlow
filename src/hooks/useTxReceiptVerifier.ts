/**
 * useTxReceiptVerifier
 *
 * On mount, scans all LivePayment records whose txStatus is 'pending'
 * and re-verifies each one against the Arc Testnet by fetching its
 * transaction receipt via the wagmi publicClient.
 *
 * Verification logic per record:
 *   1. Call publicClient.getTransactionReceipt({ hash })
 *   2. If receipt.status === 'success':
 *        - Check logs for a USDC Transfer(from, to, value) event
 *        - Mark txStatus 'confirmed', set confirmedAt (if null) + receiptVerifiedAt + transferLogFound
 *   3. If receipt.status === 'reverted':
 *        - Mark txStatus 'failed', set receiptVerifiedAt
 *   4. If the RPC call throws (receipt not yet available / network error):
 *        - Leave as 'pending', set receiptVerifiedAt to now so we don't
 *          spam the RPC on every render (caller can retry manually)
 *
 * USDC Transfer event detection:
 *   The USDC contract emits Transfer(address indexed from, address indexed to, uint256 value).
 *   topic0 = keccak256("Transfer(address,address,uint256)")
 *           = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
 *   We check that at least one log in the receipt:
 *     - comes from the USDC contract address (0x3600…0000)
 *     - has topic0 matching the Transfer selector
 *   This confirms the token moved, independent of the Explorer's display.
 *
 * No private keys are used. All calls are read-only eth_getTransactionReceipt.
 */
import { useEffect, useRef } from 'react'
import { usePublicClient } from 'wagmi'
import type { LivePayment } from '../data/livePayments'

const ARC_TESTNET_ID = 5042002

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' as const

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

interface Props {
  payments: LivePayment[]
  onUpdate: (id: string, patch: Partial<LivePayment>) => void
}

export function useTxReceiptVerifier({ payments, onUpdate }: Props): void {
  const client = usePublicClient({ chainId: ARC_TESTNET_ID })
  // Track which hashes we've already attempted to avoid duplicate RPC calls
  const attempted = useRef(new Set<string>())

  useEffect(() => {
    if (!client) return

    const pending = payments.filter(
      p => p.txStatus === 'pending' && !attempted.current.has(p.txHash),
    )
    if (pending.length === 0) return

    for (const payment of pending) {
      attempted.current.add(payment.txHash)

      void (async () => {
        const verifiedAt = new Date().toISOString()
        try {
          const receipt = await client.getTransactionReceipt({
            hash: payment.txHash,
          })

          if (receipt.status === 'success') {
            // Check for USDC Transfer log
            const transferLog = receipt.logs.find(
              log =>
                log.address.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
                log.topics[0] === TRANSFER_TOPIC,
            )
            onUpdate(payment.id, {
              txStatus: 'confirmed',
              confirmedAt: payment.confirmedAt ?? verifiedAt,
              receiptVerifiedAt: verifiedAt,
              transferLogFound: transferLog !== undefined,
            })
          } else {
            // Receipt present but execution reverted
            onUpdate(payment.id, {
              txStatus: 'failed',
              receiptVerifiedAt: verifiedAt,
              transferLogFound: false,
            })
          }
        } catch {
          // Receipt not yet available, RPC error, or network issue —
          // stamp the attempt time so the UI can show "last checked at …"
          // but leave txStatus as 'pending' so we retry on next mount.
          attempted.current.delete(payment.txHash) // allow retry next session
          onUpdate(payment.id, {
            receiptVerifiedAt: verifiedAt,
          })
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, payments.length])
}
