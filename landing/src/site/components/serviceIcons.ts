import { Hammer, Paintbrush, Droplets, Grid3x3, Trees, Drill, KeyRound, CalendarCheck, Wrench } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const serviceIcons: Record<string, LucideIcon> = {
  "carpentry-joinery": Hammer,
  "painting-decorating": Paintbrush,
  "minor-plumbing": Droplets,
  "walls-tiling": Grid3x3,
  "exterior-grounds": Trees,
  "mounting-fitting": Drill,
  "property-turnarounds": KeyRound,
  "planned-maintenance": CalendarCheck,
}
export const serviceIcon = (slug: string): LucideIcon => serviceIcons[slug] ?? Wrench
