import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SignUpForm } from '@/components/sign-up-form'
import { getCurrentActor, safeNextPath } from '@/lib/auth'

export const metadata: Metadata = { title: 'Create account' }
export const dynamic = 'force-dynamic'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string }>
}) {
  const params = await searchParams
  const next = safeNextPath(params.next)

  if (await getCurrentActor()) {
    redirect(next)
  }

  return <SignUpForm next={next} email={params.email ?? ''} />
}
