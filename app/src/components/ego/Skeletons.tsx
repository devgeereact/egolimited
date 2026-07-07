import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

/** Shimmer rows for a list/table while it loads — hints at content shape. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="divide-y p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40 max-w-[45%]" />
              <Skeleton className="h-3 w-24 max-w-[30%]" />
            </div>
            <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
            <Skeleton className="h-3.5 w-14" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Header + content cards while a detail page loads. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
