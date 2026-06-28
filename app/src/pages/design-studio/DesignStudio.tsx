import PageSkeleton from "@/components/ego/PageSkeleton"
import { Palette } from "lucide-react"

export default function DesignStudio() {
  return (
    <PageSkeleton
      title="Design Studio"
      area="Admin"
      icon={Palette}
      description="Company content & marketing studio (social posts, campaigns)."
      todo={["Content canvas (tiptap)", "Templates", "Asset library (file-manager)", "Campaign planner", "Schedule/export"]}
    />
  )
}
