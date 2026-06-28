// Auto-generated types matching your guild_schema.sql
// Update these as your schema evolves, or use Supabase CLI:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

export type MemberRole = 'leader' | 'officer' | 'member'
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
export type AttendanceStatus = 'present' | 'absent' | 'excused'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: string
  discord_id: string
  discord_username: string
  discord_avatar: string | null
  last_seen_at: string
  created_at: string
}

export interface Guild {
  id: string
  name: string
  description: string | null
  owner_id: string
  invite_code: string
  created_at: string
}

export interface GuildMember {
  id: string
  guild_id: string
  user_id: string
  role: MemberRole
  is_active: boolean
  joined_at: string
  // Joined fields (from queries with select *)
  users?: User
  guilds?: Guild
}

export interface Character {
  id: string
  user_id: string
  guild_id: string
  character_name: string
  class: string | null
  level: number
  server: string | null
  notes: string | null
  updated_at: string
  created_at: string
}

export interface GuildEvent {
  id: string
  guild_id: string
  created_by: string | null
  title: string
  description: string | null
  event_type: string
  status: EventStatus
  scheduled_at: string
  created_at: string
}

export interface EventAttendance {
  id: string
  event_id: string
  user_id: string
  status: AttendanceStatus
  noted_by: string | null
}

export interface Announcement {
  id: string
  guild_id: string
  created_by: string | null
  title: string
  content: string
  is_pinned: boolean
  created_at: string
}

export interface Application {
  id: string
  guild_id: string
  user_id: string
  message: string | null
  status: ApplicationStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}
