import { Link } from "react-router-dom"
import { Mail, Phone, MapPin, ArrowRight, Check } from "lucide-react"
import { PageHero, Section } from "@/site/components/Bits"
import Seo from "@/site/components/Seo"
import { company } from "@/site/content"
import { useCompany } from "@/site/CompanyProvider"

type Kind = "privacy" | "terms" | "cookies"

interface LegalSection {
  h: string
  p?: string[]
  list?: string[]
}
interface LegalDoc {
  title: string
  intro: string
  updated: string
  sections: LegalSection[]
}

const UPDATED = "4 September 2026"

/**
 * Text the owner still has to supply before these pages are fit to publish.
 *
 * It is rendered, not hidden in a comment, on purpose. A placeholder that shows up on the
 * page gets filled in. A polite piece of boilerplate that papers over the gap ("EGO LTD,
 * registered in England and Wales") reads as finished and never does. UK trading
 * disclosure rules want the registered name, the registered number, the place of
 * registration and the registered office address, and none of those can be guessed from
 * a domain name or a trading style.
 */
const OWNER_INPUT = "[REQUIRES OWNER INPUT]"

const docs: Record<Kind, LegalDoc> = {
  privacy: {
    title: "Privacy policy",
    intro:
      "How EGO LTD collects, uses, and protects the information you share with us, and the rights you have over it.",
    updated: UPDATED,
    sections: [
      {
        h: "Who we are",
        p: [
          `${company.name} ("EGO", "we", "us", "our") is a general maintenance company working across London and the surrounding area. We are the data controller for the personal information described here.`,
          `Registered company name: ${OWNER_INPUT}. Registered in England and Wales, company number ${OWNER_INPUT}. Registered office: ${OWNER_INPUT}.`,
          `For anything to do with this policy or your information, email ${company.email}, call ${company.phone}, or write to us at ${company.address}. We are a small business and do not have a data protection officer, so those routes reach the people who decide.`,
          "We handle your information in line with the UK GDPR and the Data Protection Act 2018.",
        ],
      },
      {
        h: "The information we collect",
        p: [
          "We collect what you give us and what we need to quote for, carry out, and account for the work. In practice that is:",
        ],
        list: [
          "Enquiries: the name, email address, phone number, property address, type of work and description you type into our contact form. Name and description are required, the rest are optional.",
          "Upkeep list: your email address, if you choose to join it.",
          "Job records: the work requested, when it is booked, which engineer attends, notes made on site, and the name of whoever signs the job off.",
          "Photographs: our engineers photograph the work, which means photographs taken at your property and sometimes inside it.",
          "Money: quotes, invoices, payment references and the payments received against them. We are paid by bank transfer. We do not take card payments, so we never hold card details.",
          "Portal access: a secure, unguessable link we email you, and the reference plus surname you can type into the job tracker instead.",
          "Messages: email you send us and we send you, portal messages, and notes of calls. Our office mailbox is read into the system so a conversation stays attached to the job it is about.",
          "Reviews: the rating and comment you leave in the portal, and whether you agreed to it being shown on this website.",
          "Health and safety records: if there is an accident or a near miss on a job, we record what happened, where, and who was involved, because we are required to.",
          "Technical data: your IP address, briefly, so we can rate limit our public forms against abuse. Our web server and Cloudflare, who sit in front of this site, keep their own access logs in the ordinary way.",
        ],
        // Every item above is a field the system genuinely writes. Anything that could not be
        // pointed at in the code or the database was left out rather than covered by a vague
        // catch-all, which is the whole difference between a notice and a disclaimer.
      },
      {
        h: "What we do not collect",
        p: [
          "It is as useful to know what is absent. This website runs no analytics, no advertising or remarketing pixels, no tag manager, no session replay and no heatmaps, and it does not profile you. We do not ask for or track your device location. We do not knowingly collect information about children, and our services are sold to adults arranging work on a property. We take no payment on this site, so no card details pass through it.",
        ],
      },
      {
        h: "How and why we use your information",
        p: [
          "We use your information for the purposes below, and rely on the lawful basis shown for each. Where a basis depends on a business judgement rather than a plain fact, we are still confirming it with our advisers.",
        ],
        list: [
          "To answer your enquiry and prepare a quote: taking steps at your request before entering a contract.",
          "To carry out and manage the work you book: performance of our contract with you.",
          "To invoice you and keep financial records: performance of our contract, and our legal obligations for tax and accounting.",
          "To keep you updated about your job and answer questions: performance of our contract.",
          "To send you the upkeep list: your consent, given when you join it and withdrawn by the unsubscribe link in every one of those emails.",
          "To keep our public forms usable and stop abuse: our legitimate interest in a working website.",
          "To meet legal, tax, insurance and health and safety duties: compliance with our legal obligations.",
          "To show a review on this website: your consent, given by ticking the box on the review form, and withdrawn by telling us.",
        ],
      },
      {
        h: "Automated drafting and AI",
        p: [
          "We use an AI service to draft text: an outline of a job for the engineer, a first version of an email or announcement, or a tidier write-up of a safety report. When we do, the words in that item are sent to OpenRouter, which passes them to the model provider that answers. That can include what you told us about the work, and it can include a description of an incident.",
          "Two things about this matter. Nothing the AI produces decides anything about you: it writes a draft that a person reads, edits and chooses whether to use. And the model providers behind OpenRouter are outside the UK, so this is a transfer abroad. The safeguard we rely on for that transfer is still being confirmed, and we will name it here once it is.",
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "We never sell your information, and we never pass it to anyone for their own marketing. It reaches these people and services, and no others:",
        ],
        list: [
          "The engineers and subcontractors who do your work, so they know what to do and where.",
          "Our hosting provider, whose servers hold the website, the database and the photographs, and who also carries our email.",
          "Cloudflare, which sits in front of this website to serve and protect it, and therefore sees requests to it.",
          "Google, in two narrow places: the fonts this site uses are served by Google, so loading a page tells Google your IP address, and the map on our contact page only loads if you click to load it.",
          "OpenRouter and the model provider behind it, when we use AI to draft something, as described above.",
          "Our bank, to receive and reconcile the payments you make.",
          "Our accountant and professional advisers, where reasonably required.",
          "Insurers, regulators or authorities where we are legally required to disclose, or to establish or defend legal claims.",
        ],
      },
      {
        h: "Where we store your information",
        p: [
          "The database, the job photographs and the backups sit on our hosting provider's servers. Cloudflare, which fronts this website, operates a global network. The AI service described above is outside the UK.",
          "We are documenting the location of each of these and the safeguard that applies to each transfer, and will state both here rather than leave you with a general assurance. Until we do, treat this section as incomplete.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "Financial records are kept for six years plus the current year, because tax law requires it. Payment records are never erased outright: a mistake is reversed and both the mistake and its correction stay on the record.",
          "Job records, photographs, messages and reviews are kept while they are useful for warranty, insurance and dispute reasons, and we are setting a firm period for each rather than keeping them by default. IP addresses recorded for rate limiting are discarded after about a day.",
          "We are working through the rest of our retention periods with our advisers, and this section will name the period for each kind of record once they are set. If you want something removed sooner, ask us, and we will do it unless we are required to keep it.",
        ],
      },
      {
        h: "How we protect your information",
        p: [
          "Access to the system needs a password, staff accounts can turn on two factor authentication, and what each person can see depends on their role, checked by the server on every request rather than hidden in the interface.",
          "Job photographs are kept outside the public web folder and served only through short-lived signed links, so a photograph of your property has no permanent public address. The customer portal link is unguessable rather than password protected, which is why we ask you not to forward it.",
          "The site is served over HTTPS, database queries are parameterised, public forms are rate limited, and the database is backed up daily to a location outside the website. No system is perfect, and we would rather say that than promise otherwise.",
        ],
      },
      {
        h: "Your rights",
        p: ["Under data protection law you have the right to:"],
        list: [
          "Access: ask for a copy of the personal information we hold about you.",
          "Rectification: ask us to correct information that is wrong or incomplete.",
          "Erasure: ask us to delete information where we are not required to keep it.",
          "Restriction: ask us to limit how we use your information in certain cases.",
          "Object: object to processing we carry out on the basis of legitimate interests.",
          "Portability: ask for certain information in a portable, machine-readable format.",
          "Withdraw consent: where we rely on consent, you can withdraw it at any time.",
        ],
      },
      {
        h: "The choices you can make yourself",
        p: [
          "Some things you do not need to ask us for:",
        ],
        list: [
          "Upkeep list: every marketing email has a one-click unsubscribe link. Using it stops those emails and we do not put you back on the list if someone later retypes your address.",
          "Reviews: the tick box on the review form controls whether your review appears on this website. Untick it and it comes down. Only your first name is ever shown, never your full name or address.",
          "Cookies: the Cookie preferences link at the bottom of any page reopens the notice so you can change your answer.",
          "Job updates about work you have booked are not marketing, and unsubscribing from the upkeep list does not stop them. If you would rather we did not email you about your own job, tell us and we will call instead.",
        ],
      },
      {
        h: "Making a request or a complaint",
        p: [
          `To exercise any of your rights, email us at ${company.email} or call ${company.phone}. We do not have a self-service export or delete button, so a request comes to a person, and that person does it.`,
          "We will respond within one month, and we will not charge you unless a request is clearly excessive. We may ask you something only you would know about your job, so that we do not hand your information to somebody else. We will not ask you to email us a copy of your passport or driving licence.",
          "Some records we cannot delete on request: invoices and payments have to be kept for six years for tax, and a health and safety record has to survive as the record of what happened. We will tell you if that applies and what is being kept.",
          "If you are unhappy with how we have handled your information, tell us first so we can put it right. You can also complain to the Information Commissioner's Office, the UK regulator, at ico.org.uk or on 0303 123 1113.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "This site keeps a small number of things in your browser and sets no cookies of its own on the public pages. The Cookie policy lists every one of them, what it is for and how to clear it.",
        ],
      },
      {
        h: "Changes to this policy",
        p: [
          "We may update this policy from time to time. The date at the top shows when it was last changed. Where a change is significant, we will make that clear on this page.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service",
    intro:
      "The terms on which EGO LTD provides maintenance work. They are written to be clear and fair to both sides.",
    updated: UPDATED,
    sections: [
      {
        h: "About these terms",
        p: [
          `These terms apply to the maintenance services that ${company.name} provides. "You" means the customer; "we" and "us" mean EGO; "the work" means the services set out in your quote or agreed with you. By accepting a quote or asking us to start work, you agree to these terms.`,
          `You are contracting with ${OWNER_INPUT}, registered in England and Wales, company number ${OWNER_INPUT}, registered office ${OWNER_INPUT}. VAT number ${OWNER_INPUT}.`,
        ],
      },
      {
        h: "Quotes and estimates",
        p: [
          "A quote is a fixed price for a clearly defined scope of work. An estimate is our best assessment of likely cost where the full extent of the work cannot be known up front. We will always tell you which one you have.",
          "Quotes and estimates are valid for the period stated on them and are based on the information and access you give us. If we find the conditions on site differ materially from what we were told, we will tell you and agree any change with you before going further.",
        ],
      },
      {
        h: "Accepting work and forming a contract",
        p: [
          "A contract is formed when you accept a quote or estimate (in writing, by email, or by asking us to proceed) and we confirm we can carry out the work. For some jobs we may ask for a deposit before booking materials or a date.",
        ],
      },
      {
        h: "Our work and standards",
        p: [
          "We carry out the work with reasonable skill and care, to a good standard, and we leave the area clean. We are honest about the limits of our trade: if a job is outside what we should take on, we will say so rather than do work we are not the right people for.",
        ],
      },
      {
        h: "Your responsibilities",
        p: [
          "To let us do the work properly, we ask that you:",
        ],
        list: [
          "Give us safe and timely access to the property at the agreed time.",
          "Give us accurate information about the work and the property.",
          "Keep the work area reasonably clear and tell us about any hazards, such as asbestos or known electrical faults.",
          "Make sure you have the authority to instruct work on the property.",
        ],
      },
      {
        h: "Variations and additional work",
        p: [
          "If, once on site, we find that extra work is needed, we will tell you what it involves and what it will cost before we carry it out. We will not charge you for additional work you have not agreed to.",
        ],
      },
      {
        h: "Materials and parts",
        p: [
          "Unless your quote says otherwise, materials and parts are supplied at cost and itemised on your invoice, with receipts available. Materials remain our property until they are paid for in full. Any manufacturer guarantee on a part is passed on to you.",
        ],
      },
      {
        h: "Regulated work",
        p: [
          "Some work is regulated and must be carried out by a registered specialist. Gas work is carried out only by Gas Safe registered engineers, and notifiable electrical work only by qualified electricians. Where a job needs one, we arrange or recommend a certified specialist rather than cut corners.",
        ],
      },
      {
        h: "Prices, invoicing, and payment",
        p: [
          "Prices are stated as inclusive or exclusive of VAT as shown on your quote. We invoice on completion unless we have agreed a different arrangement, and invoices are due within the period stated on them.",
          "Payment is by bank transfer, using the account details and payment reference shown on your invoice. We do not take card payments. For business customers, we may charge interest on overdue invoices in line with the Late Payment of Commercial Debts (Interest) Act 1998.",
        ],
      },
      {
        h: "Cancelling or rescheduling",
        p: [
          "If you need to cancel or rearrange, please give us as much notice as you can so we can re-use the slot. Where you cancel at short notice after we have committed time, materials, or a specialist, we may charge for what we have reasonably incurred.",
          "If you are a consumer and booked away from our premises, you normally have a 14-day right to cancel. If you ask us to start within that period and then cancel, you may be charged for the work already done.",
        ],
      },
      {
        h: "Our guarantee",
        p: [
          "We stand behind our workmanship. If work we carried out fails because of our workmanship within the guarantee period, we will put it right at no further charge. The guarantee does not cover fair wear and tear, misuse, pre-existing faults, or work later altered by someone else.",
        ],
      },
      {
        h: "Liability and insurance",
        p: [
          "We carry public liability insurance, in place on every job, and a current certificate is available on request.",
          "We do not exclude or limit our liability for death or personal injury caused by our negligence, for fraud, or for anything else that cannot be limited by law. Otherwise, our liability for any loss arising from the work is limited to the price of that work, and we are not liable for indirect or consequential losses. If you are a consumer, your statutory rights are not affected.",
        ],
      },
      {
        h: "Complaints",
        p: [
          `If something is not right, tell us as soon as you can at ${company.email} or on ${company.phone}. We take complaints seriously and aim to resolve them promptly and fairly.`,
        ],
      },
      {
        h: "Events outside our control",
        p: [
          "We are not responsible for delays or failures caused by events outside our reasonable control, such as severe weather, supply shortages, or loss of access. Where this happens, we will let you know and agree a new date.",
        ],
      },
      {
        h: "Governing law",
        p: [
          "These terms are governed by the law of England & Wales, and the courts of England & Wales have jurisdiction. If you are a consumer, you may also be able to bring proceedings in your local courts.",
        ],
      },
      {
        h: "Changes to these terms",
        p: [
          "We may update these terms. The version that applies to your job is the one published when you accepted the quote, and the date at the top of this page shows when this version was published. We will not change the terms of work already agreed with you.",
        ],
      },
      {
        h: "Your information",
        p: [
          "How we handle the information you give us is set out in our Privacy policy, which forms part of these terms.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie policy",
    intro:
      "How this website uses cookies and similar technology, and how you can control them.",
    updated: UPDATED,
    sections: [
      {
        h: "What cookies are",
        p: [
          "Cookies are small text files placed on your device when you visit a website. They let the site remember your actions and preferences over time, and help things like logging in and security work. Similar technologies such as local storage do much the same job, and we mean all of them when we say \"cookies\" here.",
        ],
      },
      {
        h: "What this site stores, in full",
        p: [
          "This is the complete list, checked against the code and then checked again by loading the site in a fresh browser. Visiting a public page of this website sets no cookies at all. Everything below is local storage, which stays on your device and is never sent to us.",
        ],
        list: [
          "ego_cookie_consent: the answer you gave to the cookie notice, the version of the notice you answered, and when. Kept until you clear it or the notice changes. Necessary, because it is the record of your own choice.",
          "theme: whether you chose light or dark. Kept until you clear it. A preference, and the site works without it.",
          "ego_token and ego_user: set only after you sign in to the staff app, so you stay signed in. Removed when you sign out. Necessary for signing in.",
          "sidebar_state: a cookie set only inside the signed-in staff app, remembering whether the menu is open. Lasts seven days.",
          "ego_today and the offline queue: only inside the engineers' app, holding their own day's work so it survives no signal.",
        ],
      },
      {
        h: "Third-party services",
        p: [
          "We run no advertising, analytics or tracking on this site. Two third parties are still involved in loading a page, and it is fairer to name them than to say there are none:",
        ],
        list: [
          "Google Fonts: the typefaces on this site are served by Google, so loading any page tells Google your IP address and which page you were on. Google sets no cookie doing this. We are looking at serving the fonts ourselves so that request stops happening.",
          "Google Maps: the map on our contact page does not load until you click the button that says so. Until you do, no request goes to Google Maps. If you click it, the map is a Google service and Google may set its own cookies at that point.",
          "Cloudflare sits in front of this site to serve and protect it. It may set a short-lived cookie to tell real visitors from bots. It is not used to track you across other websites.",
        ],
      },
      {
        h: "Your choice, and changing it",
        p: [
          "Because nothing optional runs today, the notice you saw is telling you what happens rather than asking you to enable something. Your answer is stored so that if we ever do add something optional, it stays off until you have said yes.",
          "You can reopen the notice and change your answer at any time using the Cookie preferences link at the bottom of every page.",
        ],
      },
      {
        h: "Managing and clearing storage",
        p: [
          "You can clear or block cookies and local storage through your browser settings, site by site. Chrome, Safari, Firefox and Edge each publish step-by-step guidance in their help pages.",
          "Clearing the necessary items above is safe. It will sign you out of the staff app and make the cookie notice appear again.",
        ],
      },
      {
        h: "Do Not Track",
        p: [
          "Some browsers can send a \"Do Not Track\" signal. There is no agreed industry standard for how sites should respond, so we do not currently change our behaviour based on it, but we keep our cookie use minimal regardless.",
        ],
      },
      {
        h: "Changes and contact",
        p: [
          `We may update this policy as our website changes. The date at the top shows when it was last updated. If you have any question about cookies, email us at ${company.email}.`,
        ],
      },
    ],
  },
}

const related: { kind: Kind; label: string }[] = [
  { kind: "privacy", label: "Privacy policy" },
  { kind: "terms", label: "Terms of service" },
  { kind: "cookies", label: "Cookie policy" },
]

function slugFor(kind: Kind) {
  return kind === "privacy" ? "/privacy" : kind === "terms" ? "/terms" : "/cookies"
}

// Optimised tags for the legal/utility pages. These are set to noindex — they
// hold no ranking value and only dilute crawl budget. See web brief 02.
const legalSeo: Record<Kind, { title: string; description: string }> = {
  privacy: {
    title: "Privacy Policy — EGO LTD",
    description:
      "How EGO LTD collects, uses and protects your personal data. Read our privacy policy.",
  },
  terms: {
    title: "Terms of Service — EGO LTD",
    description:
      "The terms that apply when you use EGO LTD's website and maintenance services.",
  },
  cookies: {
    title: "Cookie Policy — EGO LTD",
    description:
      "How EGO LTD uses cookies on this website, and how to manage your preferences.",
  },
}

export default function Legal({ kind }: { kind: Kind }) {
  // Live contact details for the "get in touch" card; the policy body text keeps
  // the static defaults (legal copy should not change silently).
  const live = useCompany()
  const doc = docs[kind]
  const seo = legalSeo[kind]
  return (
    <>
      <Seo title={seo.title} description={seo.description} path={`/${kind}`} noindex />
      <PageHero eyebrow="Legal" title={doc.title} intro={doc.intro} />
      <Section>
        <div className="mx-auto max-w-5xl">
          {/* Meta + cross-links to the other documents */}
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Last updated:{" "}
              <span className="font-medium text-foreground">{doc.updated}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => {
                const active = r.kind === kind
                return (
                  <Link
                    key={r.kind}
                    to={slugFor(r.kind)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                      (active
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-accent/50 hover:text-primary")
                    }
                  >
                    {r.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
            {/* Table of contents */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                On this page
              </div>
              <nav className="mt-3 flex flex-col gap-0.5">
                {doc.sections.map((s, i) => (
                  <a
                    key={s.h}
                    href={`#s-${i}`}
                    className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-bold text-accent-foreground transition-colors group-hover:bg-accent">
                      {i + 1}
                    </span>
                    {s.h}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Body */}
            <div className="min-w-0 space-y-6">
              {doc.sections.map((s, i) => (
                <section
                  key={s.h}
                  id={`s-${i}`}
                  className="scroll-mt-32 rounded-2xl border border-border bg-card p-6 md:p-8"
                >
                  <h2 className="flex items-center gap-3 font-serif text-xl font-bold">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground shadow-sm">
                      {i + 1}
                    </span>
                    {s.h}
                  </h2>
                  {s.p?.map((p, j) => (
                    <p key={j} className="mt-3 leading-relaxed text-muted-foreground">
                      {p}
                    </p>
                  ))}
                  {s.list && (
                    <ul className="mt-4 grid gap-2.5">
                      {s.list.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              {/* Contact callout */}
              <div className="rounded-2xl border border-border bg-secondary/40 p-7">
                <h2 className="font-serif text-lg font-bold">
                  Questions about this {doc.title.toLowerCase()}?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We are happy to explain anything here in plain terms. Get in
                  touch and a real person will help.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <a
                    href={`mailto:${live.email}`}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-sm transition-colors hover:border-accent/50"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-accent" />
                    <span className="font-medium">{live.email}</span>
                  </a>
                  <a
                    href={`tel:${live.phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-sm transition-colors hover:border-accent/50"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-accent" />
                    <span className="font-medium">{live.phone}</span>
                  </a>
                </div>
                <div className="mt-3 flex items-start gap-2.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {company.address}
                </div>
                <Link
                  to="/contact"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-accent"
                >
                  Contact us
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}
