import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  await supabase.auth.signOut()

  return NextResponse.redirect(`${origin}/`, { status: 301 })
}