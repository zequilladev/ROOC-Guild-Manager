'use client'

import { useState } from 'react'

export function InviteCodeCard({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    const url = `${window.location.origin}/apply/${inviteCode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
    >
      <span className="text-xs text-gray-500">Invite code:</span>
      <span className="text-xs font-mono text-gray-300">
        {copied ? 'Copied!' : inviteCode}
      </span>
    </button>
  )
}
