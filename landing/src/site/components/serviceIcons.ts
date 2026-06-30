import {
  Hammer,
  Paintbrush,
  Droplets,
  Grid3x3,
  Trees,
  Drill,
  KeyRound,
  CalendarCheck,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// One clean icon per service, keyed by slug. Shared by the home page and the
// services catalogue so the same trade always reads with the same symbol.
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

export const serviceIcon = (slug: string): LucideIcon =>
  serviceIcons[slug] ?? Wrench
