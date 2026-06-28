import PageSkeleton from "@/components/ego/PageSkeleton"
import { Users } from "lucide-react"

export default function TeamsBoard() {
  return (
    <PageSkeleton
      title="Teams Board"
      area="Admin"
      icon={Users}
      description="Team overview board."
      todo={["Team cards", "Members", "Roles/status"]}
    />
  )
}
