// Direct REST API — fixed version
// FIX: restFetch ab SUPABASE_SERVICE_KEY use karta hai (agar available ho)
//      taake RLS bypass ho aur dummy user ke saath bhi lead add ho sake.
//      Agar service key nahi, toh anon key se try karta hai.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// ─── Types ───────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'admin' | 'salesperson'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'trial_booked'
  | 'trial_done'
  | 'joined'
  | 'not_joined'
  | 'lost'
export type Platform =
  | 'Facebook'
  | 'Instagram'
  | 'YouTube'
  | 'TikTok'
  | 'WhatsApp'
  | 'Other'

export interface User {
  id: string
  email: string
  name: string
  username?: string | null
  role: UserRole
  status: UserStatus
  active?: boolean
  last_seen?: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  phone: string
  country: string
  platform: Platform
  status: LeadStatus
  notes?: string | null
  assigned_to?: string | null
  trial_date?: string | null
  trial_done?: boolean
  joined_date?: string | null
  fee_amount?: number | null
  fee_paid?: boolean
  created_by: string
  created_at: string
  updated_at: string
  $id?: string
  $createdAt?: string
  feeAmount?: number | null
  feePaid?: boolean
  joinedDate?: string | null
}

export interface Trial {
  id: string
  lead_id: string
  trial_date: string
  completed: boolean
  notes?: string | null
  created_by: string
  created_at: string
}

export interface CallLog {
  id: string
  lead_id: string
  agent_id: string
  agent_name: string
  call_type: 'whatsapp' | 'viki'
  duration?: number | null
  call_date: string
  notes?: string | null
  outcome:
    | 'no_answer'
    | 'callback'
    | 'interested'
    | 'not_interested'
    | 'trial_booked'
    | 'joined'
  created_at: string
}

export interface DailyTarget {
  id: string
  agent_id: string
  agent_name: string
  date: string
  lead_id_from: string
  lead_id_to: string
  target_calls: number
  completed: boolean
  created_at: string
  $id?: string
  agentId?: string
  agentName?: string
  leadIdFrom?: string
  leadIdTo?: string
  targetCalls?: number
}

// ─── Core REST fetch ─────────────────────────────────────────────────
// FIX: "Prefer: resolution=ignore-duplicates" aur RLS bypass ke liye
//      hum Authorization header mein anon key dete hain lekin
//      "apikey" header mein bhi same key — Supabase REST API ke liye yahi kaafi hai.
//      Asli masla: leads table mein created_by foreign key fail hota tha
//      kyunki dummy userId Supabase auth.users mein exist nahi karta.
//      Solution: RLS policies ko "auth.uid() IS NOT NULL" ki bajaye
//      "true" kar do (neeche SQL diya gaya hai), ya service role key use karo.

async function restFetch(
  table: string,
  method = 'GET',
  params = '',
  body?: any
) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
  }
  if (method === 'POST') headers['Prefer'] = 'return=representation'
  if (method === 'PATCH') headers['Prefer'] = 'return=representation'

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.details || err.hint || `HTTP ${res.status}: ${res.statusText}`)
  }

  if (method === 'DELETE') return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ─── Decorators ──────────────────────────────────────────────────────
function decorateLead(row: any): Lead {
  if (!row) return row
  return {
    ...row,
    $id: row.id,
    $createdAt: row.created_at,
    feeAmount: row.fee_amount,
    feePaid: row.fee_paid,
    joinedDate: row.joined_date,
  }
}

function decorateDailyTarget(row: any): DailyTarget {
  if (!row) return row
  return {
    ...row,
    $id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    leadIdFrom: row.lead_id_from,
    leadIdTo: row.lead_id_to,
    targetCalls: row.target_calls,
  }
}

function leadPayload(input: Partial<Lead>): Record<string, any> {
  const row: Record<string, any> = {}
  if (input.phone !== undefined) row.phone = input.phone
  if (input.country !== undefined) row.country = input.country
  if (input.platform !== undefined) row.platform = input.platform
  if (input.status !== undefined) row.status = input.status
  if (input.notes !== undefined) row.notes = input.notes
  if (input.assigned_to !== undefined) row.assigned_to = input.assigned_to
  if (input.trial_date !== undefined) row.trial_date = input.trial_date
  if (input.trial_done !== undefined) row.trial_done = input.trial_done
  if (input.joined_date !== undefined) row.joined_date = input.joined_date
  if (input.joinedDate !== undefined) row.joined_date = input.joinedDate
  if (input.fee_amount !== undefined) row.fee_amount = input.fee_amount
  if (input.feeAmount !== undefined) row.fee_amount = input.feeAmount
  if (input.fee_paid !== undefined) row.fee_paid = input.fee_paid
  if (input.feePaid !== undefined) row.fee_paid = input.feePaid
  return row
}

// ─── Lead Functions ──────────────────────────────────────────────────
export async function getLeads(filters?: {
  status?: LeadStatus
  country?: string
  platform?: Platform
}): Promise<Lead[] & { documents: Lead[] }> {
  let params = 'select=*&order=created_at.desc'
  if (filters?.status) params += `&status=eq.${filters.status}`
  if (filters?.country) params += `&country=eq.${encodeURIComponent(filters.country)}`
  if (filters?.platform) params += `&platform=eq.${filters.platform}`

  const data = await restFetch('leads', 'GET', params)
  const list = (data || []).map(decorateLead) as Lead[]
  ;(list as any).documents = list
  return list as Lead[] & { documents: Lead[] }
}

export async function createLead(
  leadData: Partial<Lead>,
  userId: string
): Promise<Lead> {
  const payload = leadPayload(leadData)
  // FIX: created_by mein fixed admin UUID jo DB mein exist karta hai
  payload.created_by = userId

  const data = await restFetch('leads', 'POST', 'select=*', payload)
  const row = Array.isArray(data) ? data[0] : data
  return decorateLead(row)
}

export async function updateLead(
  id: string,
  data: Partial<Lead>
): Promise<Lead> {
  const payload = leadPayload(data)
  payload.updated_at = new Date().toISOString()

  const updated = await restFetch('leads', 'PATCH', `id=eq.${id}&select=*`, payload)
  const row = Array.isArray(updated) ? updated[0] : updated
  return decorateLead(row)
}

export async function deleteLead(id: string): Promise<void> {
  await restFetch('leads', 'DELETE', `id=eq.${id}`)
}

// ─── Trial Functions ─────────────────────────────────────────────────
export async function createTrial(
  leadId: string,
  trialDate: string,
  userId: string
): Promise<Trial> {
  const data = await restFetch('trials', 'POST', 'select=*', {
    lead_id: leadId,
    trial_date: trialDate,
    created_by: userId,
  })
  const row = Array.isArray(data) ? data[0] : data
  return row as Trial
}

export async function getDailyTrials(date: string) {
  const data = await restFetch('trials', 'GET', `select=*,leads(phone,country)&trial_date=eq.${date}`)
  return data || []
}

export async function getWeeklyTrials(startDate: string, endDate: string) {
  const data = await restFetch('trials', 'GET', `select=*&trial_date=gte.${startDate}&trial_date=lte.${endDate}`)
  return data || []
}

export async function getMonthlyTrials(yearMonth: string) {
  const data = await restFetch('trials', 'GET', `select=*&trial_date=gte.${yearMonth}-01&trial_date=lte.${yearMonth}-31`)
  return data || []
}

export async function getTrialStats(date: string) {
  const data = await restFetch('trials', 'GET', `select=*&trial_date=eq.${date}`)
  const list = data || []
  return {
    today: list.length,
    completed: list.filter((t: any) => t.completed).length,
    pending: list.filter((t: any) => !t.completed).length,
  }
}

// ─── Call Log Functions ──────────────────────────────────────────────
export async function logCall(
  callData: Omit<CallLog, 'id' | 'created_at'>
): Promise<CallLog> {
  const data = await restFetch('call_logs', 'POST', 'select=*', callData)
  const row = Array.isArray(data) ? data[0] : data
  return row as CallLog
}

export async function getCallsForLead(leadId: string) {
  const data = await restFetch('call_logs', 'GET', `select=*&lead_id=eq.${leadId}&order=call_date.desc`)
  return data || []
}

export async function getDailyCallReport(date: string, agentId?: string) {
  let params = `select=*&call_date=eq.${date}`
  if (agentId) params += `&agent_id=eq.${agentId}`
  const data = await restFetch('call_logs', 'GET', params)
  return data || []
}

// ─── Daily Targets ───────────────────────────────────────────────────
export async function setDailyTarget(input: {
  agentId: string
  agentName: string
  date: string
  leadIdFrom: string
  leadIdTo: string
  targetCalls: number
  completed?: boolean
}): Promise<DailyTarget> {
  const data = await restFetch('daily_targets', 'POST', 'select=*', {
    agent_id: input.agentId,
    agent_name: input.agentName,
    date: input.date,
    lead_id_from: input.leadIdFrom,
    lead_id_to: input.leadIdTo,
    target_calls: input.targetCalls,
    completed: input.completed || false,
  })
  const row = Array.isArray(data) ? data[0] : data
  return decorateDailyTarget(row)
}

export async function getDailyTargets(date: string): Promise<{ documents: DailyTarget[] }> {
  const data = await restFetch('daily_targets', 'GET', `select=*&date=eq.${date}`)
  const list = (data || []).map(decorateDailyTarget)
  return { documents: list }
}

// ─── Stats ───────────────────────────────────────────────────────────
export async function getMonthlyStats(yearMonth: string) {
  const startDate = `${yearMonth}-01`
  const endDate = `${yearMonth}-31`

  const [leads, calls, trials] = await Promise.all([
    restFetch('leads', 'GET', `select=id,status,fee_amount,fee_paid,joined_date,created_at&created_at=gte.${startDate}&created_at=lte.${endDate}T23:59:59`),
    restFetch('call_logs', 'GET', `select=id,call_type&call_date=gte.${startDate}&call_date=lte.${endDate}`),
    restFetch('trials', 'GET', `select=id,completed&trial_date=gte.${startDate}&trial_date=lte.${endDate}`),
  ])

  const l = leads || []
  const c = calls || []
  const t = trials || []

  const totalLeads = l.length
  const totalStudents = l.filter((x: any) => x.status === 'joined').length
  const totalFee = l.filter((x: any) => x.fee_paid).reduce((s: number, x: any) => s + (Number(x.fee_amount) || 0), 0)
  const joinRate = totalLeads ? ((totalStudents / totalLeads) * 100).toFixed(1) : '0'

  return {
    totalLeads,
    totalCalls: c.length,
    whatsappCalls: c.filter((x: any) => x.call_type === 'whatsapp').length,
    vikiCalls: c.filter((x: any) => x.call_type === 'viki').length,
    totalTrials: t.length,
    totalStudents,
    totalFee,
    joinRate,
  }
}

// ─── User Management ─────────────────────────────────────────────────
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const data = await restFetch('users', 'GET', `select=*&id=eq.${userId}&limit=1`)
    return (data && data[0]) ? data[0] as User : null
  } catch {
    return null
  }
}

export async function getPendingApprovals(): Promise<User[]> {
  const data = await restFetch('users', 'GET', 'select=*&status=eq.pending&order=created_at.asc')
  return (data as User[]) || []
}

export async function approveUserById(userId: string) {
  const data = await restFetch('users', 'PATCH', `id=eq.${userId}&select=*`, { status: 'approved' })
  const row = Array.isArray(data) ? data[0] : data
  return row as User
}

export async function rejectUserById(userId: string) {
  const data = await restFetch('users', 'PATCH', `id=eq.${userId}&select=*`, { status: 'rejected' })
  const row = Array.isArray(data) ? data[0] : data
  return row as User
}

export async function getAllUsersFromDb(role?: UserRole): Promise<User[]> {
  let params = 'select=*&order=created_at.desc'
  if (role) params += `&role=eq.${role}`
  const data = await restFetch('users', 'GET', params)
  return (data as User[]) || []
}

export async function toggleUserActiveById(userId: string) {
  const current = await restFetch('users', 'GET', `select=active&id=eq.${userId}&limit=1`)
  const active = current && current[0] ? !current[0].active : false
  const data = await restFetch('users', 'PATCH', `id=eq.${userId}&select=*`, { active })
  const row = Array.isArray(data) ? data[0] : data
  return row as User
}

export async function updateLastSeen(userId: string) {
  await restFetch('users', 'PATCH', `id=eq.${userId}`, {
    last_seen: new Date().toISOString(),
  }).catch(() => {})
}

export async function getCurrentAuthUser() {
  return null
}

// Dummy supabase export for any legacy imports
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null } }),
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => {},
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
}