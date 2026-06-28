# Brightwork — Field Service Management App

> **Build documentation pack.** Everything needed to plan, scope, and build the app.
> "Brightwork" is a placeholder name — swap it for the real company name throughout.

This is a **single-company** (single-tenant) field service management tool for a maintenance
business. It runs the full lifecycle of a job — from a customer enquiry to the final bank
transfer — across three user roles.

---

## The three roles

| Role | Device | Who | What they do |
|------|--------|-----|--------------|
| **Admin** | Desktop + mobile web | Office (the owner) | Runs everything: customers, jobs, scheduling, invoicing, payments, messages |
| **Engineer** | Mobile (PWA) | Field staff | Sees today's jobs, updates status on site, adds photos/notes, marks complete |
| **Customer** | Mobile/web link | The client | Tracks their job via a unique link, sees the invoice + bank details to pay |

## The spine: customer → cash

```
Enquiry → Customer → Job created → Scheduled & assigned → Engineer on site
        → Job completed → Invoice raised & sent → Payment received → Closed
```

Everything in the app hangs off this one loop. Build it first, build it well.

## Build order (phases)

| Phase | Theme | Ships |
|-------|-------|-------|
| **1 — MVP** | The spine | Customers, jobs, scheduling, engineer mobile app, invoicing, manual bank-transfer payment, dashboard. Usable on day one. |
| **2** | Comms + portal | Outbound email (SMTP) + SMS, customer tracking portal with unique codes, automated status notifications |
| **3** | AI + inbound email | AI assistant (draft/summarise/triage), reading incoming email and threading it to jobs |

---

## The documents

Read them in order. Each one is self-contained but cross-references the others.

| File | What it covers |
|------|----------------|
| [`01-PRD.md`](01-PRD.md) | Product requirements: detailed MVP + Phase 2/3 features, user stories, acceptance criteria, success metrics |
| [`02-WORKFLOWS.md`](02-WORKFLOWS.md) | End-to-end flows, status state machines, notification matrix, edge cases |
| [`03-DATA-MODEL.md`](03-DATA-MODEL.md) | Entities, fields, relationships, ERD, example SQL schema |
| [`04-SCREENS.md`](04-SCREENS.md) | Screen-by-screen spec for all three apps: fields, actions, states |
| [`05-TECH-STACK.md`](05-TECH-STACK.md) | Recommended architecture, stack, integrations, security, UK compliance, deployment |
| [`06-DEVELOPER-PROMPT.md`](06-DEVELOPER-PROMPT.md) | Copy-paste prompts to build the app with an AI coding agent, milestone by milestone |

## How to use this with an AI coding agent

1. Put this whole `build-pack/` folder in a new empty Git repo.
2. Open it in Claude Code, Cursor, or similar.
3. Start with the **kickoff prompt** in `06-DEVELOPER-PROMPT.md`. It tells the agent to read these
   docs first, then build Phase 1 in ordered milestones.
4. Build, test, and review one milestone at a time. Do not let the agent build everything at once.

## The one rule that makes or breaks it

**Adoption.** If it's slower than the whiteboard, the notebook, and WhatsApp, it dies. Every screen
must be fast and obvious. Test the engineer's job screen and the admin dashboard with real users
before building the rest.
