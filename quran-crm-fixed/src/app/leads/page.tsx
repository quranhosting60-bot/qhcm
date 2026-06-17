'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { type Lead, type Platform, type LeadStatus } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit3, Plus, Search, Phone, Eye, X, MessageSquare, Headphones, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function apiFetch(table: string, method = 'GET', params = '', body?: any) {
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
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.details || err.hint || `HTTP ${res.status}`)
  }
  if (method === 'DELETE') return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const PLATFORMS: Platform[] = ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'WhatsApp', 'Google', 'SEO', 'Other']
const COUNTRIES = [
  'Pakistan', 'India', 'USA', 'UK', 'Canada', 'Australia',
  'Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Iraq', 'Syria', 'Yemen',
  'Egypt', 'Libya', 'Tunisia', 'Algeria', 'Morocco', 'Sudan',
  'Bangladesh', 'Malaysia', 'Indonesia', 'Singapore', 'Brunei',
  'Turkey', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Nigeria', 'Kenya', 'South Africa', 'Ethiopia', 'Tanzania', 'Ghana',
  'New Zealand', 'Ireland', 'Other',
]
const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'trial_booked', label: 'Trial Booked' },
  { value: 'trial_done', label: 'Trial Done' },
  { value: 'joined', label: 'Joined' },
  { value: 'not_joined', label: 'Not Joined' },
  { value: 'lost', label: 'Lost' },
]
const OUTCOMES = [
  { value: 'no_answer', label: 'No Answer' },
  { value: 'callback', label: 'Call Back Later' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'trial_booked', label: 'Trial Booked' },
  { value: 'trial_done', label: 'Trial Done' },
  { value: 'joined', label: 'Joined' },
]
const statusBadge: Record<LeadStatus, string> = {
  new: 'badge badge-gray',
  contacted: 'badge badge-blue',
  trial_booked: 'badge badge-yellow',
  trial_done: 'badge badge-purple',
  joined: 'badge badge-green',
  not_joined: 'badge badge-red',
  lost: 'badge badge-red',
}

const cleanPhone = (phone: string) => phone.replace(/[\s\-\(\)\+]/g, '')

const COUNTRY_FLAG: Record<string, string> = {
  'Pakistan': '🇵🇰', 'India': '🇮🇳', 'USA': '🇺🇸', 'UK': '🇬🇧', 'Canada': '🇨🇦', 'Australia': '🇦🇺',
  'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪', 'Qatar': '🇶🇦', 'Kuwait': '🇰🇼', 'Bahrain': '🇧🇭',
  'Oman': '🇴🇲', 'Jordan': '🇯🇴', 'Lebanon': '🇱🇧', 'Iraq': '🇮🇶', 'Syria': '🇸🇾', 'Yemen': '🇾🇪',
  'Egypt': '🇪🇬', 'Libya': '🇱🇾', 'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'Morocco': '🇲🇦', 'Sudan': '🇸🇩',
  'Bangladesh': '🇧🇩', 'Malaysia': '🇲🇾', 'Indonesia': '🇮🇩', 'Singapore': '🇸🇬', 'Brunei': '🇧🇳',
  'Turkey': '🇹🇷', 'Germany': '🇩🇪', 'France': '🇫🇷', 'Italy': '🇮🇹', 'Spain': '🇪🇸',
  'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮',
  'Nigeria': '🇳🇬', 'Kenya': '🇰🇪', 'South Africa': '🇿🇦', 'Ethiopia': '🇪🇹', 'Tanzania': '🇹🇿', 'Ghana': '🇬🇭',
  'New Zealand': '🇳🇿', 'Ireland': '🇮🇪', 'Other': '🌍',
}

const PHONE_COUNTRY_MAP: { prefix: string; country: string }[] = [
  { prefix: '00966', country: 'Saudi Arabia' }, { prefix: '00971', country: 'UAE' },
  { prefix: '00974', country: 'Qatar' }, { prefix: '00965', country: 'Kuwait' },
  { prefix: '00973', country: 'Bahrain' }, { prefix: '00968', country: 'Oman' },
  { prefix: '00962', country: 'Jordan' }, { prefix: '00961', country: 'Lebanon' },
  { prefix: '00964', country: 'Iraq' }, { prefix: '00963', country: 'Syria' },
  { prefix: '00967', country: 'Yemen' }, { prefix: '00213', country: 'Algeria' },
  { prefix: '00216', country: 'Tunisia' }, { prefix: '00218', country: 'Libya' },
  { prefix: '00212', country: 'Morocco' }, { prefix: '00249', country: 'Sudan' },
  { prefix: '00234', country: 'Nigeria' }, { prefix: '00254', country: 'Kenya' },
  { prefix: '00255', country: 'Tanzania' }, { prefix: '00233', country: 'Ghana' },
  { prefix: '00251', country: 'Ethiopia' }, { prefix: '00027', country: 'South Africa' },
  { prefix: '00090', country: 'Turkey' }, { prefix: '00049', country: 'Germany' },
  { prefix: '00033', country: 'France' }, { prefix: '00039', country: 'Italy' },
  { prefix: '00034', country: 'Spain' }, { prefix: '00031', country: 'Netherlands' },
  { prefix: '00032', country: 'Belgium' }, { prefix: '00046', country: 'Sweden' },
  { prefix: '00047', country: 'Norway' }, { prefix: '00045', country: 'Denmark' },
  { prefix: '00358', country: 'Finland' }, { prefix: '00353', country: 'Ireland' },
  { prefix: '00064', country: 'New Zealand' }, { prefix: '00673', country: 'Brunei' },
  { prefix: '00065', country: 'Singapore' }, { prefix: '00062', country: 'Indonesia' },
  { prefix: '00880', country: 'Bangladesh' }, { prefix: '00060', country: 'Malaysia' },
  { prefix: '00061', country: 'Australia' }, { prefix: '00044', country: 'UK' },
  { prefix: '00091', country: 'India' }, { prefix: '00092', country: 'Pakistan' },
  { prefix: '00020', country: 'Egypt' }, { prefix: '00001', country: 'USA' },
  { prefix: '001', country: 'USA' },
  { prefix: '966', country: 'Saudi Arabia' }, { prefix: '971', country: 'UAE' },
  { prefix: '974', country: 'Qatar' }, { prefix: '965', country: 'Kuwait' },
  { prefix: '973', country: 'Bahrain' }, { prefix: '968', country: 'Oman' },
  { prefix: '962', country: 'Jordan' }, { prefix: '961', country: 'Lebanon' },
  { prefix: '964', country: 'Iraq' }, { prefix: '963', country: 'Syria' },
  { prefix: '967', country: 'Yemen' }, { prefix: '213', country: 'Algeria' },
  { prefix: '216', country: 'Tunisia' }, { prefix: '218', country: 'Libya' },
  { prefix: '212', country: 'Morocco' }, { prefix: '249', country: 'Sudan' },
  { prefix: '234', country: 'Nigeria' }, { prefix: '254', country: 'Kenya' },
  { prefix: '255', country: 'Tanzania' }, { prefix: '233', country: 'Ghana' },
  { prefix: '251', country: 'Ethiopia' }, { prefix: '353', country: 'Ireland' },
  { prefix: '358', country: 'Finland' }, { prefix: '673', country: 'Brunei' },
  { prefix: '880', country: 'Bangladesh' },
  { prefix: '92', country: 'Pakistan' }, { prefix: '91', country: 'India' },
  { prefix: '44', country: 'UK' }, { prefix: '61', country: 'Australia' },
  { prefix: '64', country: 'New Zealand' }, { prefix: '65', country: 'Singapore' },
  { prefix: '62', country: 'Indonesia' }, { prefix: '60', country: 'Malaysia' },
  { prefix: '90', country: 'Turkey' }, { prefix: '49', country: 'Germany' },
  { prefix: '33', country: 'France' }, { prefix: '39', country: 'Italy' },
  { prefix: '34', country: 'Spain' }, { prefix: '31', country: 'Netherlands' },
  { prefix: '32', country: 'Belgium' }, { prefix: '46', country: 'Sweden' },
  { prefix: '47', country: 'Norway' }, { prefix: '45', country: 'Denmark' },
  { prefix: '27', country: 'South Africa' }, { prefix: '20', country: 'Egypt' },
  { prefix: '1', country: 'USA' },
]

function detectCountryFromPhone(phone: string): string {
  if (!phone || phone.length < 3) return 'Pakistan'
  const normalized = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '')
  const sorted = [...PHONE_COUNTRY_MAP].sort((a, b) => b.prefix.length - a.prefix.length)
  for (const { prefix, country } of sorted) {
    if (normalized.startsWith(prefix)) return country
  }
  return 'Pakistan'
}

type FormData = { phone: string; country: string; platform: Platform; status: LeadStatus; notes: string }
const EMPTY_FORM: FormData = { phone: '', country: 'Pakistan', platform: 'Facebook', status: 'new', notes: '' }
type CallStats = Record<string, { whatsapp: number; viki: number; chat: number }>

// ─── Country Stats Panel ──────────────────────────────────────────────────────
function CountryStatsPanel({ leads, activeCountry, onSelectCountry, onFixOther, fixing }: {
  leads: Lead[]; activeCountry: string
  onSelectCountry: (c: string) => void; onFixOther: () => void; fixing: boolean
}) {
  const [open, setOpen] = useState(true)
  const countryMap: Record<string, number> = {}
  for (const lead of leads) { const c = lead.country || 'Other'; countryMap[c] = (countryMap[c] || 0) + 1 }
  const sorted = Object.entries(countryMap).sort((a, b) => b[1] - a[1])
  const total = leads.length
  const otherCount = countryMap['Other'] || 0

  return (
    <div className="crm-card mb-4">
      <button className="w-full flex items-center justify-between group" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2.5">
          <BarChart2 size={15} className="text-emerald-400" />
          <span className="text-sm font-semibold text-slate-200">Country-wise Leads</span>
          {sorted[0] && !activeCountry && <span className="text-xs text-slate-500 ml-1">— Top: {COUNTRY_FLAG[sorted[0][0]] || '🌍'} {sorted[0][0]} ({sorted[0][1]})</span>}
          {activeCountry && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 ml-1">{COUNTRY_FLAG[activeCountry] || '🌍'} {activeCountry} selected</span>}
        </div>
        <div className="flex items-center gap-2">
          {activeCountry && <button onClick={e => { e.stopPropagation(); onSelectCountry('') }} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300">Clear ✕</button>}
          <span className="text-xs text-slate-500">Total: <span className="text-emerald-400 font-bold">{total}</span></span>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>
      {open && (
        <div className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {sorted.map(([country, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const isActive = activeCountry === country
              const isOther = country === 'Other'
              return (
                <div key={country} className="flex flex-col gap-1">
                  <button onClick={() => onSelectCountry(isActive ? '' : country)}
                    className={`text-left px-3 py-3 rounded-xl flex flex-col gap-1.5 border transition-all cursor-pointer ${isActive ? 'border-emerald-500 bg-emerald-900/25 ring-1 ring-emerald-500/40' : isOther ? 'border-amber-700/40 bg-amber-900/10 hover:border-amber-600/50' : 'border-slate-700/60 bg-slate-800/60 hover:border-emerald-700/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-base">{COUNTRY_FLAG[country] || '🌍'}</span>
                      <span className={`text-xs font-bold ${isActive ? 'text-emerald-300' : isOther ? 'text-amber-400' : 'text-emerald-400'}`}>{count}</span>
                    </div>
                    <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : isOther ? 'text-amber-300' : 'text-slate-300'}`}>{country}</p>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isActive ? 'bg-emerald-400' : isOther ? 'bg-amber-500' : 'bg-emerald-600'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500">{pct}% of total</p>
                  </button>
                  {isOther && (
                    <button onClick={e => { e.stopPropagation(); onFixOther() }} disabled={fixing}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium border border-amber-700/50 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 disabled:opacity-50">
                      {fixing ? <><span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" /> Fixing...</> : <>⚡ Auto-Fix {count} Leads</>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {otherCount > 0 && <p className="text-[10px] text-amber-600/70 mt-3">⚠️ {otherCount} leads are in "Other" — Auto-Fix will detect their country from the phone number</p>}
          {otherCount === 0 && <p className="text-[10px] text-slate-600 mt-3">💡 Click a country card to show only that country's leads</p>}
        </div>
      )}
    </div>
  )
}

// ─── Call Log Modal — with double-submit guard ────────────────────────────────
function CallLogModal({ lead, type, onConfirm, onCancel }: {
  lead: Lead; type: 'whatsapp_call' | 'whatsapp_chat' | 'viki'
  onConfirm: (outcome: string, notes: string) => Promise<void>; onCancel: () => void
}) {
  const [outcome, setOutcome] = useState('interested')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const calledRef = useRef(false) // extra guard against rapid double-click

  const handleSave = async () => {
    if (submitting || calledRef.current) return
    calledRef.current = true
    setSubmitting(true)
    try {
      await onConfirm(outcome, notes)
    } finally {
      // keep disabled; modal will unmount. Reset only if modal stays open (error case)
      setSubmitting(false)
      calledRef.current = false
    }
  }

  const config = {
    whatsapp_call: { label: 'WhatsApp Call', color: '#22c55e', icon: <Phone size={14} /> },
    whatsapp_chat: { label: 'WhatsApp Chat', color: '#10b981', icon: <MessageSquare size={14} /> },
    viki: { label: 'Viber Call', color: '#a78bfa', icon: <Headphones size={14} /> },
  }[type]

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span style={{ color: config.color }}>{config.icon}</span>
            <div>
              <p className="font-semibold text-white text-sm">Log {config.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">Select an outcome</p>
            </div>
          </div>
          <button onClick={onCancel} disabled={submitting} className="text-slate-500 hover:text-slate-300 disabled:opacity-40"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block">Outcome *</label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => (
                <button key={o.value} onClick={() => !submitting && setOutcome(o.value)}
                  className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${outcome === o.value ? 'border-emerald-600 bg-emerald-900/20 text-emerald-300' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'} ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Notes (Optional)</label>
            <textarea
              className="crm-input resize-none"
              rows={2}
              placeholder="Any notes..."
              value={notes}
              disabled={submitting}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button className="btn-secondary flex-1 justify-center" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button
            className="btn-primary flex-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              : 'Save Log'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | ''>('')
  const [filterPlatform, setFilterPlatform] = useState<Platform | ''>('')
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [viewLead, setViewLead] = useState<Lead | null>(null)
  const [callAction, setCallAction] = useState<{ lead: Lead; type: 'whatsapp_call' | 'whatsapp_chat' | 'viki' } | null>(null)
  const [callStats, setCallStats] = useState<CallStats>({})
  const [fixing, setFixing] = useState(false)

  const loadLeads = useCallback(async () => {
    try {
      let params = 'select=*&order=created_at.desc'
      if (filterStatus) params += `&status=eq.${filterStatus}`
      if (filterPlatform) params += `&platform=eq.${filterPlatform}`
      if (filterCountry) params += `&country=eq.${encodeURIComponent(filterCountry)}`
      const data = await apiFetch('leads', 'GET', params)
      setLeads(data || [])
    } catch (e: any) {
      toast.error('Failed to load leads: ' + (e?.message || 'error'))
    } finally { setLoading(false) }
  }, [filterStatus, filterPlatform, filterCountry])

  const loadCallStats = useCallback(async () => {
    try {
      const today = todayStr()
      const logs = await apiFetch('call_logs', 'GET', `select=lead_id,call_type&call_date=eq.${today}`)
      if (!logs) return
      const stats: CallStats = {}
      for (const log of logs) {
        if (!stats[log.lead_id]) stats[log.lead_id] = { whatsapp: 0, viki: 0, chat: 0 }
        if (log.call_type === 'whatsapp') stats[log.lead_id].whatsapp++
        else if (log.call_type === 'viki') stats[log.lead_id].viki++
        else if (log.call_type === 'chat') stats[log.lead_id].chat++
      }
      setCallStats(stats)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadLeads(); loadCallStats() }, [loadLeads, loadCallStats])

  const handleFixOtherLeads = async () => {
    let allOtherLeads: Lead[] = []
    try { const data = await apiFetch('leads', 'GET', 'select=*&country=eq.Other'); allOtherLeads = data || [] }
    catch { toast.error('Could not load leads'); return }
    if (allOtherLeads.length === 0) return toast('No "Other" leads found!', { icon: 'ℹ️' })
    setFixing(true)
    let fixed = 0, skipped = 0
    for (const lead of allOtherLeads) {
      const detected = detectCountryFromPhone(lead.phone)
      if (detected && detected !== 'Other') {
        try { await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { country: detected, updated_at: new Date().toISOString() }); fixed++ }
        catch { skipped++ }
      } else { skipped++ }
    }
    await loadLeads(); setFixing(false)
    if (fixed > 0) toast.success(`✅ ${fixed} leads fixed!${skipped > 0 ? ` (${skipped} still Other)` : ''}`)
    else toast(`No leads could be detected — ${skipped} still Other`, { icon: '⚠️' })
  }

  const filtered = leads.filter(l =>
    !search || l.phone.includes(search) || (l.country || '').toLowerCase().includes(search.toLowerCase())
  )

  const handlePhoneChange = (phone: string) => {
    const detectedCountry = detectCountryFromPhone(phone)
    setForm(prev => ({ ...prev, phone, country: detectedCountry }))
  }

  const handleActionClick = (lead: Lead, type: 'whatsapp_call' | 'whatsapp_chat' | 'viki') => {
    const phone = cleanPhone(lead.phone)
    if (type === 'whatsapp_call') window.open(`https://wa.me/${phone}`, '_blank')
    else if (type === 'whatsapp_chat') window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Assalamu Alaikum! Quran Hosting here. Are you interested in learning Quran?')}`, '_blank')
    else window.open(`viber://call?number=%2B${phone}`, '_blank')
    setCallAction({ lead, type })
  }

  // ─── handleCallConfirm now returns Promise<void> ─────────────────────────
  const handleCallConfirm = async (outcome: string, notes: string): Promise<void> => {
    if (!callAction) return
    const { lead, type } = callAction
    const today = todayStr()

    try {
      const callType = type === 'whatsapp_chat' ? 'chat' : type === 'viki' ? 'viki' : 'whatsapp'
      await apiFetch('call_logs', 'POST', 'select=*', {
        lead_id: lead.id, agent_id: user.id, agent_name: user.name,
        call_type: callType, call_date: today,
        outcome, notes: type === 'whatsapp_chat' ? `[Chat] ${notes}` : notes || null,
      })

      setCallStats(prev => {
        const cur = prev[lead.id] || { whatsapp: 0, viki: 0, chat: 0 }
        return {
          ...prev, [lead.id]: {
            whatsapp: type === 'whatsapp_call' ? cur.whatsapp + 1 : cur.whatsapp,
            viki: type === 'viki' ? cur.viki + 1 : cur.viki,
            chat: type === 'whatsapp_chat' ? cur.chat + 1 : cur.chat,
          }
        }
      })

      if (outcome === 'trial_booked' && lead.status !== 'trial_booked') {
        await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'trial_booked' })
        const existing = await apiFetch('trials', 'GET', `lead_id=eq.${lead.id}&select=id`).catch(() => [])
        if (!existing || existing.length === 0) {
          await apiFetch('trials', 'POST', 'select=*', {
            lead_id: lead.id, trial_date: today, created_by: user.id, completed: false, notes: notes || null,
          }).catch(() => null)
        }
        toast.success('✅ Trial booked! Added to the Trials page.')
        loadLeads()
      } else if (outcome === 'trial_done' && lead.status !== 'joined') {
        await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'trial_done' })
        await apiFetch('trials', 'PATCH', `lead_id=eq.${lead.id}&completed=eq.false`, { completed: true }).catch(() => null)
        toast.success('✅ Trial marked as done!')
        loadLeads()
      } else if (outcome === 'joined' && lead.status !== 'joined') {
        await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'joined', joined_date: today })
        await apiFetch('trials', 'PATCH', `lead_id=eq.${lead.id}`, { completed: true }).catch(() => null)
        // Auto-add to students
        const existingStudent = await apiFetch('students', 'GET', `lead_id=eq.${lead.id}&select=id`).catch(() => [])
        if (!existingStudent || existingStudent.length === 0) {
          await apiFetch('students', 'POST', 'select=*', {
            lead_id: lead.id, phone: lead.phone, country: lead.country,
            platform: lead.platform, joined_date: today,
            created_by: user.id, status: 'active', notes: notes || null,
          }).catch((e: any) => toast.error('Problem adding student: ' + (e?.message || '')))
        }
        toast.success('🎉 Student joined! Added to the Students page.')
        loadLeads()
      } else if (lead.status === 'new') {
        await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'contacted' })
        toast.success('Call logged!')
        loadLeads()
      } else {
        toast.success('Call logged!')
      }

      // Close modal only after success
      setCallAction(null)
    } catch (e: any) {
      toast.error('Could not save log: ' + (e?.message || 'error'))
      // Do NOT close modal on error — user can retry
      throw e // re-throw so CallLogModal resets submitting state
    }
  }

  const openAdd = () => { setEditLead(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (l: Lead) => { setEditLead(l); setForm({ phone: l.phone, country: l.country, platform: l.platform, status: l.status, notes: l.notes || '' }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.phone || !form.country) return toast.error('Phone and Country are required')
    setSaving(true)
    try {
      if (editLead) {
        const result = await apiFetch('leads', 'PATCH', `id=eq.${editLead.id}&select=*`, { ...form, updated_at: new Date().toISOString() })
        const updated = Array.isArray(result) ? result[0] : result
        setLeads(leads.map(l => l.id === editLead.id ? updated : l))
        toast.success('Lead updated!')
      } else {
        const result = await apiFetch('leads', 'POST', 'select=*', { ...form, created_by: user.id })
        const newLead = Array.isArray(result) ? result[0] : result
        setLeads([newLead, ...leads])
        toast.success('Lead added!')
      }
      setShowModal(false); setForm(EMPTY_FORM); setEditLead(null)
    } catch (e: any) { toast.error('Error: ' + (e?.message || 'Unknown')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    try { await apiFetch('leads', 'DELETE', `id=eq.${id}`); setLeads(leads.filter(l => l.id !== id)); toast.success('Deleted!') }
    catch { toast.error('Delete failed') }
  }

  const totalLeads = filtered.length
  const uniqueCountries = Array.from(new Set(leads.map(l => l.country).filter(Boolean))).sort()

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Leads</h1><p className="page-subtitle">Leads List</p></div>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} />Add Lead</button>
      </div>

      <CountryStatsPanel leads={leads} activeCountry={filterCountry} onSelectCountry={setFilterCountry} onFixOther={handleFixOtherLeads} fixing={fixing} />

      <div className="crm-card mb-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-500 font-medium">Action Buttons:</span>
          <span className="flex items-center gap-1.5 text-green-400"><Phone size={11} /> WA Call</span>
          <span className="flex items-center gap-1.5 text-emerald-400"><MessageSquare size={11} /> Chat</span>
          <span className="flex items-center gap-1.5 text-purple-400"><Headphones size={11} /> Viber</span>
          <span className="text-slate-600">| Counts = today's calls per lead</span>
        </div>
      </div>

      <div className="crm-card mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-500" />
            <input className="crm-input pl-9" placeholder="Search phone or country..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="crm-select w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="crm-select w-auto" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as any)}>
            <option value="">All Platforms</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="crm-select w-auto" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
            <option value="">🌍 All Countries</option>
            {uniqueCountries.map(c => <option key={c} value={c}>{COUNTRY_FLAG[c] || '🌍'} {c}</option>)}
          </select>
        </div>
      </div>

      <div className="crm-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Lead</th><th>Country</th><th>Platform</th><th>Status</th>
                  <th className="text-center text-green-400">📞 Today</th>
                  <th className="text-center text-emerald-400">💬 Today</th>
                  <th className="text-center text-purple-400">📳 Today</th>
                  <th>Actions</th><th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-slate-500">No leads found</td></tr>}
                {filtered.map((lead, idx) => {
                  const cs = callStats[lead.id] || { whatsapp: 0, viki: 0, chat: 0 }
                  const leadNumber = totalLeads - idx
                  return (
                    <tr key={lead.id}>
                      <td><span className="font-medium text-emerald-400">Lead {leadNumber}</span></td>
                      <td><span className="flex items-center gap-1.5"><span>{COUNTRY_FLAG[lead.country] || '🌍'}</span>{lead.country}</span></td>
                      <td>{lead.platform}</td>
                      <td><span className={statusBadge[lead.status]}>{STATUSES.find(s => s.value === lead.status)?.label}</span></td>
                      <td className="text-center"><span className={`font-bold text-sm ${cs.whatsapp > 0 ? 'text-green-400' : 'text-slate-700'}`}>{cs.whatsapp}</span></td>
                      <td className="text-center"><span className={`font-bold text-sm ${cs.chat > 0 ? 'text-emerald-400' : 'text-slate-700'}`}>{cs.chat}</span></td>
                      <td className="text-center"><span className={`font-bold text-sm ${cs.viki > 0 ? 'text-purple-400' : 'text-slate-700'}`}>{cs.viki}</span></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleActionClick(lead, 'whatsapp_call')}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all"
                            style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e', borderColor: 'rgba(34,197,94,.25)' }}>
                            <Phone size={10} /> WA
                          </button>
                          <button onClick={() => handleActionClick(lead, 'whatsapp_chat')}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all"
                            style={{ background: 'rgba(16,185,129,.1)', color: '#10b981', borderColor: 'rgba(16,185,129,.25)' }}>
                            <MessageSquare size={10} /> Chat
                          </button>
                          <button onClick={() => handleActionClick(lead, 'viki')}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all"
                            style={{ background: 'rgba(167,139,250,.1)', color: '#a78bfa', borderColor: 'rgba(167,139,250,.25)' }}>
                            <Headphones size={10} /> Viber
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewLead(lead)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"><Eye size={13} /></button>
                          <button onClick={() => openEdit(lead)} className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors"><Edit3 size={13} /></button>
                          <button onClick={() => handleDelete(lead.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {callAction && (
        <CallLogModal
          lead={callAction.lead}
          type={callAction.type}
          onConfirm={handleCallConfirm}
          onCancel={() => setCallAction(null)}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="font-semibold text-white">{editLead ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Phone Number *</label>
                <input className="crm-input" placeholder="+92300XXXXXXX" value={form.phone} onChange={e => handlePhoneChange(e.target.value)} />
                {form.phone.length >= 3 && <p className="text-xs text-emerald-500 mt-1">{COUNTRY_FLAG[form.country] || '🌍'} Auto-detected: <span className="font-semibold">{form.country}</span></p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Country *</label>
                  <select className="crm-select" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{COUNTRY_FLAG[c] || '🌍'} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Platform</label>
                  <select className="crm-select" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value as Platform })}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Status</label>
                <select className="crm-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as LeadStatus })}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Notes</label>
                <textarea className="crm-input resize-none" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-800">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editLead ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewLead && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="font-semibold text-white">Lead Details</h2>
              <button onClick={() => setViewLead(null)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-1">
              {[
                { label: 'Phone', value: viewLead.phone },
                { label: 'Country', value: <span>{COUNTRY_FLAG[viewLead.country] || '🌍'} {viewLead.country}</span> },
                { label: 'Platform', value: viewLead.platform },
                { label: 'Status', value: <span className={statusBadge[viewLead.status]}>{STATUSES.find(s => s.value === viewLead.status)?.label}</span> },
                { label: 'WA Calls Today', value: <span className="text-green-400 font-bold">{callStats[viewLead.id]?.whatsapp || 0}</span> },
                { label: 'Chats Today', value: <span className="text-emerald-400 font-bold">{callStats[viewLead.id]?.chat || 0}</span> },
                { label: 'Viber Today', value: <span className="text-purple-400 font-bold">{callStats[viewLead.id]?.viki || 0}</span> },
                { label: 'Notes', value: viewLead.notes || '—' },
                { label: 'Added', value: new Date(viewLead.created_at).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <span className="text-sm text-slate-200">{value}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button className="btn-primary flex-1 justify-center" onClick={() => { setViewLead(null); openEdit(viewLead) }}><Edit3 size={14} /> Edit</button>
              <button className="btn-secondary flex-1 justify-center" onClick={() => setViewLead(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}