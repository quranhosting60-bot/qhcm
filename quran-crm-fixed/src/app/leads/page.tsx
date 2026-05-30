'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { type Lead, type Platform, type LeadStatus } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit3, Plus, Search, Phone, Globe, Eye, X, MessageSquare, Headphones } from 'lucide-react'

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

type FormData = { phone: string; country: string; platform: Platform; status: LeadStatus; notes: string }
const EMPTY_FORM: FormData = { phone: '', country: 'Pakistan', platform: 'Facebook', status: 'new', notes: '' }
type CallStats = Record<string, { whatsapp: number; viki: number; chat: number }>

function CallLogModal({ lead, type, onConfirm, onCancel }: {
  lead: Lead; type: 'whatsapp_call' | 'whatsapp_chat' | 'viki'
  onConfirm: (outcome: string, notes: string) => void; onCancel: () => void
}) {
  const [outcome, setOutcome] = useState('interested')
  const [notes, setNotes] = useState('')
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
              <p className="text-xs text-slate-500 mt-0.5">Select outcome for this contact</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block">Outcome *</label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => (
                <button key={o.value} onClick={() => setOutcome(o.value)}
                  className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${outcome === o.value ? 'border-emerald-600 bg-emerald-900/20 text-emerald-300' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Notes (Optional)</label>
            <textarea className="crm-input resize-none" rows={2} placeholder="Any notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button className="btn-secondary flex-1 justify-center" onClick={onCancel}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => onConfirm(outcome, notes)}>Save Log</button>
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
    } catch (e: any) {
      toast.error('Failed to load leads: ' + (e?.message || 'error'))
    } finally { setLoading(false) }
  }, [filterStatus, filterPlatform])

  useEffect(() => { loadLeads() }, [loadLeads])

  const filtered = leads.filter(l =>
    !search || l.phone.includes(search) || (l.country || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleActionClick = (lead: Lead, type: 'whatsapp_call' | 'whatsapp_chat' | 'viki') => {
    const phone = cleanPhone(lead.phone)
    if (type === 'whatsapp_call') window.open(`https://wa.me/${phone}`, '_blank')
    else if (type === 'whatsapp_chat') window.open(`https://wa.me/${phone}?text=${encodeURIComponent('Assalamu Alaikum! Quran Hosting here. Are you interested in learning Quran?')}`, '_blank')
    else window.open(`viber://call?number=%2B${phone}`, '_blank')
    setCallAction({ lead, type })
  }

  const handleCallConfirm = async (outcome: string, notes: string) => {
    if (!callAction) return
    const { lead, type } = callAction
    try {
      await apiFetch('call_logs', 'POST', 'select=*', {
        lead_id: lead.id, agent_id: user.id, agent_name: user.name,
        call_type: type === 'viki' ? 'viki' : 'whatsapp',
        call_date: new Date().toISOString().split('T')[0],
        outcome, notes: type === 'whatsapp_chat' ? `[Chat] ${notes}` : notes || null,
      })
      setCallStats(prev => {
        const cur = prev[lead.id] || { whatsapp: 0, viki: 0, chat: 0 }
        return { ...prev, [lead.id]: { whatsapp: type === 'whatsapp_call' ? cur.whatsapp + 1 : cur.whatsapp, viki: type === 'viki' ? cur.viki + 1 : cur.viki, chat: type === 'whatsapp_chat' ? cur.chat + 1 : cur.chat } }
      })
      if (outcome === 'trial_booked' && lead.status !== 'trial_booked') { await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'trial_booked' }); loadLeads() }
      else if (outcome === 'joined' && lead.status !== 'joined') { await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'joined' }); loadLeads() }
      else if (lead.status === 'new') { await apiFetch('leads', 'PATCH', `id=eq.${lead.id}`, { status: 'contacted' }); loadLeads() }
      toast.success('Call logged!')
    } catch (e: any) { toast.error('Could not save log: ' + (e?.message || 'error')) }
    setCallAction(null)
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Leads List</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} />Add Lead</button>
      </div>

      {/* Legend */}
      <div className="crm-card mb-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-slate-500 font-medium">Action Buttons:</span>
          <span className="flex items-center gap-1.5 text-green-400"><Phone size={11} /> WA Call</span>
          <span className="flex items-center gap-1.5 text-emerald-400"><MessageSquare size={11} /> Chat</span>
          <span className="flex items-center gap-1.5 text-purple-400"><Headphones size={11} /> Viber</span>
        </div>
      </div>

      {/* Filters */}
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
        </div>
      </div>

      {/* Table */}
      <div className="crm-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Lead</th><th>Country</th><th>Platform</th><th>Status</th>
                  <th className="text-center text-green-400">WA Calls</th>
                  <th className="text-center text-emerald-400">Chat</th>
                  <th className="text-center text-purple-400">Viber</th>
                  <th>Actions</th><th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-slate-500">No leads found</td></tr>}
                {filtered.map((lead, idx) => {
                  const stats = callStats[lead.id] || { whatsapp: 0, viki: 0, chat: 0 }
                  return (
                    <tr key={lead.id}>
                      
                      <td><span className="font-medium text-emerald-400">Lead {idx + 1}</span></td>
                      <td><span className="flex items-center gap-1.5"><Globe size={11} className="text-slate-500" />{lead.country}</span></td>
                      <td>{lead.platform}</td>
                      <td><span className={statusBadge[lead.status]}>{STATUSES.find(s => s.value === lead.status)?.label}</span></td>
                      <td className="text-center"><span className={`font-bold ${stats.whatsapp > 0 ? 'text-green-400' : 'text-slate-700'}`}>{stats.whatsapp}</span></td>
                      <td className="text-center"><span className={`font-bold ${stats.chat > 0 ? 'text-emerald-400' : 'text-slate-700'}`}>{stats.chat}</span></td>
                      <td className="text-center"><span className={`font-bold ${stats.viki > 0 ? 'text-purple-400' : 'text-slate-700'}`}>{stats.viki}</span></td>
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

      {/* Call Log Modal */}
      {callAction && <CallLogModal lead={callAction.lead} type={callAction.type} onConfirm={handleCallConfirm} onCancel={() => setCallAction(null)} />}

      {/* Add/Edit Modal */}
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
                <input className="crm-input" placeholder="+92300XXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Country *</label>
                  <select className="crm-select" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
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

      {/* View Lead Modal */}
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
                { label: 'Country', value: viewLead.country },
                { label: 'Platform', value: viewLead.platform },
                { label: 'Status', value: <span className={statusBadge[viewLead.status]}>{STATUSES.find(s => s.value === viewLead.status)?.label}</span> },
                { label: 'WA Calls', value: <span className="text-green-400 font-bold">{callStats[viewLead.id]?.whatsapp || 0}</span> },
                { label: 'WA Chat', value: <span className="text-emerald-400 font-bold">{callStats[viewLead.id]?.chat || 0}</span> },
                { label: 'Viber Calls', value: <span className="text-purple-400 font-bold">{callStats[viewLead.id]?.viki || 0}</span> },
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