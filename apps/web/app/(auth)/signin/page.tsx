import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SignInForm } from '@/components/sign-in-form'
import { getCurrentActor, safeNextPath } from '@/lib/auth'

export const metadata: Metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>
}) {
  const params = await searchParams
  const next = safeNextPath(params.next)

  if (await getCurrentActor()) {
    redirect(next)
  }

  return <SignInForm next={next} email={params.email ?? ''} />
}
