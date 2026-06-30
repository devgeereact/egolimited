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

const UPDATED = "18 June 2026"

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
          `${company.name} ("EGO", "we", "us", "our") is a general maintenance company operating across London and the surrounding area, registered in England & Wales. We are the data controller responsible for the personal information described in this policy.`,
          `If you have any question about this policy or about how we handle your information, contact us at ${company.email}, call ${company.phone}, or write to us at ${company.address}.`,
          "We are committed to handling your information lawfully and transparently in line with the UK GDPR and the Data Protection Act 2018.",
        ],
      },
      {
        h: "The information we collect",
        p: [
          "We only collect what you give us or what we genuinely need to quote for, carry out, and account for the work. That typically includes:",
        ],
        list: [
          "Identity and contact details: your name, email address, phone number, and the property or billing address.",
          "Enquiry and job details: a description of the work, photos you choose to send us, access notes, and your scheduling preferences.",
          "Financial information: the invoices we raise and the payments you make. Card payments are handled by our payment provider; we do not store your full card number.",
          "Account information: the secure, time-limited link we email you to view your jobs, quotes, and invoices in the customer portal.",
          "Communications: the emails, messages, and notes from calls we exchange about your work.",
          "Technical and usage data: limited information such as your IP address, browser type, and the pages you visit, collected through cookies (see our Cookie policy).",
        ],
      },
      {
        h: "How and why we use your information",
        p: [
          "We use your information for the purposes below, and rely on the lawful basis shown for each:",
        ],
        list: [
          "To respond to your enquiry and prepare a quote: to take steps at your request before entering a contract, and our legitimate interest in answering enquiries.",
          "To carry out and manage the work you book: performance of our contract with you.",
          "To take payment and keep financial records: performance of our contract and our legal obligations for tax and accounting.",
          "To keep you updated about your job and respond to questions: performance of our contract and our legitimate interest in good service.",
          "To improve our service and website: our legitimate interest in understanding what is useful and running the site securely.",
          "To send occasional service updates: our legitimate interest, or your consent where consent is required.",
          "To meet legal, tax, insurance, and health-and-safety duties: compliance with our legal obligations.",
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "We never sell your data, and we never share it for someone else's marketing. We share it only where it is needed to do the work or meet a legal duty, with:",
        ],
        list: [
          "The engineers and vetted subcontractors who carry out your work.",
          "Our payment provider, to process card and online payments securely.",
          "Our accountant and professional advisers, where reasonably required.",
          "IT, hosting, and software providers who process data on our instructions under a contract that requires them to keep it secure.",
          "Insurers, regulators, or authorities where we are legally required to disclose, or to establish or defend legal claims.",
        ],
      },
      {
        h: "Where we store your information",
        p: [
          "We store your information on secure systems within the UK or European Economic Area wherever possible. If any provider we use processes data outside the UK/EEA, we make sure an appropriate safeguard is in place, such as a UK adequacy decision or standard contractual clauses.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "Enquiries that do not turn into a booking are kept for a limited period and then deleted.",
          "Job, account, and financial records are kept for as long as we need them to meet our tax, insurance, and warranty obligations. That is generally up to six years after our last dealing with you, after which they are securely deleted or anonymised.",
        ],
      },
      {
        h: "How we protect your information",
        p: [
          "We use appropriate technical and organisational measures to protect your information against loss, misuse, and unauthorised access. Access is limited to people who need it to do their job, the customer portal uses secure time-limited links rather than stored passwords, and our systems are hosted on reputable, secured infrastructure.",
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
        h: "Making a request or a complaint",
        p: [
          `To exercise any of your rights, email us at ${company.email}. We will respond within one month, and we will not charge you unless a request is clearly excessive.`,
          "If you are unhappy with how we have handled your information, please tell us first so we can put it right. You also have the right to complain to the Information Commissioner's Office (ICO), the UK regulator, at ico.org.uk or on 0303 123 1113.",
        ],
      },
      {
        h: "Cookies",
        p: [
          "Our website uses a small number of cookies. For full detail on what they do and how to manage them, see our Cookie policy.",
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
          "You can pay by bank transfer or by card using the details or link on your invoice. For business customers, we may charge interest on overdue invoices in line with the Late Payment of Commercial Debts (Interest) Act 1998.",
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
        h: "How we use cookies",
        p: [
          "We use cookies to keep the website and the customer portal working, to remember your preferences, and to understand in aggregate how the site is used so we can improve it. We keep our use of cookies to the minimum needed.",
        ],
      },
      {
        h: "The cookies we use",
        p: ["The cookies on this site fall into three groups:"],
        list: [
          "Strictly necessary: needed for the site, secure login, and the customer portal to work. These cannot be switched off in our systems.",
          "Functional: remember choices you make, such as light or dark mode, so the site behaves the way you expect.",
          "Analytics: help us understand which pages are useful, in aggregate. This data does not identify you personally.",
        ],
      },
      {
        h: "Third-party cookies",
        p: [
          "A few trusted third parties may set cookies when their service is in use, for example our payment provider during checkout, or a privacy-respecting analytics provider. These providers act under their own privacy terms, and we only work with providers that handle data responsibly.",
        ],
      },
      {
        h: "Managing and disabling cookies",
        p: [
          "You can clear or block cookies at any time through your browser settings, and most browsers let you control them site by site. The major browsers (Chrome, Safari, Firefox, and Edge) each publish step-by-step guidance in their help pages.",
          "Please note that if you block strictly necessary cookies, parts of the site and the member area may not work properly.",
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
