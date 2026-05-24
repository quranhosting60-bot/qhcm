# Quran Hosting CRM — Setup Guide

## 🔧 Kya Fix Hua Hai (What Was Fixed)

Iss build mein neeche likhe sab errors fix kiye gaye hain:

1. **Double auth system removed** — `auth.tsx` aur `supabase-auth.tsx` ek hi unified Supabase-based provider mein merge ho gaye. Ab `auth.tsx` sirf re-export hai, sab pages bina change kiye chalengi.
2. **Real Supabase Auth integrated** — pehle `supabase-auth.tsx` localStorage chala raha tha; ab actually `supabase.auth.signUp`, `signInWithPassword`, `signOut`, `onAuthStateChange` use hota hai.
3. **`AppShell.tsx`** mein undefined `APPWRITE_ENDPOINT` reference hata diya.
4. **Missing functions added** to `src/lib/supabase.ts`:
   - `setDailyTarget`, `getDailyTargets`, `DailyTarget` type
   - `getMonthlyStats`
   - `getPendingApprovals`, `approveUserById`, `rejectUserById`, `getAllUsersFromDb`, `toggleUserActiveById`, `updateLastSeen`
5. **Field naming standardised** — `students/page.tsx` aur `targets/page.tsx` Appwrite-style (`$id`, `$createdAt`, `feeAmount`, `feePaid`) use kar rahe the. Ab Supabase snake_case (`id`, `created_at`, `fee_amount`, `fee_paid`) use hota hai, aur camelCase aliases backward-compat ke liye add ho gaye hain.
6. **`daily_targets` table** create ho gaya — pehle SQL mein hi nahi tha.
7. **RLS policies fixed** — pehle signup ke time users table mein insert hi block ho jata tha (circular dependency); ab `users_insert_self` policy se theek hai.
8. **async/await fixed** — `login`, `signup`, `setupIbrahim` ab properly awaited hain har page mein.
9. **TypeScript clean pass** — `tsc --noEmit` zero errors deta hai.

---

## 🚀 Step-by-Step Setup

### 1. Supabase Database Setup

Supabase Dashboard kholo → apna project select karo → **SQL Editor** → **New query** → poori `SUPABASE_MIGRATIONS.sql` file paste karo → **Run** click karo.

Yeh 5 tables banayega:

| Table | Purpose | Important Columns |
|---|---|---|
| `users` | Profile + role + status (auth.users se linked) | `id`, `email`, `name`, `username`, `role`, `status`, `active` |
| `leads` | Lead management | `phone`, `country`, `platform`, `status`, `fee_amount`, `fee_paid` |
| `trials` | Trial bookings | `lead_id`, `trial_date`, `completed` |
| `call_logs` | Call history | `lead_id`, `agent_id`, `call_type`, `outcome` |
| `daily_targets` | Per-agent daily call targets | `agent_name`, `date`, `target_calls` |

### 2. Supabase Auth Settings

Dashboard mein:
- **Authentication → Providers → Email** enable karo
- Testing ke liye **Confirm email** off karo (Authentication → Sign In / Up → Email confirmations toggle off)

### 3. Environment Variables

`.env.local` file pehle se setup hai:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hqtaynswwzjqopfldetd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Agar koi aur Supabase project use karna ho to dono values change kar dena. Yeh values Supabase Dashboard → **Project Settings → API** se milti hain.

### 4. Install & Run

```bash
npm install
npm run dev
```

App `http://localhost:3000` par chalega.

### 5. First-Time Login Flow

1. App khulega aur seedha `/setup` page par bhej dega (kyunki abhi koi superadmin nahi).
2. Setup page par strong password set karo. Yeh **automatically** Supabase Auth mein `quranhostingcrm378@gmail.com` ke saath user create karta hai aur `users` table mein superadmin profile insert karta hai.
3. Phir `/login` par redirect ho jaoge.
4. Login karo `quranhostingcrm378@gmail.com` + apna password — dashboard khul jayega.
5. Naye admin/salesperson signup kar saktay hain `/signup` se — but woh **pending** status par jayenge jab tak superadmin dashboard se approve na kare.

---

## 📋 Database Schema Reference

### users
- `id` UUID (PK, references `auth.users.id`)
- `email` VARCHAR(255) UNIQUE NOT NULL
- `name` VARCHAR(255) NOT NULL
- `username` VARCHAR(255)
- `role` VARCHAR(50) — `superadmin` | `admin` | `salesperson`
- `status` VARCHAR(50) — `pending` | `approved` | `rejected`
- `active` BOOLEAN (default TRUE)
- `last_seen` TIMESTAMPTZ
- `created_at`, `updated_at` TIMESTAMPTZ

### leads
- `id` UUID (PK)
- `phone` VARCHAR(20) NOT NULL
- `country` VARCHAR(100) NOT NULL
- `platform` — `Facebook` | `Instagram` | `YouTube` | `TikTok` | `WhatsApp` | `Other`
- `status` — `new` | `contacted` | `trial_booked` | `trial_done` | `joined` | `not_joined` | `lost`
- `notes` TEXT
- `assigned_to` UUID (FK → `users.id`)
- `trial_date` DATE
- `trial_done` BOOLEAN
- `joined_date` DATE
- `fee_amount` NUMERIC(10,2)
- `fee_paid` BOOLEAN
- `created_by` UUID NOT NULL (FK → `users.id`)
- `created_at`, `updated_at` TIMESTAMPTZ

### trials
- `id` UUID (PK)
- `lead_id` UUID (FK → `leads.id`, ON DELETE CASCADE)
- `trial_date` DATE NOT NULL
- `completed` BOOLEAN
- `notes` TEXT
- `created_by` UUID (FK → `users.id`)
- `created_at` TIMESTAMPTZ

### call_logs
- `id` UUID (PK)
- `lead_id` UUID (FK → `leads.id`, ON DELETE CASCADE)
- `agent_id` UUID (FK → `users.id`)
- `agent_name` VARCHAR(255)
- `call_type` — `whatsapp` | `viki`
- `duration` INTEGER (seconds)
- `call_date` DATE
- `notes` TEXT
- `outcome` — `no_answer` | `callback` | `interested` | `not_interested` | `trial_booked` | `joined`
- `created_at` TIMESTAMPTZ

### daily_targets
- `id` UUID (PK)
- `agent_id` TEXT NOT NULL
- `agent_name` TEXT NOT NULL
- `date` DATE NOT NULL
- `lead_id_from` TEXT NOT NULL
- `lead_id_to` TEXT NOT NULL
- `target_calls` INTEGER NOT NULL
- `completed` BOOLEAN
- `created_at` TIMESTAMPTZ

---

## 🆘 Troubleshooting

**"Account pending approval"** — Naye signups ko superadmin dashboard se approve karna hota hai.

**"Profile not found"** — Mostly tab hota hai jab Auth user toh ban gaya lekin `users` table mein insert fail ho gaya (purani RLS policy ki wajah se). Naya SQL chala lo — fix ho jayega.

**"Invalid login credentials"** — Email confirmation enabled hai aur user ne email confirm nahi kiya. Dashboard se Email Confirmations off kar do.

**Tables nahi banay** — SQL Editor mein error message check karo. Sab se common reason: `auth.users` table reference. Yeh Supabase mein default exist karta hai, lekin agar custom schema use kar rahe ho to error aayega.
