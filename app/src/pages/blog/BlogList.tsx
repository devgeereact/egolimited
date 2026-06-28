import PageSkeleton from "@/components/ego/PageSkeleton"
import { Newspaper } from "lucide-react"

export default function BlogList() {
  return (
    <PageSkeleton
      title="Blog"
      area="Admin"
      icon={Newspaper}
      description="Blog post list."
      todo={["Post cards", "Search/tags", "New post"]}
    />
  )
}
