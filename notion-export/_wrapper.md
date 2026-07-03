---

# Global reference

Applies across every sequence above.

## Performance benchmarks

Targets for a local trades firm sending through the campaigns tool. B2B cold is a slower burn than warm lifecycle email, so judge each sequence against its own column, not against each other.

| Metric | Homeowner enquiry (warm) | B2B cold outreach | B2B nurture (warm) | Review/referral | Seasonal | Win-back |
|---|---|---|---|---|---|---|
| Open rate | 55–70% | 25–40% | 35–50% | 45–60% | 30–45% | 20–30% |
| Reply / click | 15–30% | 3–8% | 8–15% | 10–20% (review left) | 4–8% | 3–6% |
| Conversion (booked/won) | 20–35% | 1–4% per contact | 5–12% | n/a (reviews gained) | 3–6% | 2–5% |
| Unsubscribe / STOP | <0.5% | 1–3% | <1% | <1% | 1–2% | 1–3% |

Cold B2B looks low per-email on purpose. The maths that matters: contact 60 agents, land 2–4 trial jobs, convert 1–2 into recurring accounts. One recurring account outweighs the low open rate.

## Sequence flow diagrams

**B2B cold outreach (agent example — same shape for landlord/commercial):**

```
[Cold contact added] --> Email 1 Intro (Day 0)
                              |
                        Replied / booked? --Yes--> [EXIT: hand to sales/booking]
                              |
                              No
                              v
                        Email 2 Value (Day 4)
                              |
                        Replied? --Yes--> [EXIT]
                              |
                              No
                              v
                        Email 3 Portfolio case (Day 9)
                              |
                        Replied? --Yes--> [EXIT]
                              |
                              No
                              v
                        Email 4 Social proof (Day 15)   [skip if no real testimonial]
                              |
                        Replied? --Yes--> [EXIT]
                              |
                              No
                              v
                        Email 5 Breakup (Day 22)
                              |
                        Replied "keep me in mind"? --Yes--> [standby list]
                              |
                              No
                              v
                        [EXIT: suppression / re-try in 3–6 months]
```

**Homeowner enquiry → win:**

```
[Enquiry submitted] --> Email 1 Thanks (immediate)
                              |
                        Email 2 Quote (when ready, <= quote_turnaround)
                              |
                        Said yes / booked? --Yes--> [EXIT: becomes a job -> transactional only]
                              |
                              No
                              v
                        Email 3 Nudge (Day +2–3)
                              |
                        Replied? --Yes--> [EXIT]
                              |
                              No
                              v
                        Email 4 Still thinking? (Day +5–7)
                              |
                        [EXIT: no reply -> drop to seasonal list]
```

**After a first job (both audiences):** job complete → review + referral (Part 2 §2) → then B2B accounts enter nurture (Part 1 §4); homeowners drop to the seasonal list and re-enter win-back once dormant.

## A/B tests to run

1. **Subject: benefit vs question.** B2B intro — "A reliable maintenance contractor for {{agency_name}}" vs "One number for repairs across your managed properties". Split 50/50, measure open rate over 100+ sends per variant.
2. **Trial-job ask placement.** Move the "give us one job, no tie-in" offer from Email 4 up to Email 2 for half the agent list. Measure trial jobs booked per 100 contacts — earlier ask may convert faster or may feel pushy.
3. **Quote email subject.** Homeowner — "Your quote for {{job_summary}}" vs "{{job_summary}} — {{quote_total}}, fixed in writing". Does showing the price in the subject lift booking rate?
4. **Review CTA.** "How did we do on {{job_summary}}?" vs "A quick favour, {{first_name}}? 30 seconds". Measure reviews left per 100 sends.
5. **Send time.** B2B — Tue 8–10am vs Thu 4–6pm. Measure open + reply rate.

Test one variable at a time, keep each variant running until you've ~100 sends or a clear winner, then roll the winner out.

## Metrics to track

- **Primary per sequence:** B2B cold → trial jobs booked; B2B nurture → recurring arrangements + repeat jobs; homeowner → quotes accepted; review/referral → reviews gained + referred jobs; seasonal/win-back → jobs booked.
- **Per email:** open rate, reply/click rate, unsubscribe/STOP rate. Watch for the email where drop-off spikes — that's the one to rewrite.
- **Sequence level:** overall conversion, time-to-conversion, and which touch tends to land the reply (so you know which email is doing the work).
- **The one question that beats any dashboard:** ask every new enquiry "where did you hear about us?" and log it. After a quarter you'll know which sequence actually pays.
- **Review cadence:** weekly for the first month (catch broken tokens, weak subjects), then monthly.

## Build checklist (campaigns feature)

No external email tool needed — it's all in the EGO app's bulk-email campaigns feature. To set up each sequence:

1. **Segment the list** — separate cold B2B (agents / landlords / commercial), warm B2B accounts, homeowner enquiries, past customers, and opted-in seasonal contacts. Never mix cold and warm.
2. **Set the trigger** — enquiry submitted (homeowner), job marked complete (review/referral), contact added to a cold list (B2B), dormancy window reached (win-back), or a seasonal send date.
3. **Add each email with its delay** — use the Day numbers in each sequence.
4. **Wire the exits** — remove anyone who replies, books, accepts, or opts out. Quiet anyone mid-job (they're already on transactional emails).
5. **Fill the tokens** — never send a visible `{{token}}`; blank one means rewrite the line.
6. **Add the opt-out** — cold B2B gets the "Reply STOP" line; all marketing (non-transactional) emails get an unsubscribe link. Keep a suppression list and honour it immediately.
7. **Track** — log opens, replies and booked jobs per email so you can spot the weak link and A/B test it.

> Enquiry-stage and quote emails are transactional lifecycle messages tied to a live request, so they don't need an unsubscribe line. The moment a contact goes quiet or dormant, treat further contact as marketing.
