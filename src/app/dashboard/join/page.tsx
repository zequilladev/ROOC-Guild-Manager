import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function joinGuild(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const code = (formData.get('code') as string).trim()

  // Find guild by invite code
  const { data: guild } = await supabase
    .from('guilds')
    .select('id, name')
    .eq('invite_code', code)
    .maybeSingle()

  if (!guild) {
    redirect('/dashboard/join?error=invalid')
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('guild_members')
    .select('id')
    .eq('guild_id', guild.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect('/dashboard/join?error=already_member')
  }

  // Add as member
  await supabase
    .from('guild_members')
    .insert({ guild_id: guild.id, user_id: user.id, role: 'member' })

  redirect('/dashboard')
}

const errors: Record<string, string> = {
  invalid: 'Invalid invite code. Double-check and try again.',
  already_member: 'You are already a member of this guild.',
}

export default async function JoinGuildPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect away if already in a guild
  const { data: existing } = await supabase
    .from('guild_members')
    .select('id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) redirect('/dashboard')

  return (
    <div className="p-8">
      <div className="max-w-md">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
        >
          ← Back
        </Link>

        <h1 className="text-2xl font-semibold text-white mb-1">Join a guild</h1>
        <p className="text-gray-400 text-sm mb-8">
          Enter the invite code your guild leader shared with you.
        </p>

        {error && (
          <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-4 py-2 mb-4">
            {errors[error] ?? 'Something went wrong. Please try again.'}
          </p>
        )}

        <form action={joinGuild} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Invite code <span className="text-red-400">*</span>
            </label>
            <input
              name="code"
              type="text"
              required
              maxLength={20}
              placeholder="e.g. a1b2c3d4"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Join guild
          </button>
        </form>
      </div>
    </div>
  )
}
