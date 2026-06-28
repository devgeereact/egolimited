import Button from "@/components/ui/button"
import { useEffect, useState } from "react"

export default function StickyCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button className="shadow-2xl px-6 py-3">
        Buy Pulse UI
      </Button>
    </div>
  )
}