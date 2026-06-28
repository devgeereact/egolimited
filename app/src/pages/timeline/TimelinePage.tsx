import PageSkeleton from "@/components/ego/PageSkeleton"
import { GitCommitVertical } from "lucide-react"

export default function TimelinePage() {
  return (
    <PageSkeleton
      title="Timeline"
      area="Admin"
      icon={GitCommitVertical}
      description="Activity timeline."
      todo={["Vertical timeline", "Grouped by date", "Item types + icons"]}
    />
  )
}
