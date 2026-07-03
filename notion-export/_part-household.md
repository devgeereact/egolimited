Company-voice email sequences for EGO LTD's household and homeowner audiences. These are written in the voice of EGO LTD as a firm (the EGO team, "we", "our"), never a personal name. They run through the app's bulk-email campaigns feature and sit separately from the app's transactional emails (job-complete alerts, invoice reminders). Swap every `{{token}}` for a real value before sending, and only ever quote real jobs, real figures and real reviews. One person owns each job start to finish, prices are fixed in writing, invoices are itemised with VAT shown, and payment is by bank transfer. Notifications are email only. Never promise SMS or card payment.

**Standard sign-off (every email):**

```
The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London
```

---

## 1. Homeowner enquiry → quote → win

A four-email sequence that carries a homeowner from first enquiry to a booked job. Triggered when someone submits an enquiry or asks for a quote. Stop the whole sequence the moment they reply, accept, or book.

| # | Subject | Purpose | Timing | CTA | Condition |
|---|---------|---------|--------|-----|-----------|
| 1 | Thanks {{first_name}} — we've got your enquiry | Confirm receipt, set expectations | Immediately on enquiry | Call or reply | All new enquiries |
| 2 | Your quote for {{job_summary}} | Deliver the fixed price, itemised | When quote is ready (aim within {{quote_turnaround}}) | Reply "yes" to book | Quote prepared |
| 3 | Quick one on your quote, {{first_name}} | Gentle nudge, offer to adjust | 2–3 days after quote | Reply or call | No reply to email 2 |
| 4 | Still thinking it over? | Restate the proof, keep the door open | 5–7 days after quote | Reply or call | No reply to email 3 |

### Email 1 — Thanks / what happens next

**Subject (option A):** Thanks {{first_name}} — we've got your enquiry
**Subject (option B):** Your enquiry's logged — here's what happens next

**Preview text:** A quick note on what happens next, and when you'll hear from us.

**Purpose:** Confirm the enquiry landed, reassure the homeowner a real person owns it, and set the expectation for a fixed price in writing.

**Body:**

Hi {{first_name}},

Thanks for getting in touch about **{{job_summary}}**. It's logged with us and someone's already on it.

Here's what happens next. Our team will have a proper look at what you've sent and come back with a **fixed price in writing**, usually within **{{quote_turnaround}}**. If we need a quick photo or to pop round and measure up first, we'll let you know. A photo now often helps us price it right, so do send one over if you've got it handy.

No call centres and no chasing. **One person owns your job** from the first look to the final invoice.

If anything's urgent or has changed, just reply to this email or call us on **07539 705576**.

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

**Primary CTA:** Call us on 07539 705576 → `tel:07539705576`
**Timing:** Sent immediately on enquiry.
**Condition/segment note:** Transactional-style confirmation, so no unsubscribe line needed. All new homeowner enquiries.

### Email 2 — The quote

**Subject (option A):** Your quote for {{job_summary}}
**Subject (option B):** {{job_summary}} — {{quote_total}}, fixed in writing

**Preview text:** Fixed price, itemised, VAT shown. No surprises on the day.

**Purpose:** Deliver the quote clearly, lean on the fixed-price-in-writing and itemised-VAT wedge, and make booking a one-word reply.

**Body:**

Hi {{first_name}},

Here's your quote for **{{job_summary}} — {{quote_total}}**, fixed in writing.

It's **itemised**, so you can see exactly what you're paying for, with **VAT shown separately**. That price is the price. If anything changes once we're on site, we agree it with you first, never after the fact.

Once the work's done you'll get an itemised invoice and a **live tracking link** so you can follow the job without waiting in all day or ringing to ask where we're up to.

If you're happy, reply **"yes"** or give us a ring on **07539 705576** and we'll get you booked in for the next slot that suits. Any questions on the quote at all, just ask.

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

**Primary CTA:** Reply "yes" to book → reply-to `hello@egolimited.com`
**Timing:** Sent when the quote is ready, ideally within {{quote_turnaround}} of the enquiry.
**Condition/segment note:** Transactional-style quote delivery, no unsubscribe line needed. Only send once a real fixed price exists.

### Email 3 — Quote nudge

**Subject (option A):** Quick one on your quote, {{first_name}}
**Subject (option B):** Did the quote for {{job_summary}} land alright?

**Preview text:** Happy to tweak it or answer anything — no pressure either way.

**Purpose:** A soft nudge that removes friction. Offer to adjust price or timing rather than pushing for a yes.

**Body:**

Hi {{first_name}},

Just checking the quote for **{{job_summary}}** ({{quote_total}}) landed alright.

If the price or the timing isn't quite right, tell us. We'd far rather **adjust it than leave you guessing**. And if there's a bit you'd like explaining, we're happy to walk through it line by line, no obligation.

Whenever you're ready to go ahead, reply here or call **07539 705576** and we'll book you in.

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

**Primary CTA:** Reply or call 07539 705576 → `tel:07539705576`
**Timing:** 2–3 days after the quote, if no reply.
**Condition/segment note:** Suppress if the homeowner has replied, booked, or declined. This is a lifecycle follow-up on an active enquiry, so no unsubscribe line required.

### Email 4 — Still thinking?

**Subject (option A):** Still thinking it over?
**Subject (option B):** No rush on {{job_summary}} — here's why folks pick us

**Preview text:** No rush — but here's why people pick us, in case it helps.

**Purpose:** Final touch. Reassure there's no pressure, restate the three proof points, and confirm the quote still stands.

**Body:**

Hi {{first_name}},

No problem at all if **{{job_summary}}** is still on the back burner. Life gets busy and the job will keep.

When you're ready, here's what you get with us:

- **A fixed price agreed in writing** before we start.
- **A live tracking link**, so you always know where your job's up to.
- **An itemised VAT invoice** when it's done — nothing vague.

That's the whole point of EGO: **the jobs that need doing, done properly.**

The quote of **{{quote_total}}** still stands. Reply or call **07539 705576** whenever suits.

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

**Primary CTA:** Reply or call 07539 705576 → `tel:07539705576`
**Timing:** 5–7 days after the quote, if still no reply.
**Condition/segment note:** Last email in the sequence. Suppress on any reply or booking.

**Exit & suppression:** Stop the sequence the instant the homeowner replies, books, accepts, or declines. Never let a "still thinking?" email land after they've said yes. Anyone who becomes an active job moves to transactional emails only — quiet them here. Honour any opt-out immediately.

---

## 2. Post-job: review + referral

A two-email marketing follow-up after a job is marked complete, separate from the app's transactional completion email. It asks for a review, then asks for a referral. Stop if they leave a review or send someone your way.

| # | Subject | Purpose | Timing | CTA | Condition |
|---|---------|---------|--------|-----|-----------|
| 1 | How did we do on {{job_summary}}? | Ask for an honest review | 1–2 days after completion | Leave a review | Job marked complete |
| 2 | Know anyone who needs a job doing properly? | Ask for a referral | 7 days after completion | Forward / pass on the number | No review or referral yet |

### Email 1 — How did we do / review

**Subject (option A):** How did we do on {{job_summary}}?
**Subject (option B):** A quick favour, {{first_name}}? 30 seconds

**Preview text:** 30 seconds to let us know — it genuinely helps a small firm.

**Purpose:** Get an honest review while the job's fresh, and give any snag a route back to us before it turns into a bad review.

**Body:**

Hi {{first_name}},

We hope you're happy with **{{job_summary}}** — it was good to get it sorted for you.

If you've got **30 seconds**, a quick honest review would mean a lot. We're a small local outfit and word of mouth is most of how we grow.

[Leave a review]({{review_link}})

And if anything's not quite right, please **tell us first**. We'd always rather put it right than have you stuck with it. Just reply to this email or call **07539 705576**.

Thanks again,

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

*Prefer not to get the occasional email like this? [Unsubscribe here]({{unsubscribe_link}}) and we'll only send you job-related messages.*

**Primary CTA:** Leave a review → `{{review_link}}`
**Timing:** 1–2 days after the job is marked complete.
**Condition/segment note:** Marketing follow-up, so include the unsubscribe line. Only send to satisfied, completed jobs; skip anyone with an open complaint.

### Email 2 — Referral ask

**Subject (option A):** Know anyone who needs a job doing properly?
**Subject (option B):** A name from you beats any advert, {{first_name}}

**Preview text:** A name from you is worth more than any advert. Here's the ask.

**Purpose:** Turn a happy customer into a warm introduction. Make passing you on effortless.

**Body:**

Hi {{first_name}},

Thanks again for having us out for **{{job_summary}}**.

Quick favour. If a friend, neighbour or family member needs a **reliable pair of hands** — carpentry, decorating, a bit of plumbing or tiling, or the small jobs other firms won't book — point them our way. A name from someone like you is worth more than any advert we could run.

Just **forward this email** or pass on **07539 705576**. We'll look after them the same way we looked after you: fixed price in writing, a live tracking link, and an itemised invoice at the end.

Much appreciated,

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

*Prefer not to get the occasional email like this? [Unsubscribe here]({{unsubscribe_link}}) and we'll only send you job-related messages.*

**Primary CTA:** Forward this email or pass on 07539 705576 → forward / `tel:07539705576`
**Timing:** 7 days after completion.
**Condition/segment note:** Marketing email, include unsubscribe. Suppress if they've already referred someone or asked not to be contacted.

**Exit & suppression:** Stop if the customer leaves a review or refers someone. Never send either email to a job with an unresolved complaint — sort the issue first. Honour opt-outs immediately and keep them on the suppression list for all marketing.

---

## 3. Seasonal planned-maintenance campaign

A two-email seasonal campaign to existing and opted-in homeowners. One nudges a pre-winter once-over; the other invites people to save up small jobs for a single visit in spring/summer. Send the relevant one to the relevant season.

| # | Subject | Purpose | Timing | CTA | Condition |
|---|---------|---------|--------|-----|-----------|
| 1 | Get ahead of winter before it gets ahead of you | Book a pre-winter once-over | Mid-Sept to mid-Oct | Book a once-over | Homeowner list |
| 2 | Save up the small jobs — one visit sorts the lot | Batch small jobs into one visit | Spring/summer | Reply with your list | Homeowner list |

### Email 1 — Pre-winter once-over

**Subject (option A):** Get ahead of winter before it gets ahead of you
**Subject (option B):** A pre-winter once-over beats a January call-out

**Preview text:** A once-over now beats an emergency call-out in the frost.

**Purpose:** Sell a cheap, preventive winter check by framing it against the cost and hassle of an emergency call-out.

**Body:**

Hi {{first_name}},

Cold weather finds every weak spot. Draughty doors, tired seals, gutters that should've been cleared, the small jobs that turn into big ones once the frost sets in.

A **pre-winter once-over** sorts it cheaply now. Our team checks the property over, fixes the small stuff on the spot, and flags anything bigger with a **fixed price before we touch it**. Carpentry, decorating, minor plumbing, walls and tiling — all the usual.

Best to beat the rush. The closer to Christmas, the busier everyone gets, and the small jobs are always cheaper caught early than repaired in a hurry.

Fancy getting ahead of it? Reply with your address or call **07539 705576** and we'll book you in.

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

*Getting our seasonal notes but don't want them? [Unsubscribe here]({{unsubscribe_link}}) any time.*

**Primary CTA:** Book a once-over → `tel:07539705576`
**Timing:** Mid-September to mid-October, ahead of the cold.
**Condition/segment note:** Marketing email, include unsubscribe. Send to existing and opted-in homeowners only; quiet anyone mid-job.

### Email 2 — One visit for the small jobs

**Subject (option A):** Save up the small jobs — one visit sorts the lot
**Subject (option B):** Your to-do list, cleared in a single visit

**Preview text:** The sticky door, the shelf, the tiling — done in one go.

**Purpose:** Reactivate the "I'll get to that" list by making a batched single visit feel cheaper and easier than one-off call-outs.

**Body:**

Hi {{first_name}},

Most homes have a running list. The **sticky door**, the bit of **tiling**, the **shelf that never went up**, the patch that needs **painting**. Now's a good time to get on top of it.

Save them up and we'll do the lot in **one visit** — fixed price agreed first, itemised invoice after, no fuss. It's usually **cheaper and far less hassle** than calling someone out one job at a time, and it's exactly the kind of work we're set up for, including the small jobs other firms won't book.

Fancy clearing the list? Reply with what's on it, or call **07539 705576** and we'll price it up.

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

*Getting our seasonal notes but don't want them? [Unsubscribe here]({{unsubscribe_link}}) any time.*

**Primary CTA:** Reply with your list → reply-to `hello@egolimited.com`
**Timing:** Spring or early summer, when the {{season}} to-do list is top of mind.
**Condition/segment note:** Marketing email, include unsubscribe. Existing and opted-in homeowners; one seasonal email per person at a time.

**Exit & suppression:** Only one seasonal email per contact at a time — don't run winter prep and the small-jobs blast at the same person in the same week. Quiet anyone currently mid-job. Honour opt-outs immediately.

---

## 4. Homeowner win-back / dormant reactivation

A two-email sequence for past homeowner customers we've not heard from in a while ({{months_since_last_job}}+ months). A friendly hello and a standing offer, then the practical "one visit clears the list" pitch. Stop on any reply.

| # | Subject | Purpose | Timing | CTA | Condition |
|---|---------|---------|--------|-----|-----------|
| 1 | Still here when you need us, {{first_name}} | Warm hello, standing offer | When dormant ({{months_since_last_job}}+ months) | Reply or call | Past customer, gone quiet |
| 2 | Your to-do list, sorted in one visit | Practical batched-visit offer | 7 days after email 1 | Reply with your list | No reply to email 1 |

### Email 1 — Friendly hello + standing offer

**Subject (option A):** Still here when you need us, {{first_name}}
**Subject (option B):** It's been a while — a quick hello from EGO

**Preview text:** It's been a while — a quick hello and a standing offer.

**Purpose:** Re-open the relationship with no hard sell. Remind them we exist, still work the same way, and are one call away.

**Body:**

Hi {{first_name}},

It's been a while since we last sorted something for you — we think the last was **{{last_job_summary}}**.

No agenda here, just a hello. If anything around the house has drifted onto the **"I'll get to that"** list, that's exactly the kind of thing we're good at: the small jobs, the repairs, the bits that never quite reach the top of the pile.

Same number, same **fixed-price-in-writing** way of working, same **live tracking link** and **itemised invoice** at the end. Reply or call **07539 705576** whenever something crops up.

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

*Rather not hear from us like this? [Unsubscribe here]({{unsubscribe_link}}) and we'll leave it there.*

**Primary CTA:** Reply or call 07539 705576 → `tel:07539705576`
**Timing:** Sent when a past customer has been dormant {{months_since_last_job}}+ months.
**Condition/segment note:** Marketing email, include unsubscribe. Past homeowner customers only — never cold contacts.

### Email 2 — To-do list sorted in one visit

**Subject (option A):** Your to-do list, sorted in one visit
**Subject (option B):** Save up the little jobs — we'll knock them out in one go

**Preview text:** Save up the little jobs — we'll knock them out in one go.

**Purpose:** Give the dormant customer a concrete, low-friction reason to book: batch the backlog into one cost-effective visit.

**Body:**

Hi {{first_name}},

Most homes have a running list: the **sticky door**, the bit of **tiling**, the **shelf that never went up**, the patch that needs **painting**.

Save them up and we'll do the lot in **one visit** — fixed price agreed first, itemised invoice after, no fuss. It's usually **cheaper and far less hassle** than calling someone out one job at a time, and you'll get a **live tracking link** so there's no waiting in all day.

Fancy clearing the list? Reply with what's on it, or call **07539 705576** and we'll price it up.

The EGO LTD team
07539 705576 · hello@egolimited.com · egolimited.com
General maintenance, homes & commercial — South-East London

*Rather not hear from us like this? [Unsubscribe here]({{unsubscribe_link}}) and we'll leave it there.*

**Primary CTA:** Reply with your list → reply-to `hello@egolimited.com`
**Timing:** 7 days after email 1, if no reply.
**Condition/segment note:** Marketing email, include unsubscribe. Suppress on any reply to email 1.

**Exit & suppression:** Stop on any reply or booking. If a win-back turns into an active job, move them to transactional emails and quiet the marketing. Two emails only — if there's still no response, drop the contact back into the light seasonal list rather than emailing again. Honour opt-outs immediately.

---

## Personalisation tokens

Fill every token before sending. If a token is blank, rewrite the line so it still reads naturally — never send a visible `{{token}}` or an empty greeting.

| Token | Meaning | Example |
|---|---|---|
| `{{first_name}}` | Contact's first name | Sarah |
| `{{job_summary}}` | Short job description | the kitchen door rehang |
| `{{quote_total}}` | Fixed price (state VAT) | £340 inc. VAT |
| `{{quote_turnaround}}` | Quote promise window | 2 working days |
| `{{review_link}}` | Review page URL | egolimited.com/review |
| `{{last_job_summary}}` | Their previous job | the bathroom re-tile |
| `{{months_since_last_job}}` | Dormancy trigger | 10 |
| `{{season}}` | Current/upcoming season | spring |
| `{{unsubscribe_link}}` | One-click opt-out URL | egolimited.com/unsubscribe |

---

## Compliance note

Don't cold-email private individuals who haven't enquired or been referred (UK PECR/GDPR). These household sequences are for people who **enquired**, are **existing customers**, or have **opted in**. Every marketing (non-transactional) email carries an unsubscribe line; honour opt-outs immediately and keep a suppression list. Enquiry-stage and quote emails are transactional lifecycle messages tied to a live request, so they don't need an unsubscribe line — but the moment a contact goes quiet or dormant, treat further contact as marketing.
