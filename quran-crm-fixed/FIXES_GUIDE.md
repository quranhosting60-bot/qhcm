# 🔧 CRM Bugs Fix Guide

## Teeno Problems aur unke Solutions

---

## Bug 1: Signup ke baad "Set Password" screen dobara aata hai

**Wajah:** Supabase ka Email Confirmation ON hai. Jab signup hota hai, Supabase user ko 
"unconfirmed" mark karta hai. App sochti hai superadmin nahi bana, setup page show karta hai.

### Fix (Supabase Dashboard mein karo):

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. **"Confirm email"** toggle ko **OFF** kar do
3. Save karo

✅ Ab signup ke baad seedha login ho sakta hai.

---

## Bug 2: Leads Add nahi hoti / Bht time lagta hai

**Wajah 1:** Supabase RLS (Row Level Security) policies `auth.role()` use karti thi jo 
naye Supabase versions mein kaam nahi karta.

### Fix (Supabase Dashboard → SQL Editor):

`SUPABASE_MIGRATIONS.sql` file ka **PATCH v2** section run karo (file ke end mein hai).

Sirf yeh part copy karke SQL Editor mein run karo:
```sql
-- Drop old policy and recreate with correct syntax
DROP POLICY IF EXISTS "leads_all_auth" ON leads;

CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "leads_insert" ON leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "leads_update" ON leads
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "leads_delete" ON leads
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
          AND role IN ('admin', 'superadmin')
          AND status = 'approved'
      )
    )
  );
```

**Wajah 2 (Code fix - already applied):** Validation error pe loading state stuck rehti thi.
Ab yeh fix ho gaya.

---

## Bug 3: Back button press karo to Setup/Login loop

**Wajah:** AppShell auth loading complete hone se pehle redirect kar deta tha.

### Fix (Code mein already apply ho gaya):
- AppShell ab pehle auth loading wait karta hai
- Login page ka duplicate redirect remove ho gaya
- Loading spinner dikhta hai jab tak auth check ho

---

## Vercel Deployment ke liye

Vercel Dashboard → Project → **Settings** → **Environment Variables** mein ye add karo:

```
NEXT_PUBLIC_SUPABASE_URL = (aapka supabase URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (aapka anon key)
```

Phir **Redeploy** karo.

---

## Quick Checklist

- [ ] Supabase → Auth → Email Confirmation OFF karo
- [ ] SQL Editor mein PATCH v2 run karo  
- [ ] Vercel mein updated code deploy karo
- [ ] Test: Signup → seedha login mile (setup page nahi)
- [ ] Test: Lead add karo → foran save ho

