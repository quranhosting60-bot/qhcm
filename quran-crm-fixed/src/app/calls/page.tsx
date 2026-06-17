'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { type Lead } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Phone, MessageCircle, Headphones, Plus, X, CheckCircle2 } from 'lucide-react'

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
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || err.details || `HTTP ${res.status}`)
  }
  if (method === 'DELETE') return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const OUTCOMES = [
  { value: 'no_answer', label: 'No Answer' },
  { value: 'callback', label: 'Call Back Later' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'trial_booked', label: 'Trial Booked' },
  { value: 'trial_done', label: 'Trial Done' },
  { value: 'joined', label: 'Joined' },
]

const outcomeBadge: Record<string, string> = {
  no_answer: 'badge badge-gray',
  callback: 'badge badge-blue',
  interested: 'badge badge-yellow',
  not_interested: 'badge badge-red',
  trial_booked: 'badge badge-purple',
  trial_done: 'badge badge-purple',
  joined: 'badge badge-green',
}

const getTodayString = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today = getTodayString()

// ─── Per-lead summary row in the calls table ─────────────────────────────────
function LeadCallSummary({ leadId, calls, leadNumber }: {
  leadId: string
  calls: any[]
  leadNumber: number
}) {
  const [open, setOpen] = useState(false)
  const total = calls.length
  const wa = calls.filter(c => c.call_type === 'whatsapp' && !c.notes?.startsWith('[Chat]')).length
  const chat = calls.filter(c => c.notes?.startsWith('[Chat]')).length
  const viber = calls.filter(c => c.call_type === 'viki').length
  const lastOutcome = calls[0]?.outcome || ''

  return (
    <>
      {/* Summary row */}
      <tr
        className="cursor-pointer hover:bg-slate-800/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td>
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
            <span className="font-bold text-emerald-400">Lead {leadNumber}</span>
          </div>
        </td>
        <td className="text-slate-400 text-xs">—</td>
        <td>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
              <Phone size={10} /> {wa} WA
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
              <MessageCircle size={10} /> {chat} Chat
            </span>
            <span className="flex items-center gap-1 text-xs text-purple-400 font-semibold">
              <Headphones size={10} /> {viber} Viber
            </span>
          </div>
        </td>
        <td>
          <span className="text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded-full">{total} calls</span>
        </td>
        <td>
          {lastOutcome && (
            <span className={outcomeBadge[lastOutcome] || 'badge badge-gray'}>
              {OUTCOMES.find(o => o.value === lastOutcome)?.label || lastOutcome}
            </span>
          )}
        </td>
        <td colSpan={2} className="text-xs text-slate-600 italic">
          {open ? 'Hide details ▲' : 'Click to expand ▼'}
        </td>
      </tr>

      {/* Expanded detail rows */}
      {open && calls.map((call, i) => (
        <tr key={call.id} className="bg-slate-800/30">
          <td className="pl-8">
            <span className="text-xs text-slate-500">#{i + 1}</span>
          </td>
          <td className="text-slate-400 text-xs">{call.agent_name}</td>
          <td>
            <span className={`badge ${call.call_type === 'whatsapp' ? 'badge-green' : 'badge-purple'}`}>
              {call.notes?.startsWith('[Chat]') ? 'Chat' : call.call_type === 'whatsapp' ? 'WhatsApp' : 'Viber'}
            </span>
          </td>
          <td className="text-slate-400 text-xs">{call.call_date}</td>
          <td className="text-slate-400 text-xs">{call.duration ? `${call.duration} min` : '—'}</td>
          <td>
            <span className={outcomeBadge[call.outcome] || 'badge badge-gray'}>
              {OUTCOMES.find(o => o.value === call.outcome)?.label || call.outcome}
            </span>
          </td>
          <td className="text-slate-500 text-xs max-w-xs truncate">{call.notes || '—'}</td>
        </tr>
      ))}
    </>
  )
}

export default function CallsPage() {
  const { user } = useAuth()
  const [calls, setCalls] = useState<any[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(today)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    leadId: '',
    callType: 'whatsapp' as 'whatsapp' | 'viki',
    outcome: 'interested',
    duration: '',
    notes: '',
    date: today,
  })

  // Leads sorted by created_at desc — same as leads page
  // leadNumber = totalLeads - index (just like leads page)
  const totalLeads = leads.length

  const getLeadInfo = (leadId: string) => {
    const idx = leads.findIndex(l => l.id === leadId)
    if (idx < 0) return { number: '?' }
    return { number: totalLeads - idx }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      let callParams = 'select=*&order=created_at.desc'

      if (viewMode === 'daily') {
        callParams += `&call_date=eq.${selectedDate}`
      } else {
        const m = selectedDate.slice(0, 7)
        const [year, month] = m.split('-').map(Number)
        const lastDay = new Date(year, month, 0).getDate()
        const lastDate = `${m}-${String(lastDay).padStart(2, '0')}`
        callParams += `&call_date=gte.${m}-01&call_date=lte.${lastDate}`
      }

      const [callData, leadData] = await Promise.all([
        apiFetch('call_logs', 'GET', callParams),
        apiFetch('leads', 'GET', 'select=*&order=created_at.desc'),
      ])
      setCalls(callData || [])
      setLeads(leadData || [])
    } catch (e: any) {
      toast.error('Failed to load: ' + (e?.message || 'error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [selectedDate, viewMode])

  // Group calls by lead_id, preserve order of first appearance
  const groupedByLead: { leadId: string; calls: any[] }[] = []
  const seen = new Set<string>()
  for (const call of calls) {
    if (!seen.has(call.lead_id)) {
      seen.add(call.lead_id)
      groupedByLead.push({ leadId: call.lead_id, calls: [] })
    }
    groupedByLead.find(g => g.leadId === call.lead_id)!.calls.push(call)
  }

  const handleSave = async () => {
    if (!form.leadId) return toast.error('Please select a lead')
    setSaving(true)
    try {
      await apiFetch('call_logs', 'POST', 'select=*', {
        lead_id: form.leadId,
        agent_id: user.id,
        agent_name: user.name,
        call_type: form.callType,
        call_date: form.date,
        duration: form.duration ? Number(form.duration) : null,
        outcome: form.outcome,
        notes: form.notes || null,
      })
      toast.success('Call logged!')
      setShowModal(false)
      setForm({ leadId: '', callType: 'whatsapp', outcome: 'interested', duration: '', notes: '', date: today })
      loadData()
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || 'Unknown'))
    } finally {
      setSaving(false)
    }
  }

  const whatsappCount = calls.filter(c => c.call_type === 'whatsapp' && !c.notes?.startsWith('[Chat]')).length
  const chatCount = calls.filter(c => c.notes?.startsWith('[Chat]')).length
  const vikiCount = calls.filter(c => c.call_type === 'viki').length
  const answeredCount = calls.filter(c => c.outcome !== 'no_answer').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Call Log</h1>
          <p className="page-subtitle">Track all calls and chats</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {(['daily', 'monthly'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-colors ${viewMode === m ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>
          <input
            type={viewMode === 'daily' ? 'date' : 'month'}
            className="crm-input w-auto"
            value={viewMode === 'daily' ? selectedDate : selectedDate.slice(0, 7)}
            onChange={e => setSelectedDate(viewMode === 'daily' ? e.target.value : e.target.value + '-01')}
          />
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} />Log Call</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
        {[
          { label: 'Total Calls', val: calls.length, icon: Phone, color: 'text-emerald-400' },
          { label: 'WhatsApp', val: whatsappCount, icon: Phone, color: 'text-green-400' },
          { label: 'Chat', val: chatCount, icon: MessageCircle, color: 'text-emerald-400' },
          { label: 'Viber', val: vikiCount, icon: Headphones, color: 'text-purple-400' },
          { label: 'Answered', val: answeredCount, icon: CheckCircle2, color: 'text-blue-400' },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <span className="text-xs text-slate-500">{label}</span>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-2xl font-bold ${color}`}>{val}</span>
              <Icon size={18} className={`${color} opacity-50`} />
            </div>
          </div>
        ))}
      </div>

      {/* Table — grouped by lead */}
      <div className="crm-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Lead #</th>
                  <th>Agent</th>
                  <th>Breakdown</th>
                  <th>Total</th>
                  <th>Last Outcome</th>
                  <th>Date / Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {groupedByLead.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500">No calls found for this period</td></tr>
                )}
                {groupedByLead.map(({ leadId, calls: leadCalls }) => {
                  const info = getLeadInfo(leadId)
                  return (
                    <LeadCallSummary
                      key={leadId}
                      leadId={leadId}
                      calls={leadCalls}
                      leadNumber={info.number as number}
                    />
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Call Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="font-semibold text-white">Log a Call</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Lead *</label>
                <select className="crm-select" value={form.leadId} onChange={e => setForm({ ...form, leadId: e.target.value })}>
                  <option value="">Select a lead...</option>
                  {leads.map((l, i) => (
                    <option key={l.id} value={l.id}>Lead {totalLeads - i}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Call Type</label>
                  <select className="crm-select" value={form.callType} onChange={e => setForm({ ...form, callType: e.target.value as any })}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="viki">Viber</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Date</label>
                  <input type="date" className="crm-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Outcome</label>
                  <select className="crm-select" value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })}>
                    {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Duration (min)</label>
                  <input type="number" className="crm-input" placeholder="5" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Notes</label>
                <textarea className="crm-input resize-none" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-800">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Phone size={14} />}
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}