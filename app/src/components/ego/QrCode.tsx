import { useEffect, useState } from "react"
import QRCode from "qrcode"

import { cn } from "@/lib/utils"

interface Props {
  value: string
  size?: number
  className?: string
  /** alt + downloaded filename stem */
  label?: string
}

/**
 * Renders a scannable QR for a URL, client-side (no third party — GDPR-safe).
 * Used for the customer job-tracking link on the job page + portal.
 */
export default function QrCode({ value, size = 160, className, label = "tracking" }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => { if (alive) setSrc(url) })
      .catch(() => { if (alive) setSrc(null) })
    return () => { alive = false }
  }, [value, size])

  if (!src) return <div className={cn("animate-pulse rounded-lg bg-muted", className)} style={{ width: size, height: size }} />

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={`${label} QR code`}
      className={cn("rounded-lg bg-white p-1.5 ring-1 ring-border", className)}
    />
  )
}
