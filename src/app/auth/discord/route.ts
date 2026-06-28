import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// POST — used by the existing login button on the main page
export async function POST() {
  return initiateOAuth(null)
}

// GET — used by /apply/[invite_code] when user isn't logged in
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const next = searchParams.get('next')
  return initiateOAuth(next)
}

async function initiateOAuth(next: string | null) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const callbackUrl = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: callbackUrl,
      scopes: 'identify email',
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/?error=oauth_failed`, { status: 301 })
  }

  return NextResponse.redirect(data.url, { status: 301 })
}