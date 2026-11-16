// ─── Status enums ─────────────────────────────────────────────────────────────

export type WorkStage =
  | 'mobilisation'
  | 'site_prep'
  | 'foundation'
  | 'structure'
  | 'envelope'
  | 'mep'       // mechanical, electrical, plumbing
  | 'fit_out'
  | 'finishing'
  | 'commissioning'
  | 'handover'

export type MilestoneStatus = 'completed' | 'in_progress' | 'pending' | 'overdue' | 'on_hold'

export type ApprovalStatus =
  | 'approved'          // inspector sign-off received
  | 'pending_inspection'
  | 'inspection_booked' // date set, not yet done
  | 'rejected'          // inspector raised defects
  | 'not_required'      // e.g. mobilisation admin tasks

export type PaymentStatus = 'paid' | 'pending' | 'processing' | 'failed'

export type ProjectStatus = 'active' | 'completed' | 'paused'

// Marks whether a value is real on-chain state or demo/simulated data
export type DataSource = 'simulated' | 'onchain'

// ─── Domain objects ───────────────────────────────────────────────────────────

export interface Milestone {
  id: string
  projectId: string
  title: string
  description: string
  workStage: WorkStage
  dueDate: string
  completedDate?: string
  status: MilestoneStatus
  approvalStatus: ApprovalStatus
  inspectorName?: string
  inspectionDate?: string
  permitRef?: string             // e.g. "BLDG-2026-0441"
  paymentAmount: number          // USDC, displayed with 2 decimals
  paymentStatus: PaymentStatus
  contractor: string             // firm or individual responsible
  deliverables: string[]
  completion: number             // 0–100
  dependencies: string[]
  tags: string[]
}

export interface Payment {
  id: string
  projectId: string
  milestoneId?: string
  date: string
  amount: number
  status: PaymentStatus
  source: DataSource             // 'simulated' | 'onchain'
  txHash?: string                // only present on real on-chain txns
  arcExplorerUrl?: string        // constructed from txHash when source='onchain'
  recipient: string
  description: string
}

export interface Project {
  id: string
  name: string
  client: string                 // owner / principal
  contractor: string             // main contractor firm
  location: string
  projectType: 'commercial' | 'infrastructure' | 'residential' | 'industrial'
  status: ProjectStatus
  currentStage: WorkStage
  totalBudget: number
  paidOut: number
  startDate: string
  endDate: string
  milestones: Milestone[]
  payments: Payment[]
  description: string
  team: string[]                 // named contacts
  permitNumbers: string[]
}

export type NavView = 'overview' | 'milestones' | 'payments' | 'timeline'
