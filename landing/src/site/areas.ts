// Local area landing pages. Copy is deliberately localised so no two pages read
// the same. The 4-step "how it works" is reused from `process` in content.ts.
export interface AreaService { links: { to: string; label: string }[]; text: string }
export interface Area {
  slug: string; region: string; seoTitle: string; seoDescription: string; cardBlurb: string; intro: string
  services: AreaService[]; coverageIntro: string; coverageCta: { pre: string; linkLabel: string; post: string }
  boroughs: string[]; builtHeading: string; builtBody: string; insuredLink: boolean; whoSuffix: string
}

export const areas: Area[] = [
  {
    slug: "north-london", region: "North London",
    seoTitle: "Maintenance & Handyman in North London — EGO LTD",
    seoDescription: "Repairs, planned upkeep and small works across North London — Islington, Camden, Haringey, Barnet and more. Properly insured, fair prices. Call 07539 705576.",
    cardBlurb: "Victorian terraces, period conversions and mansion blocks from Islington and Camden up to Barnet and Enfield.",
    intro: "North London runs on Victorian terraces, period conversions and mansion blocks — the kind of property where a 'small job' is rarely as small as it looks behind the plaster. EGO LTD handles repairs, planned upkeep and the jobs other firms turn down, from Islington and Camden up to Barnet and Enfield. One dependable contact for the whole property, a clear price before we start, and the place left tidy when we leave.",
    services: [
      { links: [{ to: "/services/carpentry-joinery", label: "Carpentry & joinery" }], text: "doors, locks, shelving, skirting, flat-pack and timber repairs in period homes where nothing is quite square." },
      { links: [{ to: "/services/painting-decorating", label: "Painting & decorating" }], text: "touch-ups to full rooms, plus the filling and making-good that older walls always need." },
      { links: [{ to: "/services/minor-plumbing", label: "Minor plumbing" }], text: "taps, leaks, seals and toilets (non-gas), done quickly before a small drip becomes a ceiling." },
      { links: [{ to: "/services/walls-tiling", label: "Walls & tiling" }], text: "patching, re-grouting and splashbacks, clean lines, no mess left behind." },
      { links: [{ to: "/services/exterior-grounds", label: "Exterior & grounds" }], text: "gutter clearing and seasonal upkeep, which terraced roofs and shared gutters here genuinely need." },
      { links: [{ to: "/services/mounting-fitting", label: "Mounting & fitting" }], text: "TVs, blinds, handrails and white goods, secure and level on lath-and-plaster and modern walls alike." },
      { links: [{ to: "/services/property-turnarounds", label: "Property turnarounds" }, { to: "/services/planned-maintenance", label: "planned maintenance" }], text: "for landlords and agents managing portfolios across the north." },
    ],
    coverageIntro: "Islington, Camden, Hackney, Haringey, Barnet, Enfield and the neighbourhoods in between — Highbury, Finsbury Park, Crouch End, Muswell Hill, Stoke Newington, Tottenham, Archway and Kentish Town.",
    coverageCta: { pre: "If you're north of the river and not sure you're in our patch, ", linkLabel: "ask us", post: " — we'll tell you straight." },
    boroughs: ["Islington", "Camden", "Hackney", "Haringey", "Barnet", "Enfield"],
    builtHeading: "Built for the property up here",
    builtBody: "Period conversions and mansion flats come with shared access, awkward staircases and original features worth protecting. We work dust-aware, we don't damage what we don't need to, and we're properly insured for working in occupied and tenanted homes.",
    insuredLink: true, whoSuffix: "commercial or facilities teams running sites across the north.",
  },
  {
    slug: "south-london", region: "South London",
    seoTitle: "Maintenance & Handyman in South London — EGO LTD",
    seoDescription: "Repairs, upkeep and small works across South London — Clapham, Brixton, Wandsworth, Lewisham, Croydon and more. Insured, fair prices. Call 07539 705576.",
    cardBlurb: "Victorian terraces, riverside new-builds and ex-local-authority blocks across Lambeth, Southwark, Wandsworth and Lewisham.",
    intro: "From the Victorian terraces of Clapham and Dulwich to the new-build riverside flats along the south bank and the ex-local-authority blocks further out, South London is a patchwork of property — and each type needs maintenance done a little differently. EGO LTD covers repairs, planned upkeep and the small jobs other firms won't take, across Lambeth, Southwark, Wandsworth, Lewisham and beyond. Fair prices, properly insured, finished and tidied.",
    services: [
      { links: [{ to: "/services/carpentry-joinery", label: "Carpentry & joinery" }], text: "doors, locks, shelving, flat-pack and timber repairs, hung level and fixed solid." },
      { links: [{ to: "/services/painting-decorating", label: "Painting & decorating" }], text: "single rooms to whole flats, exterior woodwork, filling and making good." },
      { links: [{ to: "/services/minor-plumbing", label: "Minor plumbing" }], text: "taps, leaks, seals, toilets and appliance connections (non-gas), done quickly." },
      { links: [{ to: "/services/walls-tiling", label: "Walls & tiling" }], text: "re-grouting, sealing, patching and splashbacks, no mess left behind." },
      { links: [{ to: "/services/exterior-grounds", label: "Exterior & grounds" }], text: "gutter clearing, fencing, pressure washing and seasonal upkeep." },
      { links: [{ to: "/services/mounting-fitting", label: "Mounting & fitting" }], text: "TVs, blinds, handrails, signage and white goods, secure and level." },
      { links: [{ to: "/services/property-turnarounds", label: "Property turnarounds" }, { to: "/services/planned-maintenance", label: "planned maintenance" }], text: "for the landlords and agents who keep South London let." },
    ],
    coverageIntro: "Lambeth, Southwark, Wandsworth, Lewisham, Greenwich and Croydon — including Clapham, Brixton, Peckham, Dulwich, Streatham, Balham, Tooting, Camberwell and Blackheath.",
    coverageCta: { pre: "", linkLabel: "Tell us your postcode", post: " and we'll confirm we cover you." },
    boroughs: ["Lambeth", "Southwark", "Wandsworth", "Lewisham", "Greenwich", "Croydon"],
    builtHeading: "Built for the property down here",
    builtBody: "New-build flats need fittings that hold on plasterboard; period conversions need a careful hand around original features; void and end-of-tenancy work needs to move fast between tenancies. We price each property on what's actually in front of us — not a guess.",
    insuredLink: false, whoSuffix: "commercial and facilities teams across the south.",
  },
  {
    slug: "east-london", region: "East London",
    seoTitle: "Maintenance & Handyman in East London — EGO LTD",
    seoDescription: "Repairs, upkeep and small works across East London — Hackney, Tower Hamlets, Stratford, Walthamstow, Canary Wharf and more. Insured. Call 07539 705576.",
    cardBlurb: "Warehouse conversions, Canary Wharf high-rises and Walthamstow terraces across Tower Hamlets, Hackney, Newham and Waltham Forest.",
    intro: "East London swings from warehouse conversions in Shoreditch and high-rise flats in Canary Wharf and Stratford to the Victorian terraces of Walthamstow and Leyton. EGO LTD handles repairs, planned upkeep and the small jobs other firms turn down across Tower Hamlets, Hackney, Newham and Waltham Forest — one contact for the whole property, a clear price up front, and a tidy finish.",
    services: [
      { links: [{ to: "/services/carpentry-joinery", label: "Carpentry & joinery" }], text: "doors, locks, shelving, skirting, flat-pack and timber repairs." },
      { links: [{ to: "/services/painting-decorating", label: "Painting & decorating" }], text: "touch-ups to full rooms, exterior woodwork, filling and making good." },
      { links: [{ to: "/services/minor-plumbing", label: "Minor plumbing" }], text: "taps, leaks, seals, toilets and appliance connections (non-gas)." },
      { links: [{ to: "/services/walls-tiling", label: "Walls & tiling" }], text: "patching, re-grouting, sealing and splashbacks." },
      { links: [{ to: "/services/exterior-grounds", label: "Exterior & grounds" }], text: "gutter clearing, fencing, pressure washing and seasonal upkeep." },
      { links: [{ to: "/services/mounting-fitting", label: "Mounting & fitting" }], text: "TVs, blinds, handrails, signage and white goods, secure and level." },
      { links: [{ to: "/services/property-turnarounds", label: "Property turnarounds" }, { to: "/services/planned-maintenance", label: "planned maintenance" }], text: "for the agents and landlords managing East London's fast-moving rental market." },
    ],
    coverageIntro: "Tower Hamlets, Hackney, Newham and Waltham Forest — including Shoreditch, Bethnal Green, Bow, Stratford, Walthamstow, Leyton, the Docklands and Canary Wharf.",
    coverageCta: { pre: "Not sure you're in our patch? ", linkLabel: "Ask us", post: "." },
    boroughs: ["Tower Hamlets", "Hackney", "Newham", "Waltham Forest"],
    builtHeading: "Built for the property out east",
    builtBody: "High-rise flats often mean concierge access, lift bookings and strict working hours; warehouse conversions hide surprises behind exposed brick and steel; terraces need the usual period care. We work around building rules and tenants, and we're properly insured for managed blocks and commercial sites.",
    insuredLink: true, whoSuffix: "commercial and facilities teams across the east.",
  },
]

export function areaBySlug(slug: string | undefined): Area | undefined {
  return areas.find((a) => a.slug === slug)
}
