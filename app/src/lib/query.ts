/**
 * EGO LIMITED — server-state layer.
 *
 * WHY: every page used to fetch with its own `useEffect` + `useState(loading)` +
 * `useState(data)` triple (≈50 pages, 88 call sites). That pattern has no cache, so every
 * back-navigation refetched from scratch; no shared invalidation, so after an edit the only
 * reliable way to see fresh data was a full page reload; and most call sites had no `.catch`,
 * so a failed request was an unhandled rejection with a spinner stuck on screen forever.
 *
 * This wraps the existing lib/api.ts fetcher in TanStack Query. The API client is unchanged —
 * it still owns auth headers and the 401 bounce — we are only adding caching, dedupe,
 * background refetch and one shared invalidation path on top.
 *
 * CONVENTION: the query key IS the API path, SPLIT at the "?" into [pathname, querystring].
 *   useApi("/jobs")               -> key ["/jobs"]
 *   useApi("/jobs?status=open")   -> key ["/jobs", "status=open"]
 *   invalidate("/jobs")           -> refetches BOTH, because TanStack matches key PREFIXES.
 *
 * The split is load-bearing, not cosmetic. TanStack compares query keys element by element, so
 * a flat key of ["/jobs?status=open"] would NOT be matched by the prefix ["/jobs"] — the two
 * strings simply differ. Keying the whole path as one string meant that saving a customer would
 * silently fail to refresh a filtered customer list, which is precisely the stale-data bug this
 * layer exists to kill. Splitting the querystring into its own key segment makes "invalidate the
 * collection" mean what it says, for every filtered/paged/searched variant of it.
 */
import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"

import { api, ApiError } from "@/lib/api"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Field-service data (jobs, schedule) changes while you're looking at it, but not
      // second-to-second. 30s keeps navigation instant without showing stale money.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // The office keeps this app open in a tab all day; refetch when they come back to it.
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // Never retry a request the server has definitively refused. Retrying a 401/403/404
        // just burns the user's time before showing the same error — and lib/api.ts has
        // already bounced them to login on a 401 by this point.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false }, // never silently re-send a write (double invoices, double emails)
  },
})

/**
 * Query key for an API path: ["/jobs"] or ["/jobs", "status=open"]. Splitting the querystring
 * into its own segment is what lets invalidate("/jobs") match every filtered variant — see the
 * file header. Exported so tests can assert the contract directly.
 */
export function queryKeyFor(path: string): readonly unknown[] {
  const [base, search] = path.split("?")
  return search ? [base, search] : [base]
}

/** GET a path. invalidate(path) refetches it — including any filtered/paged variants. */
export function useApi<T>(
  path: string | null,
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">
) {
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey: path === null ? ["__disabled__"] : queryKeyFor(path),
    queryFn: () => api<T>(path as string),
    enabled: path !== null, // pass null to defer (e.g. waiting on an :id from the URL)
    ...options,
  })
}

/**
 * A write. `invalidates` lists the path prefixes whose cached data this write makes stale —
 * e.g. changing a job status invalidates ["/jobs", "/dashboard", "/activity"]. This is the
 * bit the old useEffect pattern had no answer for: it is why editing a record used to leave
 * the list behind it showing the old value until a hard refresh.
 */
export function useApiMutation<TArgs, TResult = unknown>(
  fn: (args: TArgs) => Promise<TResult>,
  invalidates: string[] = []
) {
  const qc = useQueryClient()
  return useMutation<TResult, Error, TArgs>({
    mutationFn: fn,
    onSuccess: () => {
      for (const path of invalidates) {
        void qc.invalidateQueries({ queryKey: queryKeyFor(path) })
      }
    },
  })
}

/**
 * Imperative invalidation, for flows that don't go through useApiMutation.
 * Pass the COLLECTION path ("/customers"), not a filtered one — prefix matching then refreshes
 * every cached variant of it ("/customers?q=bob", "/customers?page=2", …).
 */
export function invalidate(...paths: string[]) {
  for (const path of paths) void queryClient.invalidateQueries({ queryKey: queryKeyFor(path) })
}
