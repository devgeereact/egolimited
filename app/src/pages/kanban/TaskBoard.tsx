import { useEffect, useMemo, useState } from "react"
import {
  DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core"
import { KanbanSquare, Plus, Trash2, Loader2, Pencil, GripVertical } from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { AiButton } from "@/components/ego/AiButton"

interface Task { id: number; title: string; description: string | null; status: string; accent: string | null; sort: number; assignee_id: number | null; assignee_name: string | null }
interface Staff { id: number; name: string; role: string }

const COLUMNS = [
  { id: "backlog", label: "Backlog", dot: "bg-muted-foreground/50" },
  { id: "todo", label: "To do", dot: "bg-blue-500" },
  { id: "progress", label: "In progress", dot: "bg-amber-500" },
  { id: "done", label: "Done", dot: "bg-emerald-500" },
]
// Fold legacy statuses into the clean 4-column set so no card is orphaned.
const ALIAS: Record<string, string> = { doing: "progress", in_progress: "progress", "in process": "progress", complete: "done" }

// Per-assignee colour for at-a-glance identification (fixed, theme-independent).
const COLORS = ["#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#db2777", "#ca8a04", "#dc2626"]
const colorFor = (id: number | null | undefined) => (id == null ? "#94a3b8" : COLORS[id % COLORS.length])
const initials = (s: string) => s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

const UNASSIGNED = "__none__"

function TaskCard({ t, onEdit, onDelete }: { t: Task; onEdit: (t: Task) => void; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t.id })
  const color = colorFor(t.assignee_id)
  return (
    <div ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn("group relative overflow-hidden rounded-lg border bg-card p-3 shadow-sm", isDragging && "opacity-50")}>
      {/* Left accent = assignee colour */}
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
      <div className="flex items-start gap-1.5 pl-2.5">
        <button {...attributes} {...listeners} className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
        <button onClick={() => onEdit(t)} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium">{t.title}</p>
          {t.description && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{t.description}</p>}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: color }}>
              {t.assignee_name ? initials(t.assignee_name) : "?"}
            </span>
            <span className="text-xs text-muted-foreground">{t.assignee_name ?? "Unassigned"}</span>
          </div>
        </button>
      </div>
      <div className="absolute right-1.5 top-1.5 hidden gap-0.5 group-hover:flex">
        <button onClick={() => onEdit(t)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-3.5" /></button>
        <button onClick={() => onDelete(t.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-3.5" /></button>
      </div>
    </div>
  )
}

function Column({ col, tasks, onAdd, onEdit, onDelete }: { col: typeof COLUMNS[number]; tasks: Task[]; onAdd: (status: string, title: string) => void; onEdit: (t: Task) => void; onDelete: (id: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span className={cn("size-2 rounded-full", col.dot)} /> {col.label}
          <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{tasks.length}</span>
        </h3>
        <button onClick={() => setAdding((a) => !a)} className="text-muted-foreground hover:text-foreground"><Plus className="size-4" /></button>
      </div>
      <div ref={setNodeRef} className={cn("flex min-h-[120px] flex-1 flex-col gap-2 rounded-lg p-2 transition-colors", isOver ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/30")}>
        {tasks.map((t) => <TaskCard key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} />)}
        {adding ? (
          <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onAdd(col.id, title.trim()); setTitle(""); setAdding(false) } }}>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => !title.trim() && setAdding(false)} placeholder="Card title…" className="h-8 bg-card" />
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground">
            <Plus className="size-3.5" /> Add card
          </button>
        )}
      </div>
    </div>
  )
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Task | null>(null)
  const [eTitle, setETitle] = useState("")
  const [eDesc, setEDesc] = useState("")
  const [eAssignee, setEAssignee] = useState<string>(UNASSIGNED)
  const [saving, setSaving] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function load() { return api<{ tasks: Task[]; staff: Staff[] }>("/tasks").then((r) => { setTasks(r.tasks); setStaff(r.staff) }) }
  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const byCol = useMemo(() => {
    const m: Record<string, Task[]> = {}
    for (const c of COLUMNS) m[c.id] = []
    // Any task whose status isn't one of the columns falls back to Backlog, so a
    // card can never silently vanish from the board (and stays draggable/deletable).
    for (const t of tasks) { const s = ALIAS[t.status] ?? t.status; (m[s] ?? m.backlog).push(t) }
    return m
  }, [tasks])

  function openEdit(t: Task) { setEdit(t); setETitle(t.title); setEDesc(t.description ?? ""); setEAssignee(t.assignee_id ? String(t.assignee_id) : UNASSIGNED) }

  async function saveEdit() {
    if (!edit || !eTitle.trim()) return
    setSaving(true)
    const assignee_id = eAssignee === UNASSIGNED ? null : Number(eAssignee)
    const assignee_name = staff.find((s) => s.id === assignee_id)?.name ?? null
    try {
      await api("/tasks/update", { method: "POST", body: { id: edit.id, title: eTitle.trim(), description: eDesc.trim(), assignee_id: assignee_id ?? "" } })
      setTasks((p) => p.map((t) => (t.id === edit.id ? { ...t, title: eTitle.trim(), description: eDesc.trim() || null, assignee_id, assignee_name } : t)))
      setEdit(null)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
    finally { setSaving(false) }
  }

  async function onDragEnd(e: DragEndEvent) {
    const id = Number(e.active.id)
    const status = e.over?.id ? String(e.over.id) : null
    if (!status) return
    const t = tasks.find((x) => x.id === id)
    if (!t || t.status === status) return
    const sort = (byCol[status]?.length ?? 0)
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status, sort } : x))) // optimistic
    try { await api("/tasks/move", { method: "POST", body: { id, status, sort } }) }
    catch { toast.error("Couldn't move"); load() }
  }
  async function add(status: string, title: string) {
    try { await api("/tasks", { method: "POST", body: { title, status } }); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed") }
  }
  async function del(id: number) {
    setTasks((p) => p.filter((t) => t.id !== id))
    await api("/tasks/delete", { method: "POST", body: { id } })
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><KanbanSquare className="size-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Task Board</h1>
            <p className="mt-1 text-sm text-muted-foreground">Assign work to each other. Colour = who owns the card. {tasks.length} tasks.</p>
          </div>
        </div>
        {/* People legend */}
        {staff.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {staff.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
                <span className="size-2.5 rounded-full" style={{ background: colorFor(s.id) }} /> {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          {/* Fills the width across breakpoints — no horizontal scroll. Columns wrap
              to fewer per row on smaller screens; all five sit side by side on xl. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((c) => <Column key={c.id} col={c} tasks={byCol[c.id] ?? []} onAdd={add} onEdit={openEdit} onDelete={del} />)}
          </div>
        </DndContext>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader className="flex-row items-center justify-between space-y-0 pr-6">
            <DialogTitle>Edit card</DialogTitle>
            <AiButton
              endpoint="/tasks/draft" title="Draft a clear task"
              placeholder="e.g. chase the parts order for 14 Aldworth Rd before Friday"
              onResult={(d: { title?: string; description?: string }) => { if (d.title) setETitle(d.title); if (d.description) setEDesc(d.description) }}
            />
          </DialogHeader>
          <div className="space-y-3">
            <Input value={eTitle} onChange={(e) => setETitle(e.target.value)} placeholder="Title" />
            <Textarea rows={4} value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Description (optional)…" />
            <Select value={eAssignee} onValueChange={setEAssignee}>
              <SelectTrigger><SelectValue placeholder="Assign to…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: colorFor(s.id) }} /> {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving || !eTitle.trim()}>{saving ? <Loader2 className="size-4 animate-spin" /> : null} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
