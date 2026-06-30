import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Megaphone, Plus, Loader2, Pin } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface AnnRow {
  id: number
  title: string
  audience: "all" | "engineers" | "office"
  pinned: number
  active: number
  created_at: string
  author: string | null
}

const AUDIENCE_LABEL: Record<AnnRow["audience"], string> = {
  all: "Everyone", engineers: "Engineers", office: "Office",
}

export default function AnnouncementsList() {
  const [rows, setRows] = useState<AnnRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ announcements: AnnRow[] }>("/announcements/manage")
      .then((r) => setRows(r.announcements))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Megaphone className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Announcements</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rows.length} posts</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ego/announcements/new"><Plus /> New announcement</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No announcements yet. <Link to="/ego/announcements/new" className="text-primary hover:underline">Post one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link to={`/ego/announcements/edit?id=${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                      {!!a.pinned && <Pin className="ml-2 inline size-3.5 text-primary" />}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{AUDIENCE_LABEL[a.audience]}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{a.created_at?.slice(0, 10)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={a.active ? "default" : "secondary"}>{a.active ? "Live" : "Hidden"}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
