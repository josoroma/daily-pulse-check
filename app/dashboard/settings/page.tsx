import { getProfile } from '@/app/profile/_actions'
import { ProfileForm } from '@/app/profile/_components/profile-form'

export default async function SettingsPage() {
  const profile = await getProfile()

  return (
    <div className="space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and preferences</p>
      </div>
      <div className="max-w-md rounded-lg border border-border bg-card p-6">
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
  )
}
