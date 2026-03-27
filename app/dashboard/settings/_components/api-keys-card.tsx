'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Key, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { saveApiKey, deleteApiKey, testApiKey } from '../_actions'

const SERVICES = [
  { id: 'twelve_data', label: 'Twelve Data', description: 'Stock & ETF market data' },
  { id: 'openai', label: 'OpenAI', description: 'AI-powered insights' },
  { id: 'fred', label: 'FRED', description: 'Federal Reserve economic data' },
  { id: 'coingecko', label: 'CoinGecko', description: 'Cryptocurrency data (optional)' },
] as const

type ApiKeyStatus = {
  hasKey: boolean
  isValid: boolean | null
  lastVerified: string | null
}

type ApiKeysCardProps = {
  keyStatuses: Record<string, ApiKeyStatus>
}

export const ApiKeysCard = ({ keyStatuses }: ApiKeysCardProps) => {
  const [editingService, setEditingService] = useState<string | null>(null)
  const [keyValue, setKeyValue] = useState('')
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()
  const [testingService, setTestingService] = useState<string | null>(null)
  const [statuses, setStatuses] = useState(keyStatuses)

  const toggleVisibility = (service: string) => {
    setVisibleKeys((prev) => ({ ...prev, [service]: !prev[service] }))
  }

  const handleSave = (service: string) => {
    if (!keyValue.trim()) {
      toast.error('API key cannot be empty')
      return
    }

    const formData = new FormData()
    formData.set('service', service)
    formData.set('api_key', keyValue)

    startTransition(async () => {
      const result = await saveApiKey(formData)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`${SERVICES.find((s) => s.id === service)?.label} key saved`)
        setEditingService(null)
        setKeyValue('')
        setStatuses((prev) => ({
          ...prev,
          [service]: { hasKey: true, isValid: null, lastVerified: null },
        }))
      }
    })
  }

  const handleDelete = (service: string) => {
    const formData = new FormData()
    formData.set('service', service)

    startTransition(async () => {
      const result = await deleteApiKey(formData)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        toast.success('API key removed')
        setStatuses((prev) => ({
          ...prev,
          [service]: { hasKey: false, isValid: null, lastVerified: null },
        }))
      }
    })
  }

  const handleTest = (service: string) => {
    const formData = new FormData()
    formData.set('service', service)

    setTestingService(service)
    startTransition(async () => {
      const result = await testApiKey(formData)
      setTestingService(null)
      if (result && 'error' in result) {
        toast.error(result.error)
        setStatuses((prev) => {
          const current = prev[service] ?? { hasKey: false, isValid: null, lastVerified: null }
          return { ...prev, [service]: { ...current, isValid: false } }
        })
      } else {
        toast.success('Connection verified')
        setStatuses((prev) => {
          const current = prev[service] ?? { hasKey: false, isValid: null, lastVerified: null }
          return {
            ...prev,
            [service]: { ...current, isValid: true, lastVerified: new Date().toISOString() },
          }
        })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-500" />
          API Keys
        </CardTitle>
        <CardDescription>
          Optionally provide your own API keys. Keys are encrypted at rest. If not set, shared keys
          from server configuration are used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {SERVICES.map(({ id, label, description }) => {
          const status = statuses[id] ?? { hasKey: false, isValid: null, lastVerified: null }
          const isEditing = editingService === id

          return (
            <div key={id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {status.hasKey && !isEditing && (
                    <>
                      {status.isValid === true && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      {status.isValid === false && <XCircle className="h-4 w-4 text-rose-500" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVisibility(id)}
                        disabled={isPending}
                      >
                        {visibleKeys[id] ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor={`key-${id}`}>API Key</Label>
                  <Input
                    id={`key-${id}`}
                    type={visibleKeys[id] ? 'text' : 'password'}
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder={`Enter your ${label} API key`}
                    autoComplete="off"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(id)}
                      disabled={isPending || !keyValue.trim()}
                    >
                      {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingService(null)
                        setKeyValue('')
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {status.hasKey ? (
                    <>
                      <span className="text-xs font-mono text-muted-foreground">
                        {visibleKeys[id] ? '••••••••' : '••••••••••••'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(id)}
                        disabled={isPending || testingService === id}
                      >
                        {testingService === id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingService(id)
                          setKeyValue('')
                        }}
                        disabled={isPending}
                      >
                        Update
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(id)}
                        disabled={isPending}
                        className="text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingService(id)
                        setKeyValue('')
                      }}
                      disabled={isPending}
                    >
                      Add Key
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
