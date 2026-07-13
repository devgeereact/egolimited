# Pipeline — restructuring Campaigns, Leads and Automation

**Date:** 2026-07-13
**Status:** design, awaiting approval
**Supersedes the IA of:** `docs/CAMPAIGNS-V2.md` (the campaigns *engine* from v2 survives intact — enrolments, send queue, suppression. Only its container changes.)

---

## 1. The problem

Campaigns v2 fixed the sending engine. It did not fix the thing the sending engine sits inside, which is broken at a level no UI change reaches:

**There is no pipeline.** There are three disconnected pools, and nothing joins them:

| Pool | Lives in | What happens when interest appears |
|---|---|---|
| Cold prospects | `ego_leads` | Marked `replied`. Then nothing. |
| Inbound enquiries | `ego_messages` | The website form creates an **email**. It sits in the inbox. |
| Paying customers | `ego_customers` | No path in from either of the above. |

So the moment that decides whether EGO earns money — a stranger saying *"yes, quote me"* — has nowhere to go. Someone must happen to notice an email, then retype the business as a customer by hand, then create the job. Nothing links it back. Nothing chases it if it's forgotten.

The owner confirmed all four of these leak money today:

1. Enquiry not answered fast enough
2. Quote sent, never chased
3. Replied to a cold email, then forgotten
4. Past customers never contacted again

"Campaigns", "Leads" and "Automation" are not three features. They are three fragments of **one process**: turning a stranger into a paying job. They are separate because they were built separately, not because the work is separate.

---

## 2. The core model: one record per business

`ego_customers` becomes **the single contact table**. Every prospect is a customer record that has not bought yet.

This is not a rename. It is what makes the rest cheap: jobs, invoices and campaign enrolments **already** key on `customer_id`. When a prospect converts there is nothing to convert — they already *are* the record. No copy, no duplicate, no history split at the exact moment history starts mattering.

```
ego_customers                    -- the one place a business exists
  stage            prospect | contacted | interested | quoted | customer | dormant | lost
  source           enquiry | cold | phone | referral | repeat
  owner_id         who is chasing this
  next_action_at   when it must be looked at again
  last_activity_at derived; drives "dormant"
  stage_locked     TINYINT — set when a human overrides the derived stage
```

### Stages are DERIVED, not maintained

A hand-kept kanban rots: someone forgets to drag a card and the board starts lying, quietly, forever. So the stage is computed from facts the database already holds:

| Stage | Derived from |
|---|---|
| `prospect` | exists, never contacted |
| `contacted` | at least one outbound email sent |
| `interested` | they replied to us |
| `quoted` | an open quote exists |
| `customer` | a paid invoice exists |
| `dormant` | `customer` and no job for 12 months |
| `lost` | quote declined, or explicitly marked |

A human can override (`stage_locked = 1`), but never *has to*. **The board cannot lie, because it reads the same facts the invoices read.** This single property is the design's main defence against becoming a CRM nobody updates.

---

## 3. Information architecture

`Campaigns`, `Leads` and `Automation` all disappear as destinations. One replaces them:

```
PIPELINE                              (manager+)
├── New enquiries        3   ← website form, phone, referral. The hot queue.
├── Interested           2   ← they replied. Owned, with a deadline.
├── Quoted — chasing     5   ← quote out, no answer yet
├── Everyone
├── Dormant             41   ← customers who have gone quiet
├── Do not email        12   ← the suppression list (unchanged from v2)
│
├── Find businesses          ← prospecting        (was "Leads")
├── Sequences               ← cold email          (was "Campaigns") — now a TOOL, not a place
└── Follow-ups              ← the rules           (was "Automation")
```

Three panes, the shape that already works in the mail workspace: **stage → contacts → the contact.**

The right-hand pane is the screen that does not exist today: **one timeline per business.** Every email sent, every reply, every job, every quote, every call note — in order, in one place. It answers *"what's the story with Marchmont?"* in three seconds instead of never.

**The website enquiry form stops creating *only* an email.** Today it writes a row to `ego_messages` and that is the whole of it — the enquiry IS an inbox item, and if nobody opens the inbox, nobody knows. From now on it creates a **contact** in `New enquiries` with a clock on it. The inbox still receives its copy (the audit trail, and the place a reply threads back to), but the inbox is no longer the *only* place the enquiry exists, and no longer the thing that has to be noticed. That change alone closes the biggest leak.

Campaigns/Sequences keep their v2 engine unchanged. They stop being a *place you go* and become a *thing you do to a set of contacts*.

---

## 4. The four automations

Each plugs a leak the owner confirmed is real. All four reuse the v2 send queue and suppression list — this is wiring, not new machinery.

### 4.1 Enquiry → answered fast
```
Website form / phone / referral
  → contact created in NEW ENQUIRIES, source recorded
  → instant auto-acknowledgement ("we've got it — we'll come back to you within one working hour")
  → countdown starts
  → unanswered after 1 working hour   → surfaces on TODAY, top of the list
  → unanswered after 4 working hours  → escalates to the manager
```
Speed of first response is the single biggest predictor of winning the job.

### 4.2 Quote sent → chased until answered
```
Quote sent
  → +3 days   polite nudge   ("any questions on this?")
  → +7 days   value nudge    ("happy to walk you through it")
  → +14 days  the close      ("shall I close this off, or is it still live?")
  → any reply, or accept/decline → chasing STOPS immediately
```
The most expensive leak in most maintenance firms. Drafted automatically; **sent only when a human clicks send** — a quote chase in the wrong tone loses the job.

### 4.3 Reply → hot, owned, deadlined
```
Anyone replies to anything
  → stage = interested
  → owner assigned
  → next action due within 1 working day
  → appears on TODAY until dealt with
  → all sequences to them stop (already true in v2)
```
This is the exact hole found in the audit.

### 4.4 Dormant customer → reawakened
```
Customer, no job for 12 months
  → stage = dormant
  → suggested re-engagement lands in the office queue
    ("Marchmont — 14 months since the boiler service. Offer a check-up?")
```
The cheapest work EGO will ever win. They already trust us.

### The governing rule

**Automation drafts and prompts. A human sends and decides.**

Nothing reaches a customer or a prospect without someone pressing a button. That rule is what makes this safe to run at all, and it is why the drafting is worth having: the work saved is the *writing*, not the *judgement*.

---

## 5. Migration

Designed to be boring, because this is the risky part.

1. `ego_leads` rows migrate into `ego_customers` with `stage='prospect'`, `source='cold'`.
2. Campaign enrolments re-point by **email address** — the same person, the same history, no orphans.
3. Existing customers get their stage **derived on first run** from facts already in the database (paid invoice → `customer`; no job in 12 months → `dormant`). Nothing is hand-classified.
4. `ego_leads` is **kept, not dropped** — read-only, for one release — so the migration is reversible. Same discipline used for the procurement tables.
5. Jobs, invoices, quotes and enrolments keep working untouched, because they already point at `customer_id`. **That is the entire reason this model is cheap rather than a rewrite.**

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| The customers list floods with 200 cold prospects | Default view is **Customers only**. Prospects live behind the Pipeline door. Same table, different doors. |
| A cold prospect is treated as a customer | The stage gates it: you cannot invoice a `prospect`. |
| Auto-acknowledgement replies to a spam bot | Reuse the existing suppression list + rate limits. |
| It becomes a CRM nobody updates | **Stages are derived.** There is nothing to update. |
| Enquiries stop appearing in the Inbox and someone misses them | They appear on **Today** with a countdown, which is strictly more visible than an inbox row. The inbox keeps a copy for the audit trail. |

---

## 7. Deliberately out of scope

No deal values. No probability-weighted forecasting. No lead scoring. No multi-user assignment rules. No pipeline analytics beyond "how many are stuck where".

This is a ~20-person maintenance firm, not a sales organisation. Every one of those is a field a human has to maintain, and nobody will. They would make the board lie, which is the one failure mode this design exists to prevent.

---

## 8. Success criteria

Measurable, and none of them are vanity:

- **Time from enquiry → first reply** — target under 1 working hour, currently unmeasured
- **Quote follow-up rate** — target 100% chased at least once, currently near zero
- **Replies that get actioned within 1 working day** — target 100%, currently unknown and unknowable
- **Zero prospects requiring manual retyping to become customers** — currently every single one
- **"Where did this customer come from?"** — answerable for the first time
