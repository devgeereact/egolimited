import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

type Code = 400 | 403 | 404 | 500 | 503

const COPY: Record<Code, { title: string; body: string }> = {
  400: {
    title: "Bad request",
    body: "Something about that request didn't look right. Try again, or head back.",
  },
  403: {
    title: "No access",
    body: "Your account doesn't have permission to view this. If that's wrong, ask an admin.",
  },
  404: {
    title: "Page not found",
    body: "The page you're after has moved or never existed. Let's point you somewhere useful.",
  },
  500: {
    title: "Something went wrong",
    body: "An unexpected error stopped that page loading. A reload usually clears it.",
  },
  503: {
    title: "Temporarily unavailable",
    body: "The service is briefly offline (maintenance or heavy load). Try again shortly.",
  },
}

export default function ErrorPage({
  code = 404,
  home = "/",
  detail,
  onReload,
}: {
  code?: Code
  home?: string
  detail?: string
  onReload?: () => void
}) {
  const c = COPY[code]
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-24 text-center">
      <div className="bg-gradient-to-br from-foreground to-accent bg-clip-text font-serif text-8xl font-bold tracking-tight text-transparent md:text-9xl">
        {code}
      </div>
      <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight">{c.title}</h1>
      <p className="mt-2 max-w-md text-pretty text-muted-foreground">{detail || c.body}</p>
      <div className="mt-8 flex gap-3">
        {onReload && (
          <Button onClick={onReload}>Reload</Button>
        )}
        <Button asChild variant={onReload ? "outline" : "default"}>
          <Link to={home}>{home.startsWith("/app") ? "Back to dashboard" : "Back to home"}</Link>
        </Button>
      </div>
    </section>
  )
}
