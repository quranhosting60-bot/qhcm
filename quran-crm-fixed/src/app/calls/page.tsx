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
  { value: 'joined', label: 'Joined' },
]

const outcomeBadgeColors: Record<string, string> = {
  no_answer: 'bg-gray-100 text-gray-600',
  callback: 'bg-blue-100 text-blue-700',
  interested: 'bg-yellow-100 text-yellow-700',
  not_interested: 'bg-red-100 text-red-700',
  trial_booked: 'bg-purple-100 text-purple-700',
  joined: 'bg-green-100 text-green-700',
}

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)

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
    leadId: '', callType: 'whatsapp' as 'whatsapp' | 'viki',
    outcome: 'interested', duration: '', notes: '',
    date: today,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      let callParams = 'select=*&order=created_at.desc'
      if (viewMode === 'daily') {
        callParams += `&call_date=eq.${selectedDate}`
      } else {
        const month = selectedDate.slice(0, 7)
        callParams += `&call_date=gte.${month}-01&call_date=lte.${month}-31`
      }
      const [callData, leadData] = await Promise.all([
        apiFetch('call_logs', 'GET', callParams),
        apiFetch('leads', 'GET', 'select=*&order=created_at.desc'),
      ])
      setCalls(callData || [])
      setLeads(leadData || [])
    } catch (e: any) {
      toast.error('Failed to load: ' + (e?.message || 'error'))
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [selectedDate, viewMode])

  const getLeadDisplay = (leadId: string) => {
    const idx = leads.findIndex(l => l.id === leadId)
    if (idx >= 0) return `Lead ${idx + 1} — ${leads[idx].phone}`
    return 'Unknown Lead'
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
    } finally { setSaving(false) }
  }

  const whatsappCount = calls.filter(c => c.call_type === 'whatsapp').length
  const vikiCount = calls.filter(c => c.call_type === 'viki').length
  const answeredCount = calls.filter(c => c.outcome !== 'no_answer').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Call Log</h1>
          <p className="text-sm text-gray-500">Track all calls and chats</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['daily', 'monthly'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-colors ${viewMode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:text-gray-800'}`}>
                {m}
              </button>
            ))}
          </div>
          <input type={viewMode === 'daily' ? 'date' : 'month'}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={viewMode === 'daily' ? selectedDate : selectedDate.slice(0, 7)}
            onChange={e => setSelectedDate(viewMode === 'daily' ? e.target.value : e.target.value + '-01')} />
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm">
            <Plus size={16} /> Log Call
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Calls', val: calls.length, icon: Phone, color: 'text-blue-600' },
          { label: 'WhatsApp', val: whatsappCount, icon: MessageCircle, color: 'text-green-600' },
          { label: 'Viber', val: vikiCount, icon: Headphones, color: 'text-purple-600' },
          { label: 'Answered', val: answeredCount, icon: CheckCircle2, color: 'text-emerald-600' },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border p-4">
            <span className="text-xs text-gray-500">{label}</span>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-2xl font-bold ${color}`}>{val}</span>
              <Icon size={18} className={`${color} opacity-40`} />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Lead', 'Agent', 'Type', 'Date', 'Duration', 'Outcome', 'Notes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {calls.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No calls found for this period</td></tr>
                )}
                {calls.map(call => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{getLeadDisplay(call.lead_id)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{call.agent_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${call.call_type === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                        {call.call_type === 'whatsapp' ? 'WhatsApp' : 'Viber'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{call.call_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{call.duration ? `${call.duration} min` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${outcomeBadgeColors[call.outcome] || 'bg-gray-100 text-gray-600'}`}>
                        {OUTCOMES.find(o => o.value === call.outcome)?.label || call.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{call.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Call Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-gray-800">Log a Call</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Lead *</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.leadId} onChange={e => setForm({ ...form, leadId: e.target.value })}>
                  <option value="">Select a lead...</option>
                  {leads.map((l, i) => (
                    <option key={l.id} value={l.id}>Lead {i + 1} — {l.phone}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Call Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.callType} onChange={e => setForm({ ...form, callType: e.target.value as any })}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="viki">Viber</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Outcome</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })}>
                    {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Duration (min)</label>
                  <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Notes</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowModal(false)}>Cancel</button>
              <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                onClick={handleSave} disabled={saving}>
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