'use client'

export function RegenerateCodeButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm border border-gray-700 rounded-lg transition-colors cursor-pointer"
        onClick={e => {
          if (!confirm('Regenerate invite code? The old link will stop working.')) e.preventDefault()
        }}
      >
        Regenerate code
      </button>
    </form>
  )
}

export function DeleteGuildButton({ action, guildName }: { action: () => Promise<void>, guildName: string }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="px-4 py-2 bg-red-950 hover:bg-red-900 text-red-400 text-sm border border-red-900 rounded-lg transition-colors cursor-pointer"
        onClick={e => {
          if (!confirm(`Permanently delete "${guildName}"? This cannot be undone.`)) e.preventDefault()
        }}
      >
        Delete
      </button>
    </form>
  )
}
