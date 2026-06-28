import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { articles, type Article } from "@/site/content"
import { articleImageFor } from "@/site/images"

export interface BlogPost {
  id: number; title: string; slug: string; excerpt: string | null; body: string | null
  cover_image: string | null; author: string | null; tags: string | null
  seo_title?: string | null; seo_description?: string | null; status?: string
  published_at: string | null; created_at: string
}
export interface PublicArticle {
  slug: string; title: string; date: string; excerpt: string; image: string; body: string[]; author?: string
}

function postToArticle(p: BlogPost): PublicArticle {
  return {
    slug: p.slug, title: p.title, date: p.published_at || p.created_at, excerpt: p.excerpt || "",
    image: p.cover_image || articleImageFor(p.slug),
    body: (p.body || "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean),
    author: p.author || undefined,
  }
}
function staticToArticle(a: Article): PublicArticle {
  return { slug: a.slug, title: a.title, date: a.date, excerpt: a.excerpt, image: articleImageFor(a.slug), body: a.body }
}

export function usePublicArticles(): PublicArticle[] {
  const { data } = useQuery({
    queryKey: ["public-blog"],
    queryFn: () => api.get<BlogPost[]>("blog.php"),
    retry: false, staleTime: 1000 * 60 * 5, throwOnError: false,
  })
  if (Array.isArray(data) && data.length) return data.map(postToArticle)
  return articles.map(staticToArticle)
}
export function usePublicArticle(slug: string | undefined): { article: PublicArticle | null; loading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: ["public-blog", "post", slug],
    queryFn: () => api.get<BlogPost>(`blog.php?slug=${encodeURIComponent(slug!)}`),
    enabled: !!slug, retry: false, staleTime: 1000 * 60 * 5, throwOnError: false,
  })
  if (data && (data as BlogPost).slug) return { article: postToArticle(data as BlogPost), loading: false }
  const fallback = articles.find((a) => a.slug === slug)
  return { article: fallback ? staticToArticle(fallback) : null, loading: !!slug && isPending }
}
export function useOtherArticles(slug: string | undefined, limit = 2): PublicArticle[] {
  return usePublicArticles().filter((a) => a.slug !== slug).slice(0, limit)
}
