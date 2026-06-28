import PageSkeleton from "@/components/ego/PageSkeleton"
import { MessageSquare } from "lucide-react"

export default function PortalContact() {
  return (
    <PageSkeleton
      title="Contact"
      area="Customer"
      icon={MessageSquare}
      description="Customer message box to the office."
      todo={["Message box", "Submit creates messages record"]}
    />
  )
}
