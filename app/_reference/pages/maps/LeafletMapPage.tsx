import PageSkeleton from "@/components/ego/PageSkeleton"
import { Map } from "lucide-react"

export default function LeafletMapPage() {
  return (
    <PageSkeleton
      title="Map"
      area="Admin"
      icon={Map}
      description="Leaflet job-location map."
      todo={["Leaflet map (react-leaflet)", "Job pins", "Popup detail", "Filter"]}
    />
  )
}
