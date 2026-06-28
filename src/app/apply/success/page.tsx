import Link from 'next/link'

export default function ApplySuccessPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-white text-xl font-semibold">Application submitted!</h1>
        <p className="text-gray-400 text-sm">The guild leaders will review your application.</p>
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Go to dashboard →
        </Link>
      </div>
    </div>
  )
}
