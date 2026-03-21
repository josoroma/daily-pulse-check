import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/app/profile/_actions'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AuthProvider } from './_components/auth-provider'
import { SidebarNav } from './_components/sidebar-nav'
import { OnboardingModal } from '@/app/profile/_components/onboarding-modal'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = await getProfile()

  const needsOnboarding = profile && !profile.base_currency

  return (
    <AuthProvider initialUser={user ?? null} initialProfile={profile}>
      <SidebarProvider>
        <SidebarNav />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">Finance Dashboard</span>
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      {needsOnboarding && (
        <OnboardingModal
          defaultValues={{
            display_name: profile.display_name,
            base_currency: profile.base_currency ?? 'USD',
            country: profile.country ?? '',
            risk_tolerance: profile.risk_tolerance ?? 'moderate',
          }}
        />
      )}
    </AuthProvider>
  )
}
