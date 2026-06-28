import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CloudSun, Search, Loader2, KeyRound } from "lucide-react"

import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface Day { date: string; temp: number | null; icon: string; desc: string }
interface Weather {
  city: string; country: string; temp: number | null; feels_like: number | null
  temp_min: number | null; temp_max: number | null; pressure: number | null
  sea_level: number | null; grnd_level: number | null; humidity: number | null
  dew_point: number | null; wind: number | null; desc: string; icon: string; forecast: Day[]
}

const ic = (i: string, big = false) => `https://openweathermap.org/img/wn/${i}${big ? "@2x" : ""}.png`
const dn = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })

function Row({ a, av, b, bv }: { a: string; av: string | number; b?: string; bv?: string | number }) {
  return (
    <div className="grid grid-cols-2 gap-x-8">
      <div className="flex items-center justify-between border-b py-2.5 text-sm">
        <span className="text-muted-foreground">{a}</span><span className="font-medium">{av}</span>
      </div>
      {b !== undefined && (
        <div className="flex items-center justify-between border-b py-2.5 text-sm">
          <span className="text-muted-foreground">{b}</span><span className="font-medium">{bv}</span>
        </div>
      )}
    </div>
  )
}

export default function WeatherPage() {
  const [city, setCity] = useState("")
  const [w, setW] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsKey, setNeedsKey] = useState(false)

  function fetchWeather(c?: string) {
    setLoading(true); setError(null); setNeedsKey(false)
    api<Weather>(`/weather${c ? `?city=${encodeURIComponent(c)}` : ""}`)
      .then(setW)
      .catch((e) => { if (e instanceof ApiError && e.status === 400) setNeedsKey(true); setError(e instanceof Error ? e.message : "Couldn't load weather") })
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchWeather() }, [])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><CloudSun className="size-5" /></div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Weather</h1>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); fetchWeather(city || undefined) }} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (e.g. Harare,ZW)" className="pl-9 sm:w-56" />
          </div>
          <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Check"}</Button>
        </form>
      </div>

      {needsKey ? (
        <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <KeyRound className="size-8 text-muted-foreground" />
          <p className="font-medium">OpenWeather key not set</p>
          <Button asChild variant="outline"><Link to="/ego/integrations">Open Integrations</Link></Button>
        </CardContent></Card>
      ) : loading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
      ) : error ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      ) : w ? (
        <Card>
          <CardContent className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{w.city}{w.country ? `, ${w.country}` : ""}</h2>
                <p className="text-muted-foreground">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="mt-1 flex items-center gap-1 capitalize text-muted-foreground">
                  {w.icon && <img src={ic(w.icon)} alt="" className="size-7" />} {w.desc}
                </p>
              </div>
              <span className="text-5xl font-light">{w.temp != null ? `${w.temp.toFixed(1)}°` : "—"}</span>
            </div>

            {/* Stats grid */}
            <div className="mt-6">
              <Row a="Temp" av={`${w.temp ?? "—"}`} b="Feels like" bv={`${w.feels_like ?? "—"}`} />
              <Row a="Temp min" av={`${w.temp_min ?? "—"}`} b="Temp max" bv={`${w.temp_max ?? "—"}`} />
              <Row a="Pressure" av={`${w.pressure ?? "—"}`} b="Sea level" bv={`${w.sea_level ?? "—"}`} />
              <Row a="Grnd level" av={`${w.grnd_level ?? "—"}`} b="Humidity" bv={`${w.humidity ?? "—"}`} />
              <Row a="Wind" av={`${w.wind ?? "—"} m/s`} b="Dew point" bv={`${w.dew_point ?? "—"}`} />
            </div>

            {/* Forecast */}
            {w.forecast.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <p className="mb-4 font-medium">Forecast</p>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                  {w.forecast.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-1 text-center">
                      <span className="text-xs text-muted-foreground">{dn(d.date)}</span>
                      {d.icon && <img src={ic(d.icon)} alt={d.desc} className="size-10" />}
                      <span className="text-sm font-medium">{d.temp != null ? `${d.temp.toFixed(1)}°` : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
