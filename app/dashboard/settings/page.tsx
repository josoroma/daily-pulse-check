import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getProfile } from '@/app/profile/_actions'
import { getAiPreferences, getNotificationPreferences } from './_actions'
import { ProfileForm } from '@/app/profile/_components/profile-form'
import { AiModelCard } from './_components/ai-model-card'
import { DiagnosticsPanel } from './_components/diagnostics-panel'
import { NotificationPreferencesCard } from './_components/notification-preferences-card'

export default async function SettingsPage() {
  const [profile, aiPrefs, notifPrefs] = await Promise.all([
    getProfile(),
    getAiPreferences(),
    getNotificationPreferences(),
  ])

  return (
    <div className="space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, AI preferences, notifications, and system diagnostics
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="ai">AI Model</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="max-w-md">
            <div className="rounded-lg border border-border bg-card p-6">
              <ProfileForm
                defaultValues={{
                  display_name: profile?.display_name ?? null,
                  base_currency: profile?.base_currency ?? 'USD',
                  country: profile?.country ?? '',
                  risk_tolerance: profile?.risk_tolerance ?? 'moderate',
                }}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="max-w-md">
            <AiModelCard
              defaultValues={{
                ai_provider: aiPrefs?.ai_provider ?? 'openai',
                ai_model: aiPrefs?.ai_model ?? 'gpt-4.1-mini',
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="max-w-md">
            <NotificationPreferencesCard
              defaultValues={{
                notification_email_enabled: notifPrefs?.notification_email_enabled ?? false,
                notification_telegram_enabled: notifPrefs?.notification_telegram_enabled ?? false,
                telegram_chat_id: notifPrefs?.telegram_chat_id ?? null,
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="diagnostics">
          <DiagnosticsPanel
            provider={aiPrefs?.ai_provider ?? 'openai'}
            model={aiPrefs?.ai_model ?? 'gpt-4.1-mini'}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
