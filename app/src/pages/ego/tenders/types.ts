export type TenderStatus = "new" | "shortlisted" | "rejected" | "bid" | "won" | "lost"

export interface Tender {
  id: number
  ocid: string
  title: string
  description?: string | null
  buyer: string | null
  buyer_email: string | null
  cpv: string | null
  cpv_label: string | null
  value_amount: number | null
  currency: string | null
  postcode: string | null
  region: string | null
  sme: number
  category: string | null
  match_reason: string | null
  url: string | null
  published_at: string | null
  deadline_at: string | null
  status: TenderStatus
  customer_id: number | null
}

/**
 * The order is the triage order, not the lifecycle order. "Open" is first and selected by default
 * because an untriaged notice with a deadline is the only thing on this screen that can cost money
 * by being ignored.
 */
export const TENDER_TABS: { key: TenderStatus; label: string; help: string }[] = [
  { key: "new", label: "Open", help: "Found for us. Nobody has looked yet." },
  { key: "shortlisted", label: "Shortlisted", help: "Worth bidding. Now in the Pipeline with a deadline." },
  { key: "bid", label: "Bid", help: "We put a price in. Waiting to hear." },
  { key: "won", label: "Won", help: "We got it." },
  { key: "lost", label: "Lost", help: "We bid and didn't get it." },
  { key: "rejected", label: "Not for us", help: "Looked, said no. Kept so we don't look twice." },
]
