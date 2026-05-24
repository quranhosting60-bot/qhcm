'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { type Lead, type Platform, type LeadStatus } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit3, Plus, Search, Phone, Globe, Eye, X, MessageSquare, Headphones, CheckCircle2, PhoneMissed } from 'lucide-react'

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

const PLATFORMS: Platform[] = ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'WhatsApp', 'Other']
const COUNTRIES = ['Pakistan', 'India', 'USA', 'UK', 'Canada', 'Australia', 'Saudi Arabia', 'UAE', 'Egypt', 'Bangladesh', 'Malaysia', 'Other']
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
  { value: 'joined', label: 'Joined' },
]

const statusColors: Record<LeadStatus, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  trial_booked: 'bg-yellow-100 text-yellow-700',
  trial_done: 'bg-purple-100 text-purple-700',
  joined: 'bg-green-100 text-green-700',
  not_joined: 'bg-red-100 text-red-700',
  lost: 'bg-red-100 text-red-700',
}

const cleanPhone = (phone: string) => phone.replace(/[\s\-\(\)\+]/g, '')

type FormData = {
  phone: string; country: string; platform: Platform; status: LeadStatus; notes: string;
}
const EMPTY_FORM: FormData = { phone: '', country: 'Pakistan', platform: 'Facebook', status: 'new', notes: '' }

type CallStats = Record<string, { whatsapp: number; viki: number; chat: number }>

function CallLogModal({ lead, type, onConfirm, onCancel }: {
  lead: Lead
  type: 'whatsapp_call' | 'whatsapp_chat' | 'viki'
  onConfirm: (outcome: string, notes: string) => void
  onCancel: () => void
}) {
  const [outcome, setOutcome] = useState('interested')
  const [notes, setNotes] = useState('')
  const config = {
    whatsapp_call: { label: 'WhatsApp Call', color: '#22c55e', icon: <Phone size={14} /> },
    whatsapp_chat: { label: 'WhatsApp Chat', color: '#10b981', icon: <MessageSquare size={14} /> },
    viki: { label: 'Viber Call', color: '#a78bfa', icon: <Headphones size={14} /> },
  }[type]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <span style={{ color: config.color }}>{config.icon}</span>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Log {config.label}</p>
              <p className="text-xs text-gray-500">Select outcome for this contact</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Outcome *</label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => (
                <button key={o.value} onClick={() => setOutcome(o.value)}
                  className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${outcome === o.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Notes (Optional)</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} placeholder="Any notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50" onClick={onCancel}>Cancel</button>
          <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold" onClick={() => onConfirm(outcome, notes)}>Save Log</button>
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
  const [showModal, setShowModal] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [viewLead, setViewLead] = useState<Lead | null>(null)
  const [callAction, setCallAction] = useState<{ lead: Lead; type: 'whatsapp_call' | 'whatsapp_chat' | 'viki' } | null>(null)
  const [callStats, setCallStats] = useState<CallStats>({})

  const loadLeads = useCallback(async () => {
    try {
      let params = 'select=*&order=created_at.desc'
      if (filterStatus) params += `&status=eq.${filterStatus}`
      if (filterPlatform) params += `&platform=eq.${filterPlatform}`
      const data = await apiFetch('leads', 'GET', params)
      setLeads(data || [])
    } catch (error: any) {
      toast.error('Failed to load leads: ' + (error?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterPlatform])

  useEffect(() => { loadLeads() }, [loadLeads])

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.phone.includes(search) || (l.country || '').toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  const handleActionClick = (lead: Lead, type: 'whatsapp_call' | 'whatsapp_chat' | 'viki') => {
    const phone = cleanPhone(lead.phone)
    if (type === 'whatsapp_call') {
      window.open(`https://wa.me/${phone}`, '_blank')
    } else if (type === 'whatsapp_chat') {
      const msg = encodeURIComponent('Assalamu Alaikum! Quran Hosting here. Are you interested in learning Quran?')
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
    } else {
      window.open(`viber://call?number=%2B${phone}`, '_blank')
    }
    setCallAction({ lead, type })
  }

  const handleCallConfirm = async (outcome: string, notes: string) => {
    if (!callAction) return
    const { lead, type } = callAction
    try {
      await apiFetch('call_logs', 'POST', 'select=*', {
        lead_id: lead.id,
        agent_id: user.id,
        agent_name: user.name,
        call_type: type === 'viki' ? 'viki' : 'whatsapp',
        call_date: new Date().toISOString().split('T')[0],
        outcome,
        notes: type === 'whatsapp_chat' ? `[Chat] ${notes}` : notes || null,
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
        loadLeads()
      } else if (outcome === 'joined' && lead.status !== 'joined') {
        await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'joined' })
        loadLeads()
      } else if (lead.status === 'new') {
        await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'contacted' })
        loadLeads()
      }
      toast.success('Call logged!')
    } catch (e: any) {
      toast.error('Could not save log: ' + (e?.message || 'error'))
    }
    setCallAction(null)
  }

  const openAdd = () => { setEditLead(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (l: Lead) => {
    setEditLead(l)
    setForm({ phone: l.phone, country: l.country, platform: l.platform, status: l.status, notes: l.notes || '' })
    setShowModal(true)
  }

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
      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditLead(null)
    } catch (e: any) {
      toast.error('Error: ' + (e?.message || 'Unknown'))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    try {
      await apiFetch('leads', 'DELETE', `id=eq.${id}`)
      setLeads(leads.filter(l => l.id !== id))
      toast.success('Deleted!')
    } catch { toast.error('Delete failed') }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Leads</h1>
          <p className="text-sm text-gray-500">Leads List</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border p-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="font-medium">Action Buttons:</span>
          <span className="flex items-center gap-1 text-green-600"><Phone size={11} /> WA Call</span>
          <span className="flex items-center gap-1 text-emerald-600"><MessageSquare size={11} /> Chat</span>
          <span className="flex items-center gap-1 text-purple-600"><Headphones size={11} /> Viber</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search phone or country..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as any)}>
            <option value="">All Platforms</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-green-600">WA Calls</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-emerald-600">Chat</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-purple-600">Viber</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">No leads found</td></tr>
                )}
                {filtered.map((lead, idx) => {
                  const stats = callStats[lead.id] || { whatsapp: 0, viki: 0, chat: 0 }
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-blue-600">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 flex items-center gap-1">
                        <Globe size={11} className="text-gray-400" />{lead.country}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{lead.platform}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[lead.status]}`}>
                          {STATUSES.find(s => s.value === lead.status)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-sm ${stats.whatsapp > 0 ? 'text-green-600' : 'text-gray-300'}`}>{stats.whatsapp}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-sm ${stats.chat > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{stats.chat}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold text-sm ${stats.viki > 0 ? 'text-purple-600' : 'text-gray-300'}`}>{stats.viki}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleActionClick(lead, 'whatsapp_call')}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100">
                            <Phone size={10} /> WA
                          </button>
                          <button onClick={() => handleActionClick(lead, 'whatsapp_chat')}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                            <MessageSquare size={10} /> Chat
                          </button>
                          <button onClick={() => handleActionClick(lead, 'viki')}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100">
                            <Headphones size={10} /> Viber
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setViewLead(lead)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => openEdit(lead)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => handleDelete(lead.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={13} />
                          </button>
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

      {/* Call Log Modal */}
      {callAction && (
        <CallLogModal lead={callAction.lead} type={callAction.type}
          onConfirm={handleCallConfirm} onCancel={() => setCallAction(null)} />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-gray-800">{editLead ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Phone Number *</label>
                <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+92300XXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Country *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Platform</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value as Platform })}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Status</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.status} onChange={e => setForm({ ...form, status: e.target.value as LeadStatus })}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Notes</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowModal(false)}>Cancel</button>
              <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                onClick={handleSave} disabled={saving}>
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editLead ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Lead Modal */}
      {viewLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-gray-800">Lead Details</h2>
              <button onClick={() => setViewLead(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-1">
              {[
                { label: 'Phone', value: viewLead.phone },
                { label: 'Country', value: viewLead.country },
                { label: 'Platform', value: viewLead.platform },
                { label: 'Status', value: <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[viewLead.status]}`}>{STATUSES.find(s => s.value === viewLead.status)?.label}</span> },
                { label: 'WA Calls', value: <span className="text-green-600 font-bold">{callStats[viewLead.id]?.whatsapp || 0}</span> },
                { label: 'WA Chat', value: <span className="text-emerald-600 font-bold">{callStats[viewLead.id]?.chat || 0}</span> },
                { label: 'Viber Calls', value: <span className="text-purple-600 font-bold">{callStats[viewLead.id]?.viki || 0}</span> },
                { label: 'Notes', value: viewLead.notes || '—' },
                { label: 'Added', value: new Date(viewLead.created_at).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-xs text-gray-500 font-medium">{label}</span>
                  <span className="text-sm text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                onClick={() => { setViewLead(null); openEdit(viewLead) }}>
                <Edit3 size={14} /> Edit
              </button>
              <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setViewLead(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}