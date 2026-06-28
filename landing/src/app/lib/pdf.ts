// PDF generation is an app-side concern. On the public site the portal PDF
// buttons fall back to a friendly notice rather than pulling in a heavy PDF
// dependency. (The real invoice/statement PDFs live in the EGO app.)
import { toast } from "sonner"

export function payeeFromSettings(_settings?: Record<string, string>): Record<string, string> {
  return _settings ?? {}
}

export function documentPdf(_opts: unknown) {
  toast.message("Download from your account", { description: "Sign in to the EGO app to download this document." })
}

export function statementPdf(_opts: unknown) {
  toast.message("Download from your account", { description: "Sign in to the EGO app to download your statement." })
}
