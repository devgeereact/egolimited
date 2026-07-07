import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface T { id: number; name: string; subject: string | null; body: string | null }

/** Preset picker grouped by category (the "Agents · 1 · Intro" prefix). */
export function TemplateSelect({
  templates, onPick, placeholder = "Pick a preset…",
}: { templates: T[]; onPick: (t: T) => void; placeholder?: string }) {
  const groups: Record<string, T[]> = {}
  for (const t of templates) {
    const cat = t.name.includes("·") ? t.name.split("·")[0].trim() : "Custom"
    ;(groups[cat] ??= []).push(t)
  }
  const cats = Object.keys(groups).sort((a, b) => (a === "Custom" ? 1 : b === "Custom" ? -1 : a.localeCompare(b)))
  return (
    <Select value="" onValueChange={(id) => { const t = templates.find((x) => String(x.id) === id); if (t) onPick(t) }}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72">
        {cats.map((cat) => (
          <SelectGroup key={cat}>
            <SelectLabel>{cat}</SelectLabel>
            {groups[cat].map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
