import { useApi } from "@/lib/query"
import { Card, CardContent } from "@/components/ui/card"

interface Wx {
  city: string; country: string
  temp: number | null; feels_like: number | null; pressure: number | null
  wind: number | null; rain?: number | null; desc: string; icon: string
  forecast: { date: string; min?: number | null; max?: number | null; temp?: number | null; icon: string }[]
}

const OWM = (icon: string) => `https://openweathermap.org/img/wn/${icon}@2x.png`

export default function WeatherPanel() {
  const { data: wx } = useApi<Wx>("/weather")
  if (!wx) return null

  const windKmph = wx.wind != null ? Math.round(wx.wind * 3.6) : null
  const dayTemp = (f: Wx["forecast"][number]) => f.max ?? f.temp ?? null

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-center text-sm font-semibold sm:text-base">{wx.city}{wx.country ? `, ${wx.country}` : ""}</p>

        {/* Current — condition · temperature · key metrics */}
        <div className="mt-3 grid grid-cols-3 items-center gap-2">
          <div className="flex flex-col items-center text-center">
            {wx.icon && <img src={OWM(wx.icon)} alt={wx.desc} className="size-16" />}
            <span className="text-sm font-semibold capitalize">{wx.desc}</span>
          </div>
          <div className="text-center">
            <span className="text-5xl font-semibold tracking-tight">{wx.temp != null ? Math.round(wx.temp) : "—"}°<span className="text-2xl text-muted-foreground">c</span></span>
          </div>
          <div className="space-y-0.5 text-right text-sm text-muted-foreground">
            {windKmph != null && <p>Wind: <span className="font-medium text-foreground">{windKmph} kmph</span></p>}
            <p>Precip: <span className="font-medium text-foreground">{Math.round((wx.rain ?? 0) * 10) / 10} mm</span></p>
            {wx.pressure != null && <p>Pressure: <span className="font-medium text-foreground">{wx.pressure} mb</span></p>}
          </div>
        </div>

        {/* 5-day forecast */}
        {wx.forecast?.length > 0 && (
          <div className="mt-4 grid grid-cols-5 gap-2 border-t pt-4 text-center">
            {wx.forecast.slice(0, 5).map((f) => (
              <div key={f.date} className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {new Date(`${f.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                {f.icon && <img src={OWM(f.icon)} alt="" className="size-9" />}
                <span className="text-sm font-medium">{dayTemp(f) != null ? `${dayTemp(f)}°` : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
