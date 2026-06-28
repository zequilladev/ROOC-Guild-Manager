import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MemberRow } from './MemberRow'

async function promoteMember(memberId: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('guild_members').update({ role: 'officer' }).eq('id', memberId)
  redirect('/dashboard/members')
}

async function demoteMember(memberId: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('guild_members').update({ role: 'member' }).eq('id', memberId)
  redirect('/dashboard/members')
}

async function kickMember(memberId: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('guild_members').update({ is_active: false }).eq('id', memberId)
  redirect('/dashboard/members')
}

async function removePlaceholder(memberId: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('guild_members').delete().eq('id', memberId)
  redirect('/dashboard/members')
}

async function addPlaceholder(guildId: string, formData: FormData) {
  'use server'
  const supabase = await createClient()
  const name = (formData.get('placeholder_name') as string)?.trim()
  if (!name) return redirect('/dashboard/members')

  await supabase.from('guild_members').insert({
    guild_id:         guildId,
    user_id:          null,
    role:             'member',
    is_placeholder:   true,
    placeholder_name: name,
  })
  redirect('/dashboard/members')
}

async function linkPlaceholder(placeholderId: string, realMemberId: string) {
  'use server'
  const supabase = await createClient()

  const { data: placeholder } = await supabase
    .from('guild_members')
    .select('joined_at, role')
    .eq('id', placeholderId)
    .single()

  if (placeholder) {
    await supabase.from('guild_members').update({
      joined_at: placeholder.joined_at,
      role:      placeholder.role,
    }).eq('id', realMemberId)
  }

  await supabase.from('guild_members').delete().eq('id', placeholderId)
  redirect('/dashboard/members')
}

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role, guild_id, guilds(name)')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return (
      <div className="p-8 text-gray-400">You need to be in a guild to view members.</div>
    )
  }

  const { data: realMembersData } = await supabase
    .from('guild_members')
    .select(`
      id,
      role,
      is_active,
      joined_at,
      is_placeholder,
      placeholder_name,
      profiles!guild_members_user_id_fkey (
        id,
        discord_username,
        discord_avatar,
        discord_id
      )
    `)
    .eq('guild_id', membership.guild_id)
    .eq('is_active', true)
    .eq('is_placeholder', false)

  const { data: placeholdersData } = await supabase
    .from('guild_members')
    .select('id, role, is_active, joined_at, is_placeholder, placeholder_name')
    .eq('guild_id', membership.guild_id)
    .eq('is_active', true)
    .eq('is_placeholder', true)

  const members = [...(realMembersData ?? []), ...(placeholdersData ?? [])]

  const { data: characters } = await supabase
    .from('characters')
    .select('user_id, character_name, class, level, server')
    .eq('guild_id', membership.guild_id)

  const isLeader = membership.role === 'leader'

  const roleOrder = { leader: 0, officer: 1, member: 2 }
  const sorted = [...members].sort(
    (a, b) => (roleOrder[a.role as keyof typeof roleOrder] ?? 3) - (roleOrder[b.role as keyof typeof roleOrder] ?? 3)
  )

  const realMembers = sorted.filter((m: any) => !m.is_placeholder && m.profiles)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Members</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sorted.length} active members</p>
        </div>
        {isLeader && (
          <form action={addPlaceholder.bind(null, membership.guild_id)} className="flex gap-2">
            <input
              name="placeholder_name"
              type="text"
              required
              placeholder="Character name..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm border border-gray-700 rounded-lg transition-colors"
            >
              + Add placeholder
            </button>
          </form>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Member</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Role</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Character</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Class / Level</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Server</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Joined</th>
              {isLeader && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((m: any) => {
              const char = characters?.find(c => c.user_id === (m.profiles as any)?.id)
              return (
                <MemberRow
                  key={m.id}
                  m={{ ...m, char }}
                  isLeader={isLeader}
                  currentUserId={user!.id}
                  realMembers={realMembers}
                  promoteAction={promoteMember.bind(null, m.id)}
                  demoteAction={demoteMember.bind(null, m.id)}
                  kickAction={kickMember.bind(null, m.id)}
                  linkPlaceholderAction={linkPlaceholder.bind(null, m.id)}
                  removePlaceholderAction={removePlaceholder.bind(null, m.id)}
                />
              )
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <p className="text-center text-gray-600 py-12">No members found.</p>
        )}
      </div>
    </div>
  )
}
