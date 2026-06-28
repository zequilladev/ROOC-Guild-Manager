# Guild App — Setup Guide

## 1. Create the Next.js project

```bash
npx create-next-app@latest guild-app --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
cd guild-app
```

## 2. Install Supabase packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 3. Create a Supabase project

1. Go to https://supabase.com and create a new project
2. Once created, go to **Settings → API**
3. Copy your **Project URL** and **anon public key**
4. Paste the guild_schema.sql into **SQL Editor → New Query → Run**

## 4. Enable Discord OAuth in Supabase

1. In Supabase, go to **Authentication → Providers → Discord**
2. Toggle it on — you'll need a **Client ID** and **Client Secret** from Discord
3. Copy the **Callback URL** shown (looks like `https://xxx.supabase.co/auth/v1/callback`)

## 5. Create a Discord Application

1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name
3. Go to **OAuth2 → General**
4. Copy the **Client ID** and **Client Secret** → paste into Supabase (step 4)
5. Under **Redirects**, add your Supabase callback URL from step 4
6. Also add your local redirect: `http://localhost:3000/auth/callback`
7. Under **Scopes**, make sure `identify` and `email` are checked

## 6. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

## 7. Copy the scaffold files

Copy all files from this scaffold into your project root, preserving the folder structure:

```
middleware.ts
utils/supabase/client.ts
utils/supabase/server.ts
types/database.ts
app/page.tsx
app/layout.tsx
app/auth/callback/route.ts
app/auth/discord/route.ts
app/dashboard/layout.tsx
app/dashboard/page.tsx
app/dashboard/members/page.tsx
```

## 8. Run the dev server

```bash
npm run dev
```

Visit http://localhost:3000 — you should see the login page.
Click **Login with Discord**, authorize the app, and you'll land on the dashboard.

---

## Folder structure after setup

```
guild-app/
├── .env.local
├── middleware.ts              ← protects /dashboard routes
├── utils/
│   └── supabase/
│       ├── client.ts          ← use in Client Components
│       └── server.ts          ← use in Server Components & Route Handlers
├── types/
│   └── database.ts            ← TypeScript types for your schema
└── app/
    ├── layout.tsx
    ├── page.tsx               ← login / landing page
    ├── auth/
    │   ├── callback/route.ts  ← OAuth redirect lands here
    │   └── discord/route.ts   ← triggers the OAuth flow
    └── dashboard/
        ├── layout.tsx         ← sidebar + nav shell
        ├── page.tsx           ← overview
        └── members/
            └── page.tsx       ← member roster
```
