import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { ExportDataCard } from '../_components/export-data-card'
import { CsvImportCard } from '../_components/csv-import-card'
import { PasswordChangeCard } from '../_components/password-change-card'
import { DeleteAccountCard } from '../_components/delete-account-card'

export default async function DataManagementPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('id, name')
    .eq('user_id', user?.id ?? '')
    .order('created_at')

  return (
    <div className="space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data & Account</h1>
          <p className="text-muted-foreground">
            Export your data, import positions, and manage your account
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <ExportDataCard />
        <CsvImportCard portfolios={portfolios ?? []} />
        <PasswordChangeCard />
        <DeleteAccountCard userEmail={user?.email ?? ''} />
      </div>
    </div>
  )
}
