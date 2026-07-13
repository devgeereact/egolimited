# Campaigns v2 — design

Rebuild of the campaigns/outreach system. Written before the code, so the decisions are arguable
rather than implied.

## What was wrong with v1

Not a style problem. A **model** problem: there was no such thing as "a campaign". There was one
global drip toggle, a flat `ego_leads.status` enum, and three uncoordinated ways to send an email.
Every bug below falls out of that:

| v1 behaviour | Consequence |
|---|---|
| One global `ego_campaign_automation` row | You cannot run two campaigns. Ever. |
| `leads.status='emailed'` is the only progress marker | A manual bulk send to "approved leads" flips the status, and the cron's `WHERE status='approved'` stops matching — **every in-flight sequence is silently abandoned mid-way**. Nobody is told. |
| Sending happens **inside the HTTP request**, one raw SMTP connection per recipient, 120ms apart | A big send exceeds `max_execution_time`, dies mid-list, and leaves **no record of where it stopped**. Retrying re-emails everyone it already reached. |
| Step 1's delay measured from `leads.created_at` | The UI says "send after approval". The code means "after we scraped them". A lead approved 10 days after discovery gets step 1 **instantly**. |
| Bounces only get archived in the Inbox | A hard-bouncing address keeps receiving every subsequent step, forever. |
| `POST /subscribers` does `ON DUPLICATE KEY UPDATE subscribed=1` | An admin retyping an address **silently un-unsubscribes** someone who opted out. That is the one thing PECR does not forgive. |
| No reply detection | We keep drip-mailing someone who already replied. The single rudest thing a cold-outreach tool can do. |

## The v2 model

```
Campaign ──< Step            (ordered touches; delay measured from the PREVIOUS send)
    │
    └──< Enrollment ──< Send (one row per recipient per campaign, with its own state + cursor)

Suppression   (email → reason; checked at enqueue AND again at send)
```

**Enrollment is the spine.** A lead's membership of a campaign is a *row*, not a status enum on the
lead. That single change fixes most of the table above: a lead can be in one campaign and not
another; progress lives on the enrollment (`current_step`, `next_due_at`), so nothing else can
clobber it; and stopping a sequence is a state transition with a *reason*, not a side effect.

**Enrollment states:** `active` · `completed` · `replied` · `bounced` · `unsubscribed` · `stopped`.
Only `active` is ever picked up by the worker. Everything else is terminal and says *why*.

## Sending: a queue, not a loop

`POST /campaigns/{send,start}` no longer sends anything. It **enrolls** and **queues**. A worker
(`campaign_worker.php`, cron) drains the queue:

- reuses **one** SMTP connection for the whole batch (v1 opened a fresh TCP + TLS + AUTH handshake
  per recipient — that alone is why sends took minutes)
- claims each send row atomically (`status='queued' → 'sending'`), so two overlapping cron runs
  cannot double-send
- is **resumable by construction**: if the process dies, the un-drained rows are still `queued`
- gated to business hours (Mon–Fri, 08:00–17:59 Europe/London, skipping UK bank holidays)

A killed worker now loses nothing. A killed v1 request lost the whole broadcast.

## Compliance, built in rather than bolted on

Cold B2B email in the UK is legal under PECR **if** you do specific things. So the product does them,
and it does them structurally — not as a checkbox someone can forget:

1. **Suppression is a table, not a flag.** `ego_suppressions(email, reason)`. Checked when enrolling
   AND again immediately before every single send (the list can change between the two).
2. **Unsubscribe cannot be undone by staff.** Adding a subscriber no longer resurrects an opted-out
   address. Removal from suppression is a deliberate, logged act.
3. **Bounces suppress automatically.** The IMAP sync already detects them; now a hard bounce writes a
   suppression and stops the enrollment.
4. **A reply stops the sequence.** Inbound mail from an enrolled address ends the sequence
   (`state='replied'`). This is both basic manners and the strongest deliverability signal there is.
5. **Every send carries sender identity + a working one-click unsubscribe.** The HMAC key comes from
   config, not a string literal in the repo (v1's was `"ego-unsub-v1"`, committed, forgeable).
6. **No open-tracking pixel.** Deliberate. A tracking pixel on cold email to people who never asked
   for it is exactly the processing that needs consent we do not have. We track what the mail server
   tells us: sent, bounced, replied, unsubscribed. Those are the numbers that matter anyway.

## The interface

Three panes, because that is the shape mail *is* — Gmail, Outlook and Superhuman all converged on it
for the same reason:

```
┌────────────┬──────────────────────┬─────────────────────────┐
│ Campaigns  │ Recipients           │ Reading / editing pane  │
│            │                      │                         │
│ Active   3 │ ▸ Marchmont Estates  │  Sequence   Audience    │
│ Draft    1 │   step 2 · due Fri   │  ───────────────────    │
│ Done     7 │ ▸ Bell Court Ltd     │  1 ▸ Intro    +0d       │
│            │   replied ✓          │  2 ▸ Nudge    +3d       │
│ Suppressed │ ▸ …                  │  3 ▸ Last try +7d       │
└────────────┴──────────────────────┴─────────────────────────┘
```

Left = campaigns (and the suppression list, which is a first-class destination, not a hidden
setting). Middle = who is in it and exactly where each person has got to. Right = the work.

The craft details that make it feel built rather than assembled: keyboard navigation (`j`/`k`,
`Enter`, `/` to search), optimistic state everywhere, live merge preview rendered **by the server**
(v1 had a second, subtly different merge implementation in the client that hardcoded the company
name — the preview could lie about what would actually be sent), and empty states that tell you what
to do next instead of apologising.
