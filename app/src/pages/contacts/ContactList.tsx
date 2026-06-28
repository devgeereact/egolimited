import PageSkeleton from "@/components/ego/PageSkeleton"
import { Contact } from "lucide-react"

export default function ContactList() {
  return (
    <PageSkeleton
      title="Contacts"
      area="Admin"
      icon={Contact}
      description="Contact directory."
      todo={["Search", "Contact table", "Detail drawer", "New contact"]}
    />
  )
}
