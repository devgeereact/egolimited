A page-by-page conversion teardown of the live EGO LTD marketing site, written against the actual React pages and `content.ts` copy, not a guess at what's there. The site is genuinely well built: warm Stone & Ember design, plain-British copy, honest proof points, and a real wedge (per-property record, live tracking, fixed price in writing). The job below is to turn that into more booked work. The recurring theme is **CTA discipline** and **surfacing the proof earlier** — the trust signals are strong but mostly buried below the fold or split across pages.

## Conversion goals & the CTA hierarchy

EGO has three conversion actions, and they're not equal in value:

| Goal | Value | Who | Where it should win |
|------|-------|-----|---------------------|
| **Phone call** (`tel:07539 705576`) | High, instant | Homeowners + urgent jobs | Mobile, hero, sticky bar, every page foot |
| **Contact-form enquiry** (`/contact` → `/api/enquiry`) | High, considered | All, esp. desktop researchers | Hero primary, nav button, page banners |
| **Book a portfolio chat** (B2B) | **Highest LTV** — recurring revenue | Landlords, agents, facilities | Currently **does not exist as a distinct CTA** |

The single biggest strategic gap: the **primary prize is recurring B2B**, but the site offers B2B visitors the exact same "Get a free quote" / "Get a quote" button as a homeowner with a dripping tap. There is no "Book a portfolio chat", "Talk to us about your portfolio" lands as a generic contact link on `/sectors` only (`Sectors.tsx` line 139), and the contact form has no way to say "I manage 40 units". A landlord and a homeowner are funnelled into the same low-context form. That's the headline fix.

### Per-page CTA recommendation

| Page | Primary CTA (keep/make) | Secondary CTA | Notes |
|------|------------------------|---------------|-------|
| Home | Get a free quote → `/contact` | Call `07539 705576` | Add a **third, B2B-specific** path ("Managing property? Book a portfolio chat") |
| Services | Get a free quote | Who we help | Good; per-service "Get a quote" is right |
| Service detail | Get a quote (sticky aside) | Call | Strong layout already |
| Sectors | **Split**: homeowner → quote; B2B → portfolio chat | Call / See services | This page is where B2B intent is highest — exploit it |
| Areas | Request free quote (CtaBand) | Call | Fine |
| Contact | Send enquiry | Call | Needs an "I manage property" toggle + photo upload |
| Track | Check status | Open portal | This is a *retention/proof* page, not acquisition — keep it that way |
| About | Get a free quote | See what we do | Add one review/proof block before the CTA |

---

## Home page teardown (`Home.tsx`)

The home page is long and well-sequenced. Order as built: Hero → 3 pillars (FeatureCards3) → AboutSplit → Services grid → Counter → Sectors → Reviews → Packages → How it works → Promises → FAQ → "New here / track / portal" → NewsletterBand.

**What helps conversion**
- **Hero is strong.** H1 "The jobs that need doing, **done properly.**" with the ember accent, a tight value paragraph, and *three* visible actions (Get a free quote / phone / Emergency call-out). The "Homes & commercial across South East London" pin badge is good local signalling.
- **Trust row directly under the hero CTAs** ("Fully insured · Fair, fixed prices · We turn up when we say · One number for every job", lines 122–134) — exactly the right four objections, answered above the fold.
- **The three pillars** (reactive / planned / small jobs) overlap the hero as raised cards — clear, scannable, each links to `/services`.
- **AboutSplit** frames the wedge well: "Most maintenance firms cherry-pick the big, easy installs... That gap is exactly where we work."
- **Reviews carousel** pulls live from `/api/public/reviews` with a bundled fallback — real social proof, by role + SE postcode (Lewisham SE13, Greenwich SE10), which reads as authentic local work.
- **The "New here / Track a job / My account" trio** (lines 511–556) is a genuinely smart, low-friction returning-customer path, and "no password to remember" is a nice differentiator.

**What hurts / leaks**
- **The app and live tracking — EGO's sharpest differentiator — is invisible until you're ~80% down the page.** The per-property record, live job-tracking link, and itemised VAT invoices are the wedge over every white-van competitor, yet none of it appears above the fold or in the hero trust row. A homeowner deciding in 8 seconds never learns EGO is more modern than the bloke who didn't call back.
- **The Counter band uses soft/unverifiable figures** (`content.ts` lines 594–599: "7 trades under one number", "24h typical quote turnaround", "100% jobs priced before we start", "4 sectors"). The code comments even flag these as "illustrative... not audited claims." "100%" and a hard "24h" are claims the brand pack says never to publish unbacked. A sceptical B2B buyer spots invented stats instantly — this *costs* trust rather than building it.
- **No B2B fork on the home page.** Sectors are shown as four equal cards; there's no "Managing a portfolio? Start here" lane, so the highest-value visitor self-serves into the homeowner funnel.
- **CTA repetition without escalation.** "Get a free quote" / "Enquire" / "Get a quote" / "Start a quote" all point at the same `/contact`. That's consistent (good) but every CTA is the same temperature — nothing offers a lighter-commitment B2B step ("See how the portfolio plan works") or a heavier homeowner step ("Call now, booked this week").
- **NewsletterBand as the final section** ends the page on the lowest-intent action (email capture) rather than a strong quote/call band. Most pages close with `CtaBand` ("Ready to stop chasing contractors?") — the home page, the most-visited page, doesn't.
- **Emergency call-out routes to the same number with no distinct promise.** `content.ts` notes there's no separate emergency line yet, which is honest, but the red "Emergency call-out" button sets an expectation (24/7?) the copy never confirms.

---

## Key sub-page teardowns

### Services (`Services.tsx`)
Clean catalogue (8 services, image-topped cards, "good to know" chips), the planned-vs-reactive cost argument, a pricing table, and FAQ. **Leak: the pricing table is all "Price on request"** (`content.ts` lines 275–301, flagged `TODO: replace`). A pricing table where every row says "Price on request" is worse than no table — it signals you're hiding numbers. Either publish indicative "from £X" call-out/half-day rates or replace the table with a "how pricing works" explainer until real rates exist. The footnote about "bracketed figures... 2025 UK market ranges" references brackets that aren't shown — dead copy. **Strong:** "Regulated trades" honesty box and per-package "Get a quote".

### Service detail (`ServiceDetail.tsx`)
Best-converting template on the site: sticky aside with "What you get" checklist, a quote button, click-to-call, and an areas link, plus a "How it works" 4-step and 3 related services. Little to fix. Could add **one service-relevant review** in the aside and a "most jobs booked the same week" urgency line near the button.

### Sectors (`Sectors.tsx`)
This is the **most under-exploited page for the primary prize.** It already nails B2B psychology — each audience card leads with "What they worry about" (void time, downtime, reliability across many properties) then answers it. The portfolio reassurance block ("One contact for every property you hold") and "Talk to us about your portfolio" CTA are exactly right. **But:** B2B and homeowner are mixed into one 4-card grid with one shared process and one shared `Reviews` block. Split the page — or at least the CTAs — so landlords/agents/facilities get a distinct "Book a portfolio chat" action, ideally a calendar link or a B2B-tagged form, separate from the homeowner "get a quote".

### Contact (`Contact.tsx`) — see CRO section below.

### Track (`Track.tsx`)
Excellent **proof/retention** asset, not an acquisition page — and it shouldn't try to be. Reference + surname lookup, animated stage timeline (Booked in → Scheduled → En route → On site → Completed → Invoiced → Paid), "what the statuses mean" explainer, and a one-tap portal hand-off. **CRO value: link to it from acquisition pages as proof** ("See exactly how we keep you posted — track a live job") rather than leaving it as a returning-customer utility. It's the single best demonstration that EGO is more organised than a competitor.

---

## Trust & proof — what exists, and where to move it

EGO has a strong, *honest* proof set. The problem is placement: it's scattered and mostly below the fold.

| Proof element | Where it lives now | Where it should ALSO be |
|---------------|--------------------|--------------------------|
| Fully insured / public liability | Hero trust row, Promises, nav utility bar | Keep — well placed |
| Fixed/written price up front | Hero row, proofPoints, process | Keep |
| Reviews (role + SE postcode) | Below mid-page on Home/Sectors | **Add 1–2 to the hero/above fold**; add to About |
| Live job tracking / per-property record | Buried (Track page, "small jobs" pillar) | **Promote to hero trust row + a dedicated "how we keep you posted" block high on Home** |
| Itemised VAT invoices | Implied in process step 4, Track copy | Surface as an explicit proof tile — it's a real B2B differentiator |
| DBS-checked engineers | Desktop nav utility bar only (`SiteNav.tsx` line 106) | Add to hero trust row + Contact reassurance |
| "Honest about our limits" (Gas Safe etc.) | Services/Home regulated-work box, FAQ | Keep — this honesty converts |
| Companies House / VAT number | `content.ts` blank by default | **Publish in footer once live** — registered-company proof |

The wedge (per-property record + tracking + itemised VAT invoices + fixed price in writing) is the most *ownable* trust story and currently the least visible. That's the inversion to fix.

---

## Contact-form CRO (`Contact.tsx`)

The form posts to `/api/enquiry` with: name*, email*, phone, address, service (select), message*. Layout is clean (3/5 form, 2/5 contact details + grayscale map), with a "What happens next" 3-step below and a no-share-your-details reassurance line.

**What helps**
- Only three required fields (name, email, message) — low friction.
- Contact details are all tappable (`tel:`, `mailto:`), the click-to-call card is prominent.
- "We will come back with a price and a date we can keep. We do not share your details" directly under the button kills the two biggest hesitations.
- The placeholder nudges photo sharing ("A photo helps us price it accurately, so send one over by email").

**What hurts / leaks**
- **No file/photo upload.** The form *asks* for a photo but makes the user switch to email to send one — a guaranteed drop-off. A photo is the single biggest factor in pricing accuracy. Add an optional image upload (mobile camera capture).
- **No B2B routing.** There's no "Are you a homeowner / landlord / agent / facilities?" toggle. A managing agent's enquiry lands looking identical to a one-off tap fix, so it can't be triaged or routed to a portfolio conversation. Add a customer-type field — it both routes the lead *and* lets the form adapt its copy.
- **Required email but optional phone** — for a local trades business where the highest-intent action is a call, consider making phone the prominent/encouraged contact method (or "best way to reach you" radio: phone/email).
- **No inline validation** — only a `toast.error` on submit if name/email/message are empty. Inline field-level errors convert better and reduce frustrated abandons.
- **The map iframe** is nice-to-have but loads a third-party Google embed on a conversion page; keep it lazy (it is) and below the fold (it is) — fine, but don't let it push the form down on mobile.
- **`<select>` for service** is fine, but pre-selecting nothing ("Select a service") plus an "Other" is good — no change needed.

**Mobile contact specifics:** the form stacks to single column (good). Ensure `type="tel"` on phone and `inputmode="email"` behaviour, large tap targets (the `size="lg"` button is fine), and that the sticky/visible click-to-call beats the form for someone who'd rather just ring.

---

## B2B vs homeowner path clarity

Right now the two audiences share one funnel almost everywhere. The site *talks* to both well (Sectors copy is audience-aware; packages include "Property care plan — Recommended for landlords" and "Commercial planned maintenance"), but every **action** dumps them into the same `/contact` form.

Recommended forking:
1. **Home hero:** add a quiet third line/CTA — "Managing rentals or a commercial site? **Book a portfolio chat →**".
2. **Sectors page:** B2B cards get "Book a portfolio chat"; the homeowner card gets "Get a quote". Two CTAs, two intents.
3. **Contact form:** customer-type selector that, when "Landlord/Agent/Facilities" is chosen, swaps the heading to "Tell us about your portfolio" and reveals a "roughly how many properties?" field.
4. **A dedicated `/portfolio` or `/for-landlords` lander** would be the ideal long-term play for the highest-LTV segment — but the form fork is the fast win.

---

## Above-the-fold checklist (Home, desktop + mobile)

- [x] Clear what EGO does (general maintenance, homes + commercial) — yes, hero paragraph
- [x] Local signal (South East London) — yes, pin badge
- [x] Primary CTA visible (Get a free quote) — yes
- [x] Phone visible + tappable — yes
- [x] Core trust row (insured / fixed price / turn up / one number) — yes
- [ ] **The wedge visible** (tracking / per-property record / itemised invoices) — **no, buried**
- [ ] **Social proof above the fold** (a review line or star rating) — **no**
- [ ] **B2B path signposted** — **no**
- [ ] **DBS-checked surfaced beyond the desktop utility bar** — **no (hidden on mobile)**
- [x] Emergency option — yes (but undefined promise)

---

## Mobile CRO (most local searches are mobile)

- **Sticky click-to-call is missing.** There's a phone CTA in the hero and in the nav drawer, but no persistent sticky "Call now" bar that follows the user down a long page. For a local trades site this is the highest-leverage mobile fix — add a fixed bottom bar (Call | Get a quote) on mobile.
- **The desktop utility bar (hours, email, "Fully insured · DBS-checked", emergency line) is hidden on mobile** (`lg:block`, `SiteNav.tsx` line 85). So mobile users — the majority — lose the DBS-checked and insured signals from the top of the page entirely. Surface at least "Insured · DBS-checked" in the mobile hero trust row.
- Hero CTAs stack full-width on mobile (`w-full sm:w-auto`) — good, large tap targets.
- The newsletter band as the page-ender is even weaker on mobile (lots of scrolling to reach a low-intent action). Move a quote/call band to the foot.
- Contact form: confirm phone field uses a numeric keypad and the photo-upload (recommended above) uses native camera capture.
- Tracking page works well on mobile and is a great "text this link to the customer" asset — lean into that.

---

## Social proof placement

Currently the `Reviews` carousel appears mid-Home and on Sectors only, pulling live from `/api/public/reviews` (good architecture). Gaps:
- **Nothing above the fold.** Add a single rating/review line near the hero ("Rated for turning up — read what SE London says").
- **About page has no proof block** before its CTA.
- **Service detail pages** would convert harder with one trade-relevant review in the sticky aside.
- **Contact page** — add one short review near the form ("First contractor in a while I'd actually call again" — Homeowner, SE13) to reassure at the point of action.
- Once real volume exists, **publish the aggregate rating + count** (the component already supports `rating`/`count`) — a "4.9 from 37 reviews" badge outperforms a generic 5-star row, and replace the placeholder "Rated for turning up" fallback.

---

## Prioritised fix list

### P0 — do first (high impact, mostly fast)

| Fix | Page | Why | Expected lift |
|-----|------|-----|---------------|
| Add sticky mobile "Call / Get a quote" bar | All | Most traffic is mobile; click-to-call is the top local action | High — +10–20% calls on mobile |
| Replace "Price on request" pricing table with indicative "from £X" rates or a how-pricing-works block | Services | All-blank table reads as hiding numbers; kills trust | Med–High |
| Fix or remove unverifiable Counter stats ("100%", "24h") | Home/Services | Invented stats break trust with B2B buyers | Med (trust) |
| Add a distinct B2B CTA ("Book a portfolio chat") on Home hero + Sectors | Home, Sectors | Primary prize is recurring B2B; currently no dedicated path | **Highest — protects the most valuable segment** |
| Add photo/file upload to the contact form | Contact | Form asks for a photo but forces an email switch → drop-off | Med–High (quote quality + completion) |

### P1 — next (meaningful, slightly more work)

| Fix | Page | Why | Expected lift |
|-----|------|-----|---------------|
| Surface the wedge (tracking / per-property record / itemised invoices) above the fold | Home | The sharpest differentiator is invisible early | High |
| Add customer-type field to the form (routes + adapts copy) | Contact | Can't triage B2B vs homeowner leads today | Med–High |
| Move a quote/call `CtaBand` to the foot of Home (newsletter goes above it) | Home | Page ends on lowest-intent action | Med |
| Add one review above the fold + reviews on About/Contact/service detail | Home, About, Contact | No social proof at decision points | Med |
| Surface "Insured · DBS-checked" in mobile hero | Home/global | Mobile users lose these signals (utility bar is desktop-only) | Med |

### P2 — later (polish / compounding)

| Fix | Page | Why | Expected lift |
|-----|------|-----|---------------|
| Build a dedicated `/for-landlords` or `/portfolio` lander | New | Best long-term home for highest-LTV segment | Med (compounds) |
| Inline form validation | Contact | Reduces frustrated abandons | Low–Med |
| Define the emergency promise (hours/response) or relabel | Home/nav | Red button sets an expectation copy never confirms | Low (trust) |
| Publish Companies House + VAT number in footer once live | Global | Registered-company proof, esp. B2B | Low–Med |
| Link Track page from acquisition pages as live proof | Home/Sectors | Best demo that EGO is more organised | Med |

---

## A/B test ideas

1. **B2B CTA fork (hero).**
   *Hypothesis:* Adding a third hero CTA — "Managing property? Book a portfolio chat" — alongside "Get a free quote" will increase qualified B2B enquiries without cannibalising homeowner quotes, because B2B intent currently has no dedicated path. *Metric:* B2B-tagged enquiries + portfolio-chat clicks. *Guardrail:* total enquiry rate.

2. **Sticky mobile call bar.**
   *Hypothesis:* A persistent bottom "Call now | Get a quote" bar on mobile lifts total conversions (calls + form) vs the current scroll-to-find CTAs, because local-search users decide fast and prefer to ring. *Metric:* `tel:` clicks + form submits per mobile session.

3. **Pricing table treatment (Services).**
   *Hypothesis:* Replacing the all-"Price on request" table with indicative "from £X" rates (or a clear "how we price" explainer) increases progression from Services → Contact, because concrete or transparent pricing reduces the fear of being overcharged (the homeowner's stated #1 worry). *Metric:* Services→Contact click-through + enquiry rate.

4. **Wedge above the fold.**
   *Hypothesis:* Adding a "live tracking + per-property record + itemised invoices" proof strip near the hero increases enquiry rate, because EGO's most ownable differentiator currently appears too late to influence the decision. *Metric:* hero-section→CTA rate; scroll-depth to first CTA.

5. **Social proof in the hero.**
   *Hypothesis:* A single review/rating line above the fold ("First contractor in a while I'd actually call again — SE13") lifts CTA clicks vs no early proof, because trust at first impression reduces bounce. *Metric:* bounce rate + hero CTA CTR.

6. **Contact form photo upload.**
   *Hypothesis:* An optional photo upload (with camera capture on mobile) increases form completion *and* quote-to-job conversion, because users who can attach a photo don't abandon to email and EGO can price accurately first time. *Metric:* form completion rate + downstream quote acceptance.

7. **Page-ending band (Home).**
   *Hypothesis:* Closing the home page with the `CtaBand` quote/call band (newsletter moved above it) lifts end-of-page conversions vs ending on the newsletter, because the strongest intent action should occupy the final, decision-point slot. *Metric:* conversions attributed to the final two sections.
