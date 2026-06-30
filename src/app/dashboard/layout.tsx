import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from './TopBar'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Megaphone,
  ClipboardList,
  Settings,
} from 'lucide-react'

const navLinks = [
  { href: '/dashboard',               label: 'Overview',      icon: LayoutDashboard },
  { href: '/dashboard/members',       label: 'Members',       icon: Users },
  { href: '/dashboard/events',        label: 'Events',        icon: Calendar },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/dashboard/applications',  label: 'Applications',  icon: ClipboardList },
  { href: '/dashboard/settings',      label: 'Settings',      icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .from('guild_members')
    .select('role, guild_id, guilds(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const activeGuildId = (memberships?.[0] as any)?.guild_id
  const { data: character } = activeGuildId
    ? await supabase
        .from('characters')
        .select('character_name')
        .eq('user_id', user.id)
        .eq('guild_id', activeGuildId)
        .maybeSingle()
    : { data: null }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">

      {/* Top bar — fixed */}
      <TopBar
        avatarUrl={profile?.discord_avatar ?? null}
        discordUsername={profile?.discord_username ?? null}
        characterName={character?.character_name ?? null}
      />

      <div className="flex flex-1 overflow-hidden relative">

        {/* Sidebar — fixed, floats over content */}
        <aside className="absolute top-0 left-0 bottom-0 z-40 w-12 hover:w-52 flex flex-col bg-gray-900 border-r border-gray-800 shadow-2xl transition-all duration-200 overflow-hidden group">

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <Icon size={18} className="shrink-0" />
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {label}
                </span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content — only this scrolls */}
        <main className="flex-1 overflow-y-auto pl-12">
          {children}
        </main>
      </div>
    </div>
  )
}
