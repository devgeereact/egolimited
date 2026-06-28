export default function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="flex h-14 items-center justify-between px-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} <span className="font-medium text-foreground">EGO LIMITED</span> · Field service management</span>
        <span className="hidden sm:inline">Times shown in your local timezone</span>
      </div>
    </footer>
  )
}
