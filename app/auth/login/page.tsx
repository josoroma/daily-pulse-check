import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from './_components/login-form'
import { OAuthButtons } from './_components/oauth-buttons'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Sign in to your finance dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MessageBanner searchParams={searchParams} />
          <OAuthButtons />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

async function MessageBanner({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const params = await searchParams
  if (params.message) {
    return (
      <div className="rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
        {params.message}
      </div>
    )
  }
  if (params.error) {
    return (
      <div className="rounded-md bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
        Authentication failed. Please try again.
      </div>
    )
  }
  return null
}
