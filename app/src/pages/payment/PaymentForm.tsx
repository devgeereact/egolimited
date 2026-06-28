import PageSkeleton from "@/components/ego/PageSkeleton"
import { CreditCard } from "lucide-react"

export default function PaymentForm() {
  return (
    <PageSkeleton
      title="Payment"
      area="Admin"
      icon={CreditCard}
      description="Payment capture form."
      todo={["Amount", "Method", "Reference", "Date", "Record payment"]}
    />
  )
}
