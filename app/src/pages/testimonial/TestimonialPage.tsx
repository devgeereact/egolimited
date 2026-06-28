import PageSkeleton from "@/components/ego/PageSkeleton"
import { Quote } from "lucide-react"

export default function TestimonialPage() {
  return (
    <PageSkeleton
      title="Testimonials"
      area="Admin"
      icon={Quote}
      description="Customer testimonials."
      todo={["Testimonial cards", "Rating", "Add/edit"]}
    />
  )
}
