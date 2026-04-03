'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor, Palette } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Clean and bright interface' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes for extended use' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Match your OS preference' },
] as const

export const AppearanceCard = () => {
  const { theme, setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-sky-500" />
          Appearance
          <InfoTooltip text="Choose your preferred color theme. Dark mode is recommended for extended use and reduces eye strain. System mode automatically follows your OS light/dark setting." />
        </CardTitle>
        <CardDescription>
          Choose your preferred theme. The dashboard defaults to dark mode.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {THEMES.map(({ value, label, icon: Icon, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`flex items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                theme === value
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div
                className={`rounded-full p-2 ${
                  theme === value
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {theme === value && (
                <span className="ml-auto text-xs font-medium text-emerald-500">Active</span>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
