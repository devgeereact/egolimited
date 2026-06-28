import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHero, Section } from "@/site/components/Bits"
import Seo, { articleLd, breadcrumbLd } from "@/site/components/Seo"
import { usePublicArticle, useOtherArticles } from "@/site/blog"
import { articleSeo } from "@/site/content"
import NotFound from "./NotFound"

function formatDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) }

export default function ResourceArticle() {
  const { slug } = useParams()
  const { article, loading } = usePublicArticle(slug)
  const more = useOtherArticles(slug, 2)
  if (loading) return <div className="grid min-h-[50vh] place-items-center text-muted-foreground">Loading…</div>
  if (!article) return <NotFound />
  const seo = articleSeo[article.slug]
  const articlePath = `/resources/${article.slug}`
  const title = seo?.title ?? article.title
  const description = seo?.description ?? article.excerpt
  return (
    <>
      <Seo title={title} description={description} path={articlePath} jsonLd={[articleLd({ title: article.title, description, path: articlePath, datePublished: article.date }), breadcrumbLd([{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }, { name: article.title, path: articlePath }])]} />
      <PageHero eyebrow="Guide" title={article.title} intro={article.excerpt} image={article.image} />
      <Section>
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-5"><Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/resources"><ArrowLeft className="mr-1 h-4 w-4" />All resources</Link></Button><span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 text-accent" />{formatDate(article.date)}</span></div>
          <article className="mt-8 space-y-5 text-base leading-relaxed text-muted-foreground">{article.body.map((p, i) => (<p key={i} className={i === 0 ? "text-lg text-foreground" : undefined}>{p}</p>))}</article>
          <div className="mt-10 rounded-2xl border border-border bg-secondary/40 p-6"><h2 className="font-serif text-lg font-bold">Want this handled rather than read about?</h2><p className="mt-2 text-sm text-muted-foreground">This is exactly the kind of work a planned-maintenance visit covers. Tell us about your property and we will give you a clear price and a date.</p><Button asChild className="mt-4" size="sm"><Link to="/contact">Get a quote<ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
        </div>
      </Section>
      {more.length > 0 && (
        <Section muted>
          <h2 className="mb-6 font-serif text-2xl font-bold">More guides</h2>
          <div className="grid gap-6 md:grid-cols-2">{more.map((a) => (<Link key={a.slug} to={`/resources/${a.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"><img src={a.image} alt="" className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /><div className="flex flex-1 flex-col p-7"><div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{formatDate(a.date)}</div><h3 className="mt-3 font-serif text-lg font-bold group-hover:text-primary">{a.title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p><span className="mt-4 inline-flex items-center text-sm font-medium text-primary">Read article<ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></Link>))}</div>
        </Section>
      )}
    </>
  )
}
