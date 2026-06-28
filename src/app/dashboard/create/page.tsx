import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function createGuild(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()

  if (!name) return

  // Create the guild
  const { data: guild, error } = await supabase
    .from('guilds')
    .insert({ name, description: description || null, owner_id: user.id })
    .select()
    .single()

  if (error || !guild) {
    redirect('/dashboard/create?error=failed')
  }

  // Add the creator as leader
  await supabase
    .from('guild_members')
    .insert({ guild_id: guild.id, user_id: user.id, role: 'leader' })

  redirect('/dashboard')
}

export default async function CreateGuildPage({
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

        <h1 className="text-2xl font-semibold text-white mb-1">Create a guild</h1>
        <p className="text-gray-400 text-sm mb-8">
          You&apos;ll be set as the guild leader. Share your invite code to bring in members.
        </p>

        {error && (
          <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-4 py-2 mb-4">
            Something went wrong. Please try again.
          </p>
        )}

        <form action={createGuild} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Guild name <span className="text-red-400">*</span>
            </label>
            <input
              name="name"
              type="text"
              required
              maxLength={50}
              placeholder="e.g. Eternal Knights"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Description <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={3}
              maxLength={300}
              placeholder="What's your guild about?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Create guild
          </button>
        </form>
      </div>
    </div>
  )
}
