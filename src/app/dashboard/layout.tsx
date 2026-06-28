import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const navLinks = [
  { href: '/dashboard',           label: 'Overview',      icon: '⬡' },
  { href: '/dashboard/members',   label: 'Members',       icon: '👥' },
  { href: '/dashboard/character', label: 'My Character',  icon: '⚔️' },
  { href: '/dashboard/events',    label: 'Events',        icon: '📅' },
  { href: '/dashboard/announcements', label: 'Announcements', icon: '📢' },
  { href: '/dashboard/applications',  label: 'Applications',  icon: '📋' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Fetch the user's profile and guild memberships
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('guild_members')
    .select('role, guilds(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  return (
    <div className="min-h-screen flex bg-gray-950 text-gray-100">

      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">

        {/* App name */}
        <div className="h-14 flex items-center px-5 border-b border-gray-800">
          <span className="font-semibold text-white">Guild Manager</span>
        </div>

        {/* Guild switcher (if member of multiple guilds) */}
        {memberships && memberships.length > 0 && (
          <div className="px-3 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-2">Guild</p>
            {memberships.map((m: any) => (
              <div
                key={m.guilds.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-800"
              >
                <span className="text-sm text-gray-200 truncate">{m.guilds.name}</span>
                <span className="text-xs text-gray-500 ml-2 capitalize">{m.role}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* User profile + logout */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-2 py-2">
            {profile?.discord_avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${profile.discord_id}/${profile.discord_avatar}.png`}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium">
                {profile?.discord_username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-white truncate">{profile?.discord_username}</p>
            </div>
          </div>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full mt-1 text-xs text-gray-500 hover:text-gray-300 py-1 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
