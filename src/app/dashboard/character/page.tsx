import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const CLASSES = [
  'Novice', 'Super Novice',
  'Swordsman', 'Knight', 'Lord Knight', 'Rune Knight',
  'Crusader', 'Paladin', 'Royal Guard',
  'Mage', 'Wizard', 'High Wizard', 'Warlock',
  'Sage', 'Professor', 'Sorcerer',
  'Archer', 'Hunter', 'Sniper', 'Ranger',
  'Bard', 'Clown', 'Minstrel',
  'Dancer', 'Gypsy', 'Wanderer',
  'Acolyte', 'Priest', 'High Priest', 'Archbishop',
  'Monk', 'Champion', 'Sura',
  'Merchant', 'Blacksmith', 'Whitesmith', 'Mechanic',
  'Alchemist', 'Creator', 'Genetic',
  'Thief', 'Assassin', 'Assassin Cross', 'Guillotine Cross',
  'Rogue', 'Stalker', 'Shadow Chaser',
  'Taekwon', 'Star Gladiator', 'Soul Linker',
  'Gunslinger', 'Rebellion',
  'Ninja', 'Kagerou', 'Oboro',
]

const SERVERS = ['Pioneer', 'Advanced', 'Classic', 'Other']

async function saveCharacter(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Get the user's guild
  const { data: membership } = await supabase
    .from('guild_members')
    .select('guild_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) redirect('/dashboard')

  const payload = {
    user_id: user.id,
    guild_id: membership.guild_id,
    character_name: (formData.get('character_name') as string).trim(),
    class: formData.get('class') as string,
    level: parseInt(formData.get('level') as string) || 1,
    server: formData.get('server') as string,
    notes: (formData.get('notes') as string).trim() || null,
    updated_at: new Date().toISOString(),
  }

  // Upsert — creates if new, updates if exists
  await supabase
    .from('characters')
    .upsert(payload, { onConflict: 'user_id, guild_id' })

  redirect('/dashboard/character?saved=true')
}

export default async function CharacterPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const { saved } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('guild_members')
    .select('guild_id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) redirect('/dashboard')

  // Load existing character if any
  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user!.id)
    .eq('guild_id', membership.guild_id)
    .maybeSingle()

  const isEdit = !!character

  return (
    <div className="p-8">
      <div className="max-w-lg">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
        >
          ← Back
        </Link>

        <h1 className="text-2xl font-semibold text-white mb-1">
          {isEdit ? 'Edit character' : 'Set up your character'}
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          This info shows up on the guild member roster.
        </p>

        {saved && (
          <p className="text-sm text-green-400 bg-green-950 border border-green-800 rounded-lg px-4 py-2 mb-6">
            ✓ Character saved successfully.
          </p>
        )}

        <form action={saveCharacter} className="space-y-5">

          {/* Character name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Character name <span className="text-red-400">*</span>
            </label>
            <input
              name="character_name"
              type="text"
              required
              maxLength={50}
              defaultValue={character?.character_name ?? ''}
              placeholder="Your in-game character name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Class <span className="text-red-400">*</span>
            </label>
            <select
              name="class"
              required
              defaultValue={character?.class ?? ''}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="" disabled>Select your class</option>
              {CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Level + Server row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Level <span className="text-red-400">*</span>
              </label>
              <input
                name="level"
                type="number"
                required
                min={1}
                max={999}
                defaultValue={character?.level ?? ''}
                placeholder="e.g. 175"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Server <span className="text-red-400">*</span>
              </label>
              <select
                name="server"
                required
                defaultValue={character?.server ?? ''}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="" disabled>Select server</option>
                {SERVERS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Notes <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              name="notes"
              rows={3}
              maxLength={300}
              defaultValue={character?.notes ?? ''}
              placeholder="Anything your guild leader should know — build, availability, role, etc."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {isEdit ? 'Save changes' : 'Save character'}
          </button>
        </form>
      </div>
    </div>
  )
}
