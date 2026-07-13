/**
 * EGO LIMITED — the engineer's offline outbox.
 *
 * THE PROBLEM THIS SOLVES
 * ----------------------
 * An engineer is in a basement in Croydon, or a plant room, or a lift shaft. They finish the job,
 * take the photo, get the signature, tap Complete — and the request dies, because there is no
 * signal. Before this existed, the app showed them a red "Offline" banner and their work was
 * simply lost. An offline *indicator* is a description of failure, not a feature.
 *
 * Now every write the engineer makes is durable the instant they make it. It goes into IndexedDB
 * (survives the tab closing, the phone locking, the battery dying) and is replayed, in order, the
 * moment there is a network again. The engineer never has to think about it.
 *
 * WHY IndexedDB AND NOT localStorage
 * ----------------------------------
 * Job photos are base64 and run to megabytes. localStorage is ~5MB total, synchronous (it blocks
 * the UI thread), and throws when full. IndexedDB is async, effectively unbounded for our sizes,
 * and is the only sane place to put a queue that may hold several photos.
 *
 * WHY EVERY ITEM CARRIES AN op_id
 * -------------------------------
 * Replay is not an edge case. A van pulling out of a dead spot will retry mid-flight, and — worse
 * — a request that actually REACHED the server but whose response never came back is
 * indistinguishable from one that never arrived. Retrying that would add the note twice, the photo
 * twice. So each item is stamped with a client-generated op_id and the server claims it exactly
 * once (see op_claim() in api/index.php); a replay is acknowledged and ignored. Without this, the
 * outbox would quietly corrupt the very job records it exists to protect.
 */
import { api, ApiError } from "@/lib/api"

const DB_NAME = "ego-outbox"
const STORE = "queue"
const DB_VERSION = 1

export interface OutboxItem {
  id: string          // op_id — the idempotency key the server dedupes on
  path: string        // API path, e.g. "/jobs/status"
  body: Record<string, unknown>
  label: string       // human-readable, for the "3 changes waiting" UI
  jobId: number | null
  queuedAt: number
  tries: number
  lastError?: string
}

/* ---------------------------------------------------------------- IndexedDB */

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
  )
}

const putItem = (item: OutboxItem) => tx("readwrite", (s) => s.put(item))
const delItem = (id: string) => tx("readwrite", (s) => s.delete(id))
export const allItems = (): Promise<OutboxItem[]> =>
  tx<OutboxItem[]>("readonly", (s) => s.getAll() as IDBRequest<OutboxItem[]>)
    .then((xs) => xs.sort((a, b) => a.queuedAt - b.queuedAt)) // FIFO: replay in the order it happened

/* ---------------------------------------------------------------- subscribers */

type State = { pending: number; syncing: boolean; failed: number }
let state: State = { pending: 0, syncing: false, failed: 0 }
const listeners = new Set<(s: State) => void>()

export function subscribe(fn: (s: State) => void): () => void {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}
function emit(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l(state))
}
async function refreshCount() {
  const items = await allItems().catch(() => [])
  emit({ pending: items.length, failed: rejected.length })
}

/* ---------------------------------------------------------------- the queue */

const newOpId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Is this a "the network didn't happen" failure, as opposed to the server saying no? */
function isNetworkError(e: unknown): boolean {
  // ApiError means we reached the server and it answered — that is NOT a network failure, and
  // retrying it forever would be wrong (a 422 "invalid transition" will never become a 200).
  if (e instanceof ApiError) return false
  return true // fetch() rejects with a TypeError when it cannot reach the host at all
}

/**
 * Send a write, or durably queue it if the network isn't there.
 *
 * Online path is unchanged: the request goes straight out and the caller sees the real result, so
 * a genuine server rejection (a 422 from the job state machine, say) still surfaces immediately
 * instead of being swallowed into a queue that can never succeed.
 *
 * Returns `queued: true` if it went to the outbox instead.
 */
export async function sendOrQueue(
  path: string,
  body: Record<string, unknown>,
  opts: { label: string; jobId?: number | null }
): Promise<{ queued: boolean }> {
  const item: OutboxItem = {
    id: newOpId(),
    path,
    body,
    label: opts.label,
    jobId: opts.jobId ?? null,
    queuedAt: Date.now(),
    tries: 0,
  }

  if (navigator.onLine) {
    try {
      await api(path, { method: "POST", body: { ...body, op_id: item.id } })
      return { queued: false }
    } catch (e) {
      // The server answered and said no → that is the caller's problem, not the outbox's.
      if (!isNetworkError(e)) throw e
      // Couldn't reach the server (dead spot, captive portal, flaky 4G) → fall through and queue.
    }
  }

  await putItem(item)
  await refreshCount()
  void flush() // harmless if still offline; the catch below just leaves it queued
  return { queued: true }
}

let flushing = false

/** Replay the queue, oldest first, stopping at the first network failure. */
export async function flush(): Promise<void> {
  if (flushing || !navigator.onLine) return
  flushing = true
  emit({ syncing: true })
  try {
    for (const item of await allItems()) {
      try {
        await api(item.path, { method: "POST", body: { ...item.body, op_id: item.id } })
        await delItem(item.id) // server has it (or recognised the replay) — done
      } catch (e) {
        // Still no network: keep the queue EXACTLY as it is and stop. Order matters — replaying
        // "completed" before "on site" would be rejected by the job state machine.
        if (isNetworkError(e)) break

        // The server REJECTED it (a 4xx). Retrying forever would be a lie: a 422 "invalid
        // transition" will never become a 200. The commonest real case is that the office moved
        // the job on while the engineer was underground, so their queued change no longer applies.
        // Take it out of the queue (it can never succeed) and record it as failed so the UI can
        // TELL them, instead of the change evaporating in silence.
        await delItem(item.id)
        rejected.push({ ...item, tries: item.tries + 1, lastError: e instanceof Error ? e.message : "Rejected" })
        console.error(`[ego outbox] "${item.label}" was rejected by the server:`, e)
      }
      await refreshCount()
    }
  } finally {
    flushing = false
    emit({ syncing: false })
    await refreshCount()
  }
}

/** Changes the server refused. Kept so the engineer is told, rather than losing work silently. */
const rejected: OutboxItem[] = []
export const rejectedItems = () => [...rejected]
export const clearRejected = () => { rejected.length = 0; emit({ failed: 0 }) }

/** Wire up automatic replay. Called once, from the engineer layout. */
export function startOutbox(): () => void {
  void refreshCount()
  void flush()
  const onOnline = () => void flush()
  window.addEventListener("online", onOnline)
  // Belt and braces: `online` doesn't fire for every real-world reconnection (captive portals,
  // a 4G handover), so also retry whenever the engineer brings the app back to the foreground.
  const onVisible = () => { if (document.visibilityState === "visible") void flush() }
  document.addEventListener("visibilitychange", onVisible)
  return () => {
    window.removeEventListener("online", onOnline)
    document.removeEventListener("visibilitychange", onVisible)
  }
}
