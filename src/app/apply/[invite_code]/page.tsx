import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ invite_code: string }>
}) {
  const { invite_code } = await params
  const supabase = await createClient()

  const { data: guild } = await supabase
    .from('guilds')
    .select('id, name, description')
    .eq('invite_code', invite_code)
    .maybeSingle()

  if (!guild) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-xl font-semibold mb-2">Guild not found</h1>
          <p className="text-gray-500 text-sm">This invite link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: existing } = await supabase
      .from('guild_members')
      .select('id')
      .eq('guild_id', guild.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) redirect('/dashboard')

    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, status')
      .eq('guild_id', guild.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingApp) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-3">
            <h1 className="text-white text-xl font-semibold">{guild.name}</h1>
            <p className="text-gray-400 text-sm">
              You already have a <span className="text-indigo-400">{existingApp.status}</span> application to this guild.
            </p>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Go to dashboard →
            </Link>
          </div>
        </div>
      )
    }
  }

  async function submitApplication(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect(`/apply/${invite_code}`)
    }

    const { data: guild } = await supabase
      .from('guilds')
      .select('id')
      .eq('invite_code', invite_code)
      .maybeSingle()

    if (!guild) redirect('/')

    await supabase.from('applications').insert({
      guild_id: guild.id,
      user_id:  user.id,
      message:  (formData.get('message') as string)?.trim() || null,
    })

    redirect('/apply/success')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">

        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">{guild.name}</h1>
          {guild.description && (
            <p className="text-gray-400 text-sm mt-2">{guild.description}</p>
          )}
          <p className="text-gray-500 text-sm mt-4">Fill out the form below to apply for membership.</p>
        </div>

        {!user ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-4">
            <p className="text-gray-300 text-sm">You need to sign in with Discord before applying.</p>
            <form action="/auth/discord" method="POST">
              <input type="hidden" name="next" value={`/apply/${invite_code}`} />
              <button
                type="submit"
                className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign in with Discord
              </button>
            </form>
          </div>
        ) : (
          <form action={submitApplication} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Your Discord username</label>
              <input
                type="text"
                disabled
                value={(user as any).user_metadata?.full_name ?? user.email ?? ''}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Message <span className="text-gray-600">(optional)</span>
              </label>
              <textarea
                name="message"
                rows={4}
                maxLength={500}
                placeholder="Tell the guild leaders a bit about yourself..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Submit application
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
