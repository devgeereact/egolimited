import { Link, Route, Routes } from "react-router-dom";

const SERVICES = [
  "Carpentry & joinery",
  "Painting & decorating",
  "Minor plumbing",
  "Tiling",
  "Exterior works",
  "Planned upkeep",
];

function Nav() {
  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-bold tracking-tight">
          EGO<span className="text-brand">.</span>LTD
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-soft">
          <Link to="/services" className="hover:text-ink">Services</Link>
          <Link to="/areas" className="hover:text-ink">Areas</Link>
          <a
            href="tel:+447539705576"
            className="rounded-full bg-brand px-4 py-2 font-medium text-white hover:bg-brand-strong"
          >
            Get a quote
          </a>
        </nav>
      </div>
    </header>
  );
}

function Home() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">
        Property maintenance · London
      </p>
      <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
        Dependable maintenance, done properly — one clear price, a date we keep.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-ink-soft">
        Carpentry, painting, minor plumbing, tiling, exterior works and planned
        upkeep for homeowners, landlords and agents. Properly insured.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="tel:+447539705576"
          className="rounded-full bg-brand px-6 py-3 font-medium text-white hover:bg-brand-strong"
        >
          Get a free quote
        </a>
        <Link
          to="/services"
          className="rounded-full border border-line px-6 py-3 font-medium hover:border-ink"
        >
          See services
        </Link>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-bold">Services</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {SERVICES.map((s) => (
          <li
            key={s}
            className="rounded-xl border border-line bg-paper-raised p-5 font-medium"
          >
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Areas() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-bold">Areas we cover</h1>
      <p className="mt-4 text-ink-soft">North, South, East and West London.</p>
    </section>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/areas" element={<Areas />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
