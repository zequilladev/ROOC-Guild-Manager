import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CopyInviteButton } from './CopyInviteButton'
import { RegenerateCodeButton, DeleteGuildButton } from './DangerActions'

async function updateGuild(guildId: string, formData: FormData) {
  'use server'
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()

  if (!name) return redirect('/dashboard/settings')

  await supabase.from('guilds').update({ name, description: description || null }).eq('id', guildId)
  redirect('/dashboard/settings')
}

async function regenerateInviteCode(guildId: string) {
  'use server'
  const supabase = await createClient()
  const newCode = Math.random().toString(36).substring(2, 10)
  await supabase.from('guilds').update({ invite_code: newCode }).eq('id', guildId)
  redirect('/dashboard/settings')
}

async function deleteGuild(guildId: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('guilds').delete().eq('id', guildId)
  redirect('/')
}

async function updateDiscordIntegration(guildId: string, userId: string, formData: FormData) {
  'use server'
  const supabase = await createClient()

  const discordServerId = (formData.get('discord_server_id') as string)?.trim()
  const announcementChannelId = (formData.get('announcement_channel_id') as string)?.trim()
  const applicationsChannelId = (formData.get('applications_channel_id') as string)?.trim()

  if (discordServerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('provider_token')
      .eq('id', userId)
      .single()

    if (!profile?.provider_token) {
      redirect('/dashboard/settings?error=no_token')
    }

    const res = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${profile.provider_token}` },
    })

    if (!res.ok) {
      redirect('/dashboard/settings?error=discord_api_failed')
    }

    const discordGuilds = await res.json()
    const targetGuild = discordGuilds.find((g: any) => g.id === discordServerId)

    if (!targetGuild) {
      redirect('/dashboard/settings?error=server_not_found')
    }

    const hasManageGuild = (BigInt(targetGuild.permissions) & BigInt(0x20)) !== BigInt(0)
    if (!hasManageGuild) {
      redirect('/dashboard/settings?error=no_permission')
    }
  }

  await supabase.from('guilds').update({
    discord_server_id:       discordServerId || null,
    announcement_channel_id: announcementChannelId || null,
    applications_channel_id: applicationsChannelId || null,
  }).eq('id', guildId)

  redirect('/dashboard/settings?success=discord_saved')
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guilds(id, name, description, invite_code, discord_server_id, announcement_channel_id, applications_channel_id)')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .single()

  if (!membership) redirect('/dashboard')

  const isLeader = membership.role === 'leader'
  if (!isLeader) redirect('/dashboard')

  const guild = membership.guilds as any

  const errorMessages: Record<string, string> = {
    no_token:           'Your Discord session expired. Please log out and log back in.',
    discord_api_failed: 'Could not reach Discord. Please try again.',
    server_not_found:   'You are not a member of that Discord server.',
    no_permission:      'You need the Manage Server permission on that Discord server.',
  }

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Guild Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your guild info and settings.</p>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Column 1 — Guild info */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Guild info</h2>
          <form action={updateGuild.bind(null, guild.id)} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Guild name</label>
              <input
                name="name"
                type="text"
                required
                maxLength={100}
                defaultValue={guild.name}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Description</label>
              <textarea
                name="description"
                rows={3}
                maxLength={500}
                defaultValue={guild.description ?? ''}
                placeholder="A short description of your guild..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors cursor-pointer"
            >
              Save changes
            </button>
          </form>
        </section>

        {/* Column 2 — Discord integration */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Discord integration</h2>
            <p className="text-xs text-gray-500 mt-1">
              Optional — lets the bot post announcements, create scheduled events, and alert on new applications.
            </p>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-2.5">
              <p className="text-red-400 text-sm">{errorMessages[error] ?? 'Something went wrong.'}</p>
            </div>
          )}

          {success === 'discord_saved' && (
            <div className="bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-2.5">
              <p className="text-emerald-400 text-sm">Discord integration saved.</p>
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400">
              First,{' '}
              <a
                href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=536879104&scope=bot`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                invite the bot to your Discord server
              </a>
              , then fill in the fields below.
            </p>
          </div>

          <form action={updateDiscordIntegration.bind(null, guild.id, user!.id)} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Discord Server ID</label>
              <input
                name="discord_server_id"
                type="text"
                defaultValue={guild.discord_server_id ?? ''}
                placeholder="e.g. 123456789012345678"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
              <p className="text-xs text-gray-600 mt-1">
                Right-click your server in Discord → Copy Server ID.
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Announcements channel ID</label>
              <input
                name="announcement_channel_id"
                type="text"
                defaultValue={guild.announcement_channel_id ?? ''}
                placeholder="e.g. 123456789012345678"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Applications channel ID</label>
              <input
                name="applications_channel_id"
                type="text"
                defaultValue={guild.applications_channel_id ?? ''}
                placeholder="e.g. 123456789012345678"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors cursor-pointer"
            >
              Save integration
            </button>
          </form>
        </section>

        {/* Column 3 — Invite link */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Invite link</h2>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Current invite code</p>
              <p className="font-mono text-gray-300">{guild.invite_code}</p>
            </div>
            <CopyInviteButton inviteCode={guild.invite_code} />
          </div>
          <RegenerateCodeButton action={regenerateInviteCode.bind(null, guild.id)} />
        </section>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700" />

      {/* Danger zone — full width */}
      <section className="bg-gray-900 border border-red-950 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Danger zone</h2>
        <div className="bg-red-950/30 border border-red-900 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-white text-sm font-medium">Delete guild</p>
            <p className="text-gray-500 text-xs mt-0.5">This will permanently delete the guild and all its data.</p>
          </div>
          <DeleteGuildButton action={deleteGuild.bind(null, guild.id)} guildName={guild.name} />
        </div>
      </section>
    </div>
  )
}
