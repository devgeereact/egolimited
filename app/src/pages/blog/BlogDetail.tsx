import PageSkeleton from "@/components/ego/PageSkeleton"
import { FileText } from "lucide-react"

export default function BlogDetail() {
  return (
    <PageSkeleton
      title="Blog Post"
      area="Admin"
      icon={FileText}
      description="Single blog post."
      todo={["Cover", "Title + meta", "Body", "Related posts"]}
    />
  )
}
