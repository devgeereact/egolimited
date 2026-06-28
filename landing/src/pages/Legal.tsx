import { PageHero, Section } from "@/site/components/Bits"
import Seo from "@/site/components/Seo"
import { useCompany } from "@/site/CompanyProvider"

type Kind = "privacy" | "terms" | "cookies"

const meta: Record<Kind, { title: string; eyebrow: string; intro: string; seoTitle: string; seoDesc: string; path: string }> = {
  privacy: { eyebrow: "Privacy", title: "Privacy Policy", intro: "How we collect, use, and protect the information you share with us. In plain English.", seoTitle: "Privacy Policy — EGO LTD", seoDesc: "How EGO LTD collects, uses and protects your personal data, and your rights under UK GDPR.", path: "/privacy" },
  terms: { eyebrow: "Terms", title: "Terms of Service", intro: "The terms that apply when you ask us to quote for or carry out work. Fair, clear, and written for people.", seoTitle: "Terms of Service — EGO LTD", seoDesc: "The terms that apply when EGO LTD quotes for or carries out maintenance work for you.", path: "/terms" },
  cookies: { eyebrow: "Cookies", title: "Cookie Policy", intro: "What cookies this site uses, why, and how you stay in control.", seoTitle: "Cookie Policy — EGO LTD", seoDesc: "What cookies the EGO LTD website uses and how to control them.", path: "/cookies" },
}

function Body({ kind, company }: { kind: Kind; company: ReturnType<typeof useCompany> }) {
  if (kind === "privacy") return (
    <>
      <p>EGO LTD ("we", "us", "our") respects your privacy. This policy explains what personal data we collect when you contact us or use our website, how we use it, and the rights you have. We are the data controller for the information you give us.</p>
      <h2>What we collect</h2>
      <p>When you send an enquiry or ask for a quote we collect your name, contact details (email, phone, and property address), and whatever you tell us about the work. If you call or email us, we keep a record of that correspondence. When you visit the website our host keeps standard server logs (IP address, browser type) for security and troubleshooting.</p>
      <h2>How we use it</h2>
      <p>We use your details only to respond to your enquiry, quote for and carry out the work, keep a record of the job at your property, and send the related invoice. We do not sell your data, and we do not pass it to third parties for marketing. Where we bring in a certified specialist (for example a Gas Safe engineer) we share only what is needed to do the job, and we tell you first.</p>
      <h2>How long we keep it</h2>
      <p>We keep enquiry and job records for as long as needed to provide the service and to meet our legal and tax obligations, then delete them. You can ask us to remove your details sooner where we are not required to keep them.</p>
      <h2>Your rights</h2>
      <p>Under UK GDPR you can ask to see the data we hold about you, have it corrected, or have it deleted. You can also object to how we use it. Email <a href={`mailto:${company.email}`}>{company.email}</a> and we will respond within one month. If you are unhappy with our response you can complain to the Information Commissioner's Office (ico.org.uk).</p>
      <h2>Contact</h2>
      <p>Questions about this policy? Email <a href={`mailto:${company.email}`}>{company.email}</a> or call {company.phone}.</p>
    </>
  )
  if (kind === "terms") return (
    <>
      <p>These terms apply when you ask EGO LTD to quote for or carry out maintenance work. By accepting a quote you agree to them.</p>
      <h2>Quotes and prices</h2>
      <p>We give a fixed price or a clear estimate in writing before we start. A fixed price is what you pay for the work described. An estimate is our honest best assessment; if the job turns out to be different once we open things up, we tell you and agree any change with you before carrying on. We never add costs without your say-so.</p>
      <h2>Carrying out the work</h2>
      <p>We attend in the agreed window and do the work to a good standard. Some work — gas, notifiable electrical, and certain specialist trades — must by law be done by a registered professional; where a job needs that we arrange or recommend the right person rather than doing it ourselves. We leave the area tidy.</p>
      <h2>Payment</h2>
      <p>We invoice on completion unless agreed otherwise. Invoices are itemised and due within the period stated on them. For larger jobs we may ask for a deposit or staged payments, agreed in writing up front.</p>
      <h2>If something is not right</h2>
      <p>If you are not happy with the work, tell us. We will come back and put right anything that falls short of the standard we agreed, at no extra cost. This does not affect your statutory rights as a consumer.</p>
      <h2>Liability</h2>
      <p>We carry public liability insurance covering the work we do at your property. Our liability is limited to the value of the work and what our insurance covers. We are not liable for pre-existing faults we were not asked to address.</p>
      <h2>Contact</h2>
      <p>Questions about these terms? Email <a href={`mailto:${company.email}`}>{company.email}</a> or call {company.phone}.</p>
    </>
  )
  return (
    <>
      <p>This website keeps cookies and tracking to a minimum. We do not use advertising cookies and we do not sell your data.</p>
      <h2>Essential</h2>
      <p>A small number of cookies are needed for the site to work — for example to remember your light or dark theme choice. These cannot be turned off without breaking the site.</p>
      <h2>Analytics</h2>
      <p>We may use privacy-respecting analytics to understand which pages are useful, in aggregate. This does not identify you personally.</p>
      <h2>Controlling cookies</h2>
      <p>You can delete or block cookies in your browser settings at any time. The essential ones will simply be set again on your next visit so the site keeps working.</p>
      <h2>Contact</h2>
      <p>Questions about cookies? Email <a href={`mailto:${company.email}`}>{company.email}</a>.</p>
    </>
  )
}

export default function Legal({ kind }: { kind: Kind }) {
  const company = useCompany()
  const m = meta[kind]
  return (
    <>
      <Seo title={m.seoTitle} description={m.seoDesc} path={m.path} noindex={kind === "cookies"} />
      <PageHero eyebrow={m.eyebrow} title={m.title} intro={m.intro} />
      <Section>
        <div className="prose-legal mx-auto max-w-2xl space-y-5 text-base leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a:hover]:text-accent [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground">
          <Body kind={kind} company={company} />
          <p className="pt-6 text-sm text-muted-foreground/70">{company.name} · {company.address}</p>
        </div>
      </Section>
    </>
  )
}
