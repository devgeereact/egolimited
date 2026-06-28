import PageSkeleton from "@/components/ego/PageSkeleton"
import { Factory } from "lucide-react"

export default function ProductionBoard() {
  return (
    <PageSkeleton
      title="Production Board"
      area="Admin"
      icon={Factory}
      description="Production / workflow board."
      todo={["Stage columns", "Job cards by stage", "Drag between stages"]}
    />
  )
}
