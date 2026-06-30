'use client'

import { useState } from 'react'

export function CopyInviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/apply/${inviteCode}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
      title="Copy invite link"
    >
      {copied ? '✓ Copied' : 'Copy link'}
    </button>
  )
}
