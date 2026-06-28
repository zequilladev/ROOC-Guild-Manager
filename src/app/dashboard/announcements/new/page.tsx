import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function postAnnouncement(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guild_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || !['leader', 'officer'].includes(membership.role)) {
    redirect('/dashboard/announcements')
  }

  await supabase.from('announcements').insert({
    guild_id:   membership.guild_id,
    created_by: user.id,
    title:      (formData.get('title') as string).trim(),
    content:    (formData.get('content') as string).trim(),
    is_pinned:  formData.get('is_pinned') === 'on',
  })

  redirect('/dashboard/announcements')
}

export default async function NewAnnouncementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership || !['leader', 'officer'].includes(membership.role)) {
    redirect('/dashboard/announcements')
  }

  return (
    <div className="p-8">
      <div className="max-w-lg">
        <Link
          href="/dashboard/announcements"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
        >
          ← Back to announcements
        </Link>

        <h1 className="text-2xl font-semibold text-white mb-1">New announcement</h1>
        <p className="text-gray-400 text-sm mb-8">
          All guild members will see this on the Announcements page.
        </p>

        <form action={postAnnouncement} className="space-y-5">

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Raid schedule change"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Content <span className="text-red-400">*</span>
            </label>
            <textarea
              name="content"
              required
              rows={6}
              maxLength={2000}
              placeholder="Write your announcement here..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              name="is_pinned"
              type="checkbox"
              className="w-4 h-4 rounded accent-indigo-500"
            />
            <span className="text-sm text-gray-400">
              📌 Pin this announcement to the top
            </span>
          </label>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Post announcement
          </button>
        </form>
      </div>
    </div>
  )
}
