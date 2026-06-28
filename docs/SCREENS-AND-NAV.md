# EGO LIMITED — Screens & Navigation Inventory

> The master page/nav map. What we **reuse** from PULSE UI vs what we **build**. Pairs with
> `04-SCREENS.md` (functional spec) and `PULSE-UI-DESIGN-SYSTEM.md` (UI rules). Build pack MVP
> (the customer→cash spine) ships first; the broader template/admin extras follow.

## Nav shells (three surfaces)
- **Admin** — left sidebar (`app-sidebar.tsx`). Desktop-first.
- **Engineer** — bottom tab bar (mobile PWA). New shell. Tabs: Today · Jobs · Profile.
- **Customer** — no nav; single tokenised `/track/{token}` page.

## Dashboards (3, per owner) — ♻️ repurpose the 3 demo dashboards
| EGO dashboard | From |
|---------------|------|
| **Admin dashboard** | `dashboard/analytics` |
| **Staff dashboard** | `dashboard/crm` |
| **Customer dashboard** | `dashboard/eCommerce` |

---

## Admin sidebar — EGO core (build-pack MVP)
| Item | Status | Source / note |
|------|--------|---------------|
| Dashboard (Admin) | ♻️ repurpose | `dashboard/analytics` |
| Customers | ♻️ repurpose | `eCommerce/CustomerList` + `CustomerDetails` |
| Jobs | 🆕 new | scaffold from `eCommerce/OrderList`+`OrderDetails`; `JOB-####`, status pills, activity log |
| Schedule | ♻️ repurpose | `apps/CalendarPage` (FullCalendar) |
| Invoices | ♻️ repurpose | `eCommerce/Invoice` + `InvoiceCard` (+ status filter, VAT, PDF) |
| Messages *(Phase 2)* | ♻️ repurpose | `apps/Chatbox` |
| Settings | ♻️+➕ | `account/*` + forms; ADD company/VAT/bank/invoicing/engineers sections |

Engineer PWA (🆕 new shell): **Today**, **My Jobs**, **Job detail (field)**, **Profile** (♻️ `account/UserProfile`).
Customer portal (🆕): **Track timeline**, **Invoice/pay** (Phase 2), **Contact**.
Shared (🆕): **Status pill** — scheduled=blue, en-route/on-site=amber, completed/paid=green, sent=purple, overdue=red.

---

## Extended template pages — ✅ KEEP (already in kit, owner wants them)
File Manager (`apps/FileManager` + `components/file-manager/`) · Pricing (`pricing/PricingPage`) ·
All Authentication basic + **cover** (`auth/basic/*`, `auth/cover/*`) · All Account
(`account/UserProfile|EditProfile|PasswordSettings|NotificationSettings`) · Profile · Chat / contact
card (`apps/Chatbox`) · Calendar (`apps/CalendarPage`) · Invoice (`eCommerce/Invoice`,`InvoiceCard`) ·
FAQ (`FAQPage`) · File Uploads (`forms/fileupload/*`) · Notifications (`notification-dropdown` +
`account/NotificationSettings`) · Project list (`advance-tables/ProjectTable`) · Data widgets/tables
(`widgets/data/*`, `tables/*`) · Icons (`icons/Lucide|Bootstrap|Boxicons`) · Error 404/500/ComingSoon.
Helper/gradient classes in `index.css` — **keep for later use**.

## Partial — component exists, build the page
| Item | Have | Do |
|------|------|----|
| Contact list | `eCommerce/CustomerList`, `listgroups/UserFollowList` | assemble contacts page |
| Blog | `cards/BlogCards` | add blog list/detail, reuse card |
| Timeline | inline in `CustomerDetails`/`UserProfile` | lift into standalone Timeline |
| Teams board | `advance-tables/TeamTable`, `team-switcher` | build board view |
| Payment form | `forms/layouts/CheckoutBillingForm` | turn into real payment form |

## ADD — build new (★ = new dependency)
| Item | Note |
|------|------|
| Email / Emails (inbox) | new mailbox UI |
| Task board | kanban ★ `@dnd-kit/core` + `@dnd-kit/sortable` |
| Production Board | kanban variant (shares Task-board base) |
| Testimonial | new section/page |
| Weather | widget — **Open-Meteo** API (free, no key) + lucide weather icons; no npm dep |
| Maintenance | new page (or repurpose `ComingSoon`) |
| **Map** | ★ `react-leaflet` + `leaflet` — **Leaflet only** (free, no API key). Job locations/pins. No Google |
| **Customer Design Studio** | 🆕 company **content/marketing studio**: create social-media posts, campaigns, company content. Reuse `tiptap` (already in deps), file-upload, file-manager assets. Larger feature — scope after MVP |

## New dependencies to install (when those features start)
- `react-leaflet` + `leaflet` (+ `@types/leaflet`) — maps
- `@dnd-kit/core` + `@dnd-kit/sortable` — Task/Production boards
- (Weather uses Open-Meteo HTTP API — no package.)
- Design Studio: `tiptap` already present; add a canvas/export lib only if needed later.

## Icons rule
Primary set = **lucide-react** (matches the kit). Use it on every new page for visual consistency;
Bootstrap Icons + Boxicons (CDN) remain available. Don't mix in a new icon family.

## Build order (recommended)
1. **EGO MVP spine** (build pack M1–M8): auth/roles → Customers → Jobs + status machine → Schedule →
   Engineer PWA → Invoices → Payments + dashboards → Settings.
2. **Admin extras** the business uses next: Messages, Email, Map (job locations), Timeline, Contacts.
3. **Template/showcase + creative**: Blog, Testimonial, Pricing, Task/Production boards, Weather,
   Teams board, **Customer Design Studio**.
