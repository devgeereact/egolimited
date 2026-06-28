// Single source of EGO LTD corporate copy for the public site.
export const company = {
  name: "EGO LTD",
  shortName: "EGO",
  tagline: "The jobs that need doing, done properly.",
  promise:
    "We do the jobs that need doing, the way they should be done, including the ones nobody else wants.",
  intro:
    "EGO LTD is a general maintenance company for homes and commercial property. We handle reactive repairs, planned upkeep, and the small jobs other firms turn down. One number to call, a fair price up front, and the work done when we say it will be.",
  phone: "07539 705576",
  email: "hello@egolimited.com",
  emergencyPhone: "07539 705576",
  address: "11 Halesworth Road, London SE13 7TJ",
  hours: "Monday to Friday, 8am to 6pm. Out-of-hours cover by arrangement.",
  companyReg: "Registered in England & Wales",
  tagline2: "",
}

export interface Pillar { title: string; body: string; examples: string[]; turnaround: string }
export const pillars: Pillar[] = [
  {
    title: "Reactive repairs",
    body: "Something has broken and you need it sorted. We attend, diagnose, and fix it, or tell you straight if it needs a specialist. One call covers most household and commercial maintenance.",
    examples: ["Leaks, dripping taps, and running toilets","Doors that stick, drop, or will not lock","Loose fittings, fixings, and broken handles","Make-safe and quick fixes after a fault"],
    turnaround: "Most repairs booked the same week",
  },
  {
    title: "Planned upkeep",
    body: "Scheduled maintenance that keeps a property safe and cheaper to run, and stops small faults turning into big bills. Planned work costs a fraction of an emergency call-out.",
    examples: ["Scheduled inspections and servicing","Seasonal checks before winter and summer","Gutters, seals, and exterior upkeep","A written record kept for each property"],
    turnaround: "A schedule built around the building",
  },
  {
    title: "The small jobs",
    body: "The half-day and odd jobs nobody else will book in. Shelving, sealing, patching, adjusting, mounting, touching up. We book them in, and we turn up.",
    examples: ["Shelving, mirrors, and TVs mounted level","Sealing baths, basins, and splashbacks","Filling, patching, and touching up","Flat-pack built square and solid"],
    turnaround: "Book a list in for one visit",
  },
]

export interface Service { slug: string; name: string; summary: string; body: string[]; points: string[]; goodToKnow?: string }
export const services: Service[] = [
  { slug: "carpentry-joinery", name: "Carpentry & Joinery",
    summary: "Doors, locks, shelving, skirting, flat-pack, and timber repairs. Hung level, fixed solid.",
    body: ["From a door that will not lock to a wall of shelving that has to carry real weight, our carpentry work is measured, level, and built to last. We rehang doors, fit and repair locks, run skirting and architrave, assemble flat-pack properly, and make good tired or damaged timber.","Most carpentry jobs are booked in the same week. We turn up with the tools and fixings for the job, do the work cleanly, and clear up the offcuts and dust before we leave."],
    points: ["Doors rehung, eased, and locks fitted","Shelving and storage that carries its load","Skirting, architrave, and timber repairs","Flat-pack assembled square and solid"],
    goodToKnow: "Most jobs booked the same week." },
  { slug: "painting-decorating", name: "Painting & Decorating",
    summary: "Touch-ups to full rooms, exterior woodwork, filling and making good. Tidy, dust-aware work.",
    body: ["Good decorating is mostly preparation. We fill, sand, and make good before a brush touches the wall, so the finish lasts rather than flaking off in a season. We take on single rooms, full repaints, and exterior woodwork.","We protect floors and furniture, keep dust down, and leave the room ready to use. For landlords and agents we work to clean, neutral finishes that turn a property around quickly between tenancies."],
    points: ["Single rooms through to full repaints","Exterior woodwork protected and finished","Proper filling and making good first","Floors and furniture covered, dust kept down"],
    goodToKnow: "Tidy, dust-aware work." },
  { slug: "minor-plumbing", name: "Minor Plumbing",
    summary: "Taps, leaks, seals, toilets, and appliance connections. Non-gas work, done quickly.",
    body: ["A dripping tap, a running toilet, or a leaking trap is the kind of small fault that wastes water and gets worse if left. We handle taps, traps, seals, toilet repairs, and appliance connections, and we reseal baths and basins so they stop letting water behind the tiles.","This is non-gas plumbing. Anything that touches the gas supply is carried out by a Gas Safe registered engineer, which we arrange where a job needs one."],
    points: ["Taps, traps, seals, and leaks sorted","Toilet repairs and running cisterns","Washing machine and appliance connections","Baths and basins resealed properly"],
    goodToKnow: "Non-gas work only. Gas is left to a Gas Safe engineer." },
  { slug: "walls-tiling", name: "Walls & Tiling",
    summary: "Patching, re-grouting, sealing, and splashbacks. Clean lines, no mess left behind.",
    body: ["Cracked plaster, tired grout, and failing sealant make a room look neglected and let damp creep in. We patch and fill walls, re-grout and re-seal tiling, and fit splashbacks so kitchens and bathrooms look cared for and stay watertight.","We cut clean lines, match existing finishes where we can, and clear the dust and debris before we go."],
    points: ["Plaster patching and filling","Re-grouting and re-sealing tiled areas","Splashbacks measured and fitted","Clean lines, mess cleared away"],
    goodToKnow: "Clean lines, no mess." },
  { slug: "exterior-grounds", name: "Exterior & Grounds",
    summary: "Gutter clearing, fencing, pressure washing, and general grounds upkeep through the seasons.",
    body: ["The outside of a property is where small problems start. Blocked gutters overflow and soak walls, loose fence panels come down in the first storm, and paths turn green and slippery. We clear gutters and check downpipes, repair and replace fencing, pressure wash paths and patios, and keep grounds in order.","Seasonal packages are available, so the right work happens before each season rather than after the damage is done."],
    points: ["Gutters cleared, downpipes checked","Fencing repaired and replaced","Pressure washing for paths and patios","Seasonal grounds upkeep"],
    goodToKnow: "Seasonal packages available." },
  { slug: "mounting-fitting", name: "Mounting & Fitting",
    summary: "TVs, blinds, handrails, signage, and white goods. Secure and level, every time.",
    body: ["Mounting looks simple until a TV comes off the wall or a handrail works loose. We fix into the right substrate with the right fixings, so what we mount stays put. TVs, blinds, handrails, signage, and white goods all fitted secure and level.","We check the wall before we drill, route cables tidily where we can, and leave the fitting safe to use straight away."],
    points: ["TVs mounted level on the right fixings","Blinds and curtain poles fitted true","Handrails and grab rails fixed solid","Signage and white goods installed safely"],
    goodToKnow: "Secure and level, guaranteed." },
  { slug: "property-turnarounds", name: "Property Turnarounds",
    summary: "Pre-tenancy snag lists, end-of-tenancy repairs, and void works, priced per property.",
    body: ["Empty days cost landlords money. When a tenancy ends, you often have a list of small repairs, touch-ups, and snags that each need doing before the next tenant moves in. We take the whole list, give you one price, and turn the property around in as few visits as possible.","We keep a clear record of what was done at each property, so you and your agent have proof the work was completed."],
    points: ["End-of-tenancy repair lists handled in one go","Pre-tenancy snagging and making good","Void works priced per property","Clear record of work kept for each address"],
    goodToKnow: "Priced per property." },
  { slug: "planned-maintenance", name: "Planned Maintenance",
    summary: "Scheduled inspections and upkeep for landlords, agents, and commercial sites.",
    body: ["Planned maintenance is the cheapest maintenance there is. A scheduled visit catches the failing seal, the blocked gutter, and the worn fitting before they cause real damage and an emergency call-out. We agree a schedule that suits the building, then carry out each visit without you having to chase.","For landlords, agents, and commercial sites we keep a record of everything done at each property, and handle reactive repairs at a preferred rate between scheduled visits."],
    points: ["A schedule built around the property","Reactive repairs at a preferred rate","A record of work kept per property","One contact across a whole portfolio"],
    goodToKnow: "Best value over a year for managed property." },
]

export interface Package { name: string; badge?: string; blurb: string; features: string[] }
export const packages: Package[] = [
  { name: "Pay-as-you-go repairs", blurb: "No commitment. Call when you need something fixed. You get a price up front and the work done at a fair rate. Ideal for homeowners and one-off jobs.",
    features: ["Call when you need us","Price agreed before we start","Most jobs same week","No contract, no minimum"] },
  { name: "Property care plan", badge: "Recommended for landlords", blurb: "A simple monthly or quarterly arrangement. We carry out scheduled checks and upkeep, handle reactive repairs at a preferred rate, and keep a record of everything done at each property.",
    features: ["Scheduled checks and upkeep","Reactive repairs at a preferred rate","Full record kept per property","One contact for every job"] },
  { name: "Commercial planned maintenance", blurb: "A tailored schedule for offices, shops, and managed sites. We inspect, service, and maintain the assets that cause expensive trouble when they fail. Planned work is far cheaper than emergency repairs and downtime.",
    features: ["Schedule tailored to the site","Assets tracked and serviced","Work around your trading hours","Clear reporting for facilities teams"] },
]

export interface PriceRow { basis: string; rate: string; notes: string }
export const pricing: PriceRow[] = [
  { basis: "Call-out / first hour", rate: "Price on request", notes: "Covers attendance and the first hour on site" },
  { basis: "Hourly rate", rate: "Price on request", notes: "After the first hour, billed in 30-minute blocks" },
  { basis: "Half-day", rate: "Price on request", notes: "Up to 4 hours, best value for a job list" },
  { basis: "Full day", rate: "Price on request", notes: "Up to 8 hours on site" },
  { basis: "Materials", rate: "At cost, itemised", notes: "Itemised on the invoice, receipts available" },
]

export interface Sector { name: string; worry: string; blurb: string; provides: string[] }
export const sectors: Sector[] = [
  { name: "Homeowners", worry: "Being overcharged, mess, no-shows", blurb: "Fair, fixed prices, tidy work, and a firm that turns up when it says it will. Honest help with the jobs around the house that never get done.",
    provides: ["A fixed price or clear estimate before we start","Tidy work, with floors and furniture protected","One number for every job around the house","Honest advice when a job needs a specialist"] },
  { name: "Landlords", worry: "Void time, tenant complaints, compliance", blurb: "Fast turnarounds between tenancies, one contact for every repair, and a clear record kept of the work at each property.",
    provides: ["Quick turnarounds to cut void days","Reactive repairs at a preferred rate","A clear record of work kept per property","Compliance-aware, safety-first maintenance"] },
  { name: "Letting & managing agents", worry: "Reliability across many properties", blurb: "Planned schedules, reactive cover, and clear reporting across a portfolio, so you are not chasing five trades for five small jobs.",
    provides: ["Planned schedules across the whole portfolio","One point of contact, not five trades to chase","Clear reporting after every visit","Reactive cover between scheduled works"] },
  { name: "Commercial & facilities", worry: "Downtime, safety, accountability", blurb: "Planned maintenance that prevents costly breakdowns, work scheduled around trading hours, and an audit trail for every site.",
    provides: ["Work scheduled around your trading hours","Planned upkeep that prevents breakdowns","Assets tracked, serviced, and recorded","A full audit trail for every site"] },
]

export const proofPoints: string[] = [
  "One number for repairs, planned upkeep, and the small jobs.",
  "Fixed or clearly estimated prices, agreed before we start.",
  "Fully insured, with public liability cover in place.",
  "We turn up in the agreed window and tidy up before we leave.",
  "Honest about the limits of our trade. Gas and electrical work is done by certified specialists.",
]

export interface Step { n: string; title: string; body: string }
export const process: Step[] = [
  { n: "01", title: "Tell us what needs doing", body: "Call, email, or send a photo of the problem. The more we can see, the more accurate the price." },
  { n: "02", title: "We send a price and a date", body: "You get a fixed price or a clear estimate in writing, with a date we can keep. No surprises later." },
  { n: "03", title: "We turn up and do the work", body: "We attend in the agreed window, do the job properly, and keep you posted if anything changes." },
  { n: "04", title: "We tidy up and invoice clearly", body: "We leave the place clean, confirm you are happy, and send a simple, itemised invoice. Job done." },
]

export interface Trust { name: string; meaning: string }
export const trust: Trust[] = [
  { name: "Fully insured", meaning: "We carry public liability cover, in place on every job. Current certificates are available on request." },
  { name: "Priced in writing", meaning: "You get a fixed price or a clear estimate before we start, so there are no surprises on the invoice." },
  { name: "Regulated work done by specialists", meaning: "Gas work is carried out only by Gas Safe registered engineers, and notifiable electrical work only by qualified electricians. Where a job needs one, we arrange or recommend a certified specialist rather than cut corners." },
  { name: "Honest about our limits", meaning: "If a job is outside what we should take on, we say so. We would rather point you to the right trade than do work we are not the right people for." },
]
export const accreditations = trust

export interface Faq { q: string; a: string }
export const faqs: Faq[] = [
  { q: "Do you do gas or electrical work?", a: "We carry out general maintenance and minor, non-gas plumbing. Gas work is done only by Gas Safe registered engineers, and notifiable electrical work only by qualified electricians. Where a job needs one, we arrange or recommend a certified specialist." },
  { q: "How do you price a job?", a: "We quote per job wherever we can, so you know the cost before we start. For open-ended work we charge by the hour, half-day, or full day, and itemise materials on the invoice. You always get the price in writing first." },
  { q: "Are you insured?", a: "Yes. We carry public liability cover and it is in place on every job. We are happy to send the current certificate on request." },
  { q: "Will you take on small jobs?", a: "Yes. The small, awkward, half-day jobs are exactly what we built EGO to do. Send us the list and we will book it in." },
  { q: "How quickly can you come out?", a: "Most repairs and small jobs are booked within the same week, and we agree a window with you in advance. Out-of-hours cover is available by arrangement, with the call-out cost confirmed before we set off." },
  { q: "Do you cover commercial property as well as homes?", a: "Both. We work for homeowners, landlords, letting and managing agents, and commercial and facilities teams, on reactive repairs and planned maintenance alike." },
]

export interface Article { slug: string; title: string; date: string; excerpt: string; body: string[] }
export const articles: Article[] = [
  { slug: "winter-checklist-for-landlords", title: "A winter checklist for landlords", date: "2026-05-12",
    excerpt: "Five checks that stop a small winter problem turning into an expensive emergency.",
    body: ["Cold weather finds the weak points in any property. A short list of checks in autumn saves a scramble in January.","Bleed the radiators, lag exposed pipes, test the heating before you need it, clear the gutters, and check the seals on windows and doors. None of it takes long, and all of it is cheaper than an emergency call-out in the first frost.","If you would rather not work through the list yourself, this is exactly the kind of seasonal upkeep a planned-maintenance visit covers. We turn up before the cold does and put the property in good order."] },
  { slug: "planned-vs-reactive-maintenance", title: "Planned or reactive: what actually costs less", date: "2026-04-03",
    excerpt: "Fixing things only when they break feels cheaper. The numbers usually say otherwise.",
    body: ["Reactive maintenance has an obvious appeal: you only pay when something goes wrong. The hidden cost is the emergency premium, the rushed parts, the downtime, and the damage a failure causes before anyone arrives.","Industry guidance is consistent on this. Unplanned emergency repairs typically cost several times more than the same work done on a planned schedule, once you add it all up.","Planned maintenance spreads the cost evenly and catches faults early. For most managed property, a planned schedule with reactive cover for the unexpected is the cheaper position over a year."] },
  { slug: "what-to-expect-from-a-good-contractor", title: "What to expect from a good maintenance contractor", date: "2026-02-18",
    excerpt: "Turning up on time is the floor, not the ceiling. Here is the rest.",
    body: ["A good contractor confirms the price before starting, arrives in the window agreed, and leaves the place tidy. That much should be standard.","Beyond that, look for a clear record of work done, photos where they matter, and a single person you can call who knows your property.","And look for honesty about limits. A contractor who tells you straight when a job needs a certified specialist is one you can trust with the jobs they do take on. That is the difference between a one-off fix and a contractor you keep."] },
]

export const serviceSeo: Record<string, { title: string; description: string }> = {
  "carpentry-joinery": { title: "Carpentry & Joinery in London — EGO LTD", description: "Doors, locks, shelving, skirting, flat-pack and timber repairs across London. Hung level, fixed solid, tidied up after. Free quote from EGO LTD." },
  "painting-decorating": { title: "Painting & Decorating in London — EGO LTD", description: "Touch-ups to full rooms, exterior woodwork, filling and making good — tidy, dust-aware decorating across London. Free quote: call 07539 705576." },
  "minor-plumbing": { title: "Minor Plumbing & Leak Repairs in London — EGO LTD", description: "Taps, leaks, seals, toilets and appliance connections — non-gas plumbing done quickly across London. Fair, clear prices. Free quote from EGO LTD." },
  "walls-tiling": { title: "Tiling, Grouting & Wall Repairs in London — EGO LTD", description: "Patching, re-grouting, sealing and splashbacks across London — clean lines, no mess left behind. Get a fast, fair quote from EGO LTD maintenance." },
  "exterior-grounds": { title: "Exterior & Grounds Maintenance in London — EGO LTD", description: "Gutter clearing, fencing, pressure washing and grounds upkeep through the seasons, across London. Planned or one-off. Free quote from EGO LTD." },
  "mounting-fitting": { title: "TV Mounting & Fitting in London — EGO LTD", description: "TVs, blinds, handrails, signage and white goods mounted secure and level across London. Quick, tidy fitting. Get a free quote from EGO LTD." },
  "property-turnarounds": { title: "Property Turnarounds & Void Works, London — EGO LTD", description: "Pre-tenancy snags, end-of-tenancy repairs and void works, priced per property across London. Fast turnarounds for landlords and agents — EGO LTD." },
  "planned-maintenance": { title: "Planned Maintenance Contracts in London — EGO LTD", description: "Scheduled inspections and upkeep for landlords, agents and commercial sites across London. Stay ahead of repairs and compliance. Talk to EGO LTD." },
}

export const articleSeo: Record<string, { title: string; description: string }> = {
  "winter-checklist-for-landlords": { title: "Winter Maintenance Checklist for Landlords — EGO LTD", description: "A practical winter checklist for London landlords: protect pipes, roofs, gutters and tenants before the cold hits. From EGO LTD maintenance." },
  "planned-vs-reactive-maintenance": { title: "Planned vs Reactive Maintenance Explained — EGO LTD", description: "Planned or reactive maintenance — which saves London landlords and agents more money? A clear, no-jargon comparison from EGO LTD." },
  "what-to-expect-from-a-good-contractor": { title: "What to Expect From a Good Contractor — EGO LTD", description: "How to spot a maintenance contractor worth keeping: clear pricing, real insurance, tidy work and straight answers. A guide from EGO LTD, London." },
}

export const stats = [
  { n: "1", label: "Number for every job" },
  { n: "Same week", label: "On most repairs" },
  { n: "Fixed", label: "Prices, agreed up front" },
  { n: "Insured", label: "Public liability cover" },
]

export interface CounterStat { value: number; suffix?: string; label: string }
export const counters: CounterStat[] = [
  { value: 7, suffix: "", label: "Trades under one number" },
  { value: 24, suffix: "h", label: "Typical quote turnaround" },
  { value: 100, suffix: "%", label: "Jobs priced before we start" },
  { value: 4, suffix: "", label: "Sectors we look after" },
]

export interface Testimonial { quote: string; name: string; role: string; avatar?: string }
export const testimonials: Testimonial[] = [
  { quote: "They turned up in the window they gave me, fixed the door and two other things off my list, and the price was exactly what was quoted. First contractor in a while I would actually call again.", name: "Homeowner", role: "Lewisham, SE13" },
  { quote: "We use EGO across a small portfolio. One contact, repairs sorted between tenancies fast, and a clear record after every visit. It has taken the chasing out of my week.", name: "Landlord", role: "Greenwich, SE10" },
  { quote: "Planned maintenance scheduled around our trading hours, no surprises, and a proper paper trail for the facilities file. Exactly what we needed from a maintenance partner.", name: "Facilities manager", role: "Commercial site, SE1" },
  { quote: "I had a list of small jobs three other firms would not book in. EGO took the lot, did them in one visit, and tidied up after. Booked them back for the rest of the flat.", name: "Tenant", role: "Deptford, SE8" },
]

export interface TeamMember { role: string; name: string; line: string; photo: string }
export const team: TeamMember[] = [
  { role: "Your engineer", name: "On the tools", line: "Insured, vetted, and equipped for the job. Does the work properly and clears up before leaving.", photo: "/site/team/1.jpg" },
  { role: "Your coordinator", name: "On the phone", line: "One person who knows your property, books the work, and keeps you posted if anything changes.", photo: "/site/team/2.jpg" },
  { role: "Planned maintenance lead", name: "On schedule", line: "Builds the schedule around your building and makes sure each visit happens without you chasing.", photo: "/site/team/3.jpg" },
  { role: "Accounts", name: "On the paperwork", line: "Clear, itemised invoices and certificates on request. No vague bills, no surprises.", photo: "/site/team/4.jpg" },
]
