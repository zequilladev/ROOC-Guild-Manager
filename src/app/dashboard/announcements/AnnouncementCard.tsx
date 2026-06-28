'use client'

export function AnnouncementCard({
  announcement: a,
  isLeaderOrOfficer,
  togglePin,
  deleteAnnouncement,
}: {
  announcement: any
  isLeaderOrOfficer: boolean
  togglePin: () => Promise<void>
  deleteAnnouncement: () => Promise<void>
}) {
  return (
    <div className={`bg-gray-900 border rounded-xl px-6 py-5 ${a.is_pinned ? 'border-indigo-800' : 'border-gray-800'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {a.is_pinned && (
              <span className="text-xs text-indigo-400 bg-indigo-950 border border-indigo-800 px-2 py-0.5 rounded font-medium">
                Pinned
              </span>
            )}
            <h3 className="text-white font-medium">{a.title}</h3>
          </div>
          <p className="text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">{a.content}</p>
          <p className="text-gray-600 text-xs mt-3">
            Posted by {(a.author as any)?.discord_username ?? 'Unknown'} ·{' '}
            {new Date(a.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {isLeaderOrOfficer && (
          <div className="flex gap-2 shrink-0">
            <form action={togglePin}>
              <button
                type="submit"
                title={a.is_pinned ? 'Unpin' : 'Pin'}
                className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors text-sm"
              >
                {a.is_pinned ? '📌' : '📍'}
              </button>
            </form>
            <form action={deleteAnnouncement}>
              <button
                type="submit"
                title="Delete"
                className="p-1.5 text-gray-500 hover:text-red-400 transition-colors text-sm"
                onClick={e => {
                  if (!confirm('Delete this announcement?')) e.preventDefault()
                }}
              >
                🗑️
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}