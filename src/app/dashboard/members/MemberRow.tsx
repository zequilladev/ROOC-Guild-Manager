'use client'

import { useState } from 'react'

export function MemberRow({
  m,
  isLeader,
  currentUserId,
  realMembers,
  promoteAction,
  demoteAction,
  kickAction,
  linkPlaceholderAction,
  removePlaceholderAction,
}: {
  m: any
  isLeader: boolean
  currentUserId: string
  realMembers: any[]
  promoteAction: () => Promise<void>
  demoteAction: () => Promise<void>
  kickAction: () => Promise<void>
  linkPlaceholderAction: (realMemberId: string) => Promise<void>
  removePlaceholderAction: () => Promise<void>
}) {
  const [showLinkDropdown, setShowLinkDropdown] = useState(false)

  const u = m.profiles
  const char = m.char
  const isPlaceholder = m.is_placeholder

  const avatarUrl = u?.discord_avatar ?? null

  const roleColors: Record<string, string> = {
    leader:  'text-amber-400 bg-amber-950 border-amber-800',
    officer: 'text-blue-400 bg-blue-950 border-blue-800',
    member:  'text-gray-400 bg-gray-800 border-gray-700',
  }

  const isSelf = u?.id === currentUserId
  const isTargetLeader = m.role === 'leader'

  if (isPlaceholder) {
    return (
      <tr className="hover:bg-gray-800/50 transition-colors opacity-75">
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-700 border border-dashed border-gray-600 flex items-center justify-center text-xs text-gray-500">
              ?
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{m.placeholder_name}</span>
              <span className="text-xs text-gray-600 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
                No Discord
              </span>
            </div>
          </div>
        </td>
        <td className="px-5 py-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${roleColors[m.role] ?? roleColors.member}`}>
            {m.role}
          </span>
        </td>
        <td className="px-5 py-3 text-gray-600">—</td>
        <td className="px-5 py-3 text-gray-600">—</td>
        <td className="px-5 py-3 text-gray-600">—</td>
        <td className="px-5 py-3 text-gray-500 text-xs">
          {new Date(m.joined_at).toLocaleDateString()}
        </td>

        {isLeader && (
          <td className="px-5 py-3">
            {showLinkDropdown ? (
              <form
                action={async (fd: FormData) => {
                  const id = fd.get('real_member_id') as string
                  if (id) await linkPlaceholderAction(id)
                }}
                className="flex gap-2 items-center"
              >
                <select
                  name="real_member_id"
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Select member…</option>
                  {realMembers.map((rm: any) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.profiles?.discord_username ?? rm.id}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-xs px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded transition-colors cursor-pointer"
                >
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkDropdown(false)}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkDropdown(true)}
                  className="text-xs px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-800 rounded transition-colors cursor-pointer"
                >
                  Link Discord
                </button>
                <form action={removePlaceholderAction}>
                  <button
                    type="submit"
                    className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-red-950 text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-900 rounded transition-colors cursor-pointer"
                    onClick={e => {
                      if (!confirm(`Remove "${m.placeholder_name}"?`)) e.preventDefault()
                    }}
                  >
                    Remove
                  </button>
                </form>
              </div>
            )}
          </td>
        )}
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-800/50 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs text-white font-medium">
              {u?.discord_username?.[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-gray-200">{u?.discord_username}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${roleColors[m.role] ?? roleColors.member}`}>
          {m.role}
        </span>
      </td>
      <td className="px-5 py-3 text-gray-300">{char?.character_name ?? <span className="text-gray-600">—</span>}</td>
      <td className="px-5 py-3 text-gray-400">
        {char ? `${char.class} · Lv.${char.level}` : <span className="text-gray-600">—</span>}
      </td>
      <td className="px-5 py-3 text-gray-400">{char?.server ?? <span className="text-gray-600">—</span>}</td>
      <td className="px-5 py-3 text-gray-500 text-xs">
        {new Date(m.joined_at).toLocaleDateString()}
      </td>

      {isLeader && (
        <td className="px-5 py-3">
          {!isSelf && !isTargetLeader && (
            <div className="flex gap-2">
              {m.role === 'member' ? (
                <form action={promoteAction}>
                  <button
                    type="submit"
                    className="text-xs px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-400 border border-blue-800 rounded transition-colors cursor-pointer"
                  >
                    Promote
                  </button>
                </form>
              ) : (
                <form action={demoteAction}>
                  <button
                    type="submit"
                    className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700 rounded transition-colors cursor-pointer"
                  >
                    Demote
                  </button>
                </form>
              )}
              <form action={kickAction}>
                <button
                  type="submit"
                  className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-red-950 text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-900 rounded transition-colors cursor-pointer"
                  onClick={e => {
                    if (!confirm(`Kick ${u?.discord_username} from the guild?`)) e.preventDefault()
                  }}
                >
                  Kick
                </button>
              </form>
            </div>
          )}
        </td>
      )}
    </tr>
  )
}
