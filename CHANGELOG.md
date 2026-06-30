# Guild Management Website — Project Summary (v2)

## Stack
- **Frontend/Backend:** Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **Database + Auth:** Supabase (PostgreSQL + Discord OAuth via `@supabase/ssr`)
- **Discord Bot:** REST API calls from Next.js server actions (no persistent gateway connection)
- **Icons:** lucide-react
- **Hosting:** Vercel (not yet deployed — still local, intentionally, more tweaks planned)
- **Editor:** VS Code

---

## Project structure (updated)

```
guild-app/
├── src/
│   ├── middleware.ts                        ✅ done (passes ?next= through for post-login redirects)
│   ├── utils/supabase/
│   │   ├── client.ts                        ✅ done
│   │   └── server.ts                        ✅ done
│   ├── types/
│   │   └── database.ts                      ✅ done
│   └── app/
│       ├── layout.tsx                       ✅ done
│       ├── page.tsx                         ✅ done (login page, supports ?next=)
│       ├── favicon.ico                      ✅ done (used in top bar)
│       ├── api/
│       │   └── discord/notify/route.ts      ✅ done (bot REST API bridge)
│       ├── auth/
│       │   ├── callback/route.ts            ✅ done (saves provider_token, supports ?next=)
│       │   ├── discord/route.ts             ✅ done (POST, reads next from form body)
│       │   └── logout/route.ts              ✅ done (renamed from signout)
│       ├── apply/
│       │   ├── [invite_code]/page.tsx       ✅ done (public apply form)
│       │   └── success/page.tsx             ✅ done
│       └── dashboard/
│           ├── layout.tsx                   ✅ done (fixed/floating sidebar + topbar)
│           ├── TopBar.tsx                   ✅ done (favicon, Discord support link, account dropdown)
│           ├── page.tsx                     ✅ done (overview, clickable invite code pill)
│           ├── InviteCodeCard.tsx           ✅ done (copy-to-clipboard with feedback)
│           ├── create/page.tsx              ✅ done (create guild)
│           ├── join/page.tsx                ✅ done (join via invite code)
│           ├── character/page.tsx           ✅ done (in-game profile)
│           ├── members/
│           │   ├── page.tsx                 ✅ done (roster + placeholder members)
│           │   └── MemberRow.tsx            ✅ done (client component, promote/demote/kick/link)
│           ├── events/
│           │   ├── page.tsx                 ✅ done (events list)
│           │   ├── new/page.tsx             ✅ done (create event, Discord scheduled event sync)
│           │   └── [id]/page.tsx            ✅ done (event detail + attendance)
│           ├── announcements/
│           │   ├── page.tsx                 ✅ done (list with pin/delete)
│           │   ├── AnnouncementCard.tsx     ✅ done (client component)
│           │   └── new/page.tsx             ✅ done (post announcement, Discord channel sync)
│           ├── applications/
│           │   └── page.tsx                 ✅ done (leader/officer review queue)
│           └── settings/
│               ├── page.tsx                 ✅ done (3-column layout, see below)
│               ├── CopyInviteButton.tsx     ✅ done
│               └── DangerActions.tsx        ✅ done (client component, confirm dialogs)
```

---

## Database schema additions (since v1)

| Table | New columns |
|---|---|
| `guild_members` | `is_placeholder` (bool), `placeholder_name` (text), `user_id` now nullable |
| `characters` | `guild_member_id` (FK → guild_members), `user_id` now nullable |
| `guilds` | `discord_server_id`, `announcement_channel_id`, `applications_channel_id` |
| `profiles` | `provider_token` (stores Discord OAuth token for API calls) |
| `events` | `location` (text, optional — used for Discord scheduled events) |

### Key fixes during this session
- `guild_members_real_user_unique` — partial unique index `(guild_id, user_id) WHERE user_id IS NOT NULL`, since placeholders share `NULL` user_id
- `is_guild_member(gid)` — SECURITY DEFINER function to avoid infinite RLS recursion on `guild_members` SELECT policy
- Duplicate RLS policies cleaned up on `applications` (`apps_insert`/`apps_select` vs `applications_insert`/`applications_select`)
- Added missing `WITH CHECK` on `announce_insert` and `events_insert` (previously any guild member could insert into any guild)
- Added missing `events_update`/`events_delete` policies
- Stale `users` table (pre-`profiles` rename) and its policies dropped

---

## Features completed (since v1)

### Applications
- Public apply page at `/apply/[invite_code]` — shows guild info, requires Discord login, optional message field
- Login button posts to `/auth/discord` with `next` in form body so login redirects back to the apply page
- Leader/officer review queue at `/dashboard/applications` — approve (auto-adds to `guild_members`) or reject

### Members — placeholder accounts
- Leaders can add a "placeholder" member by character name only (no Discord account required)
- Placeholder rows show a dashed ghost avatar + "No Discord" badge
- Leader can later "Link Discord" — dropdown to merge the placeholder into a real member, preserving join date and role, then hard-deletes the placeholder row
- "Remove" button hard-deletes (not soft-deletes) placeholders

### Members — role management
- Leader-only: Promote (member → officer), Demote (officer → member), Kick (soft delete via `is_active = false`)
- Self and other leaders are protected from these actions

### Settings page
- Guild info — edit name/description
- Invite link — view code, copy link, regenerate code (invalidates old one)
- Discord integration — server ID + announcement/applications channel IDs, verified against the user's actual Discord "Manage Server" permission before saving
- Danger zone — delete guild (owner-only, confirm dialog)
- Redesigned into a 3-column card layout (Guild info / Discord integration / Invite link) with a full-width Danger Zone section below a divider

### Discord bot integration
- Bot is REST-API only — no persistent gateway connection needed, so "offline" status in Discord is cosmetic
- **Announcements** — posting in-app sends an embed to the configured Discord channel
- **Events** — creating an event in-app creates a native Discord Scheduled Event (External type) on the configured server, with a Location field leaders can fill in per-event
- **Security model** — before saving a Discord Server ID in settings, the app calls Discord's API using the leader's stored OAuth token to confirm they have `MANAGE_GUILD` permission on that server. This prevents anyone from entering a server ID they don't control. The bot itself only being present in invited servers is a second layer of protection.
- Applications channel notifications — wired in settings, not yet triggering the actual notify call (see "Not built yet")

### UI/UX overhaul
- Top bar — favicon (left), Discord support server button, account avatar dropdown (right) showing character name, Discord username, "My Character" link, and "Log out"
- Sidebar — collapses to icon-only (Lucide icons), expands on hover, floats over content (doesn't push the page), stays fixed while only main content scrolls
- Overview page — invite code is now a small clickable pill that copies the invite link and shows "Copied!" feedback; Quick Actions section removed
- Cursor pointers added to all interactive buttons across Members, Settings, and TopBar
- Avatar images fixed across the app (were querying wrong table/column, now correctly pull from `profiles.discord_avatar`)

---

## Not built yet
- **Applications Discord notifications** — channel ID is configurable in settings but the actual bot call on new application submission isn't wired up yet
- **New event/announcement modals** — currently still separate pages (`/dashboard/events/new`, `/dashboard/announcements/new`); plan is to convert both to in-page modals
- **Add Member modal** — members page "Add member" button still uses the old inline text-only form; plan is a modal with IGN, Class, and Level fields (DB already supports this via `characters.guild_member_id`)
- **Vercel deployment** — still local only, intentionally, more UI tweaks planned first

---

## Role permissions summary

| Feature | Member | Officer | Leader |
|---|---|---|---|
| View members, events, announcements | ✅ | ✅ | ✅ |
| Edit own character profile | ✅ | ✅ | ✅ |
| Create events, post announcements | ❌ | ✅ | ✅ |
| Mark event attendance | ❌ | ✅ | ✅ |
| Pin/delete announcements | ❌ | ✅ | ✅ |
| Approve/reject applications | ❌ | ✅ | ✅ |
| Invite members | ❌ | ✅ | ✅ |
| Add/remove/link placeholder members | ❌ | ❌ | ✅ |
| Promote/demote/kick members | ❌ | ❌ | ✅ |
| Manage Discord integration | ❌ | ❌ | ✅ |
| Edit guild info, regenerate invite code | ❌ | ❌ | ✅ |
| Delete guild | ❌ | ❌ | ✅ |