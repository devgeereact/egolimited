import { Navigate, NavLink, Route, Routes } from "react-router-dom";

// Placeholder field-service shell. Routes mirror the deployed app
// (/welcome, /jobs, …) — swap the screens for real ones per milestone.
function Shell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="flex items-center gap-3 border-b border-surface-border px-5 py-4">
        <span className="grid size-9 place-items-center rounded-xl bg-pulse font-bold text-white">
          E
        </span>
        <div>
          <p className="text-sm font-semibold leading-none">EGO Engineer</p>
          <p className="text-xs text-ink-muted">Field Service</p>
        </div>
      </header>

      <main className="flex-1 px-5 py-6">
        <h1 className="mb-4 text-xl font-semibold">{title}</h1>
        {children}
      </main>

      <nav className="grid grid-cols-3 border-t border-surface-border text-center text-xs">
        {[
          { to: "/welcome", label: "Home" },
          { to: "/jobs", label: "Jobs" },
          { to: "/invoices", label: "Invoices" },
        ].map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `py-3 ${isActive ? "text-pulse" : "text-ink-muted"}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface-raised p-4 text-ink-muted">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
      <Route
        path="/welcome"
        element={
          <Shell title="Welcome">
            <Card>Scaffold ready. Wire auth against the PHP API (port 8080 / live same-origin).</Card>
          </Shell>
        }
      />
      <Route
        path="/jobs"
        element={
          <Shell title="Jobs">
            <Card>Job list + status state machine goes here.</Card>
          </Shell>
        }
      />
      <Route
        path="/invoices"
        element={
          <Shell title="Invoices">
            <Card>Invoice numbering, totals and VAT come from the API.</Card>
          </Shell>
        }
      />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
}
