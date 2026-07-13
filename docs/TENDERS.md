# Tenders — the Contracts Finder feed

**The only place work comes *to* EGO.** Everything else in the app is push: we email a stranger and
hope. This is pull.

Public bodies — councils, schools, NHS trusts, housing associations — are **required by law** to
publish the work they need doing. Responsive repairs, planned maintenance, voids, roofing,
decorating, electrical upgrades. They publish it as structured, open data. We read it.

---

## Why this and not LinkedIn

The owner asked whether we could harvest emails from LinkedIn. No — and the reason is the reason
this feature exists instead.

|                     | LinkedIn scraping | Contracts Finder |
|---------------------|-------------------|------------------|
| Terms of service    | Breached          | Open API, no login |
| Data type           | **Personal** data (a named individual) | A published *procurement contact* |
| Lawful basis (UK GDPR) | None that survives a balancing test — the data was taken covertly | Published expressly so suppliers use it |
| PECR                | Cold-emailing a personal address is not covered by the B2B exemption | N/A — they asked for suppliers |
| What you get        | A guess at who might want work | **A buyer who has said, in public, that they need this work done** |

A maintenance firm with an ICO complaint against it is a maintenance firm that cannot tender for
council work. The compliant route is also the better route.

---

## How it works

```
Contracts Finder OCDS API  ->  tender_sync()  ->  ego_tenders  ->  /ego/tenders  ->  Shortlist
                                                                                        |
                                                                                        v
                                                              buyer enters the PIPELINE with the
                                                              tender's deadline as their next action
```

- **`api/lib/tenders.php`** — the domain. `tender_parse()` and `tender_match()` are **pure** (no DB,
  no clock, no network), so the real API payload is replayed in tests.
- **`api/tenders_cron.php`** — daily, `15 6 * * *`. Pulls the last **3** days.
- **`ego_tenders`** — idempotent on `ocid`.

### The window overlaps on purpose

A daily job asking for exactly one day of notices loses anything published between runs, or on any
day the cron doesn't fire. **A missed tender is not recoverable — it just closes.** Ingest is
idempotent by `ocid`, so the overlap costs a few hundred rows read and nothing else.

### Matching

Two rules, in order:

1. **CPV prefix** — CPV is the procurement taxonomy every notice is tagged with. The *buyer* picks
   the code, so we are reading their classification rather than guessing from their prose. Defaults:
   `45` (construction/refurb/roofing/painting), `50` (repair & maintenance services), `7731` (grounds
   maintenance), `79993` (facilities management), `90911` (cleaning).
2. **Title keyword** — **titles only, never descriptions.** A description routinely lists every trade
   on site: the test fixture is a *landscaping* tender whose description says "Ground Maintenance",
   which on a description match would drag in half the register.

Every stored notice keeps its **`match_reason`** ("CPV 45453100 — Refurbishment work"). A human
triaging fifty notices needs to know *why* each is in front of them. "Matched" is a shrug.

Tunable, founder-only, in **Settings → Integrations**: `tenders_cpv`, `tenders_keywords`,
`tenders_postcodes` (outward-code prefixes, e.g. `se,sw,br,cr`). Blank = the defaults above.

### The area filter only ever excludes what it *knows* is wrong

If a buyer published no postcode, we keep the notice. An unknown location is not a wrong one, and
silently dropping work because a form field was blank is how a feed loses its credibility.

---

## What it will not do

**It does not bid, does not email, does not decide.** Same rule as every other automation here:
*automation drafts and prompts; a human sends and decides.* Bidding for public work is a judgement
call about capacity and margin, and no cron has an opinion about either.

## Sorted by deadline. Always.

A tender is worth exactly nothing the moment it closes, and there is no second chance. Closed
notices are never shown, and untriaged ones are pruned a week after they shut — but anything a human
*touched* is kept forever, because "we looked at this and said no" is worth knowing next year.

**Shortlisting is not a bookmark.** It puts the buyer in the Pipeline with a next action due **three
working days before the tender closes** — the difference between a bid and an apology. Without that,
a tender is just a tab someone forgets.
