'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { type Lead } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Calendar, TrendingUp, X, CheckCircle2, Clock } from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'

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
    throw new Error(err.message || err.details || `HTTP ${res.status}`)
  }
  if (method === 'DELETE') return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const today = format(new Date(), 'yyyy-MM-dd')

export default function TrialsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [trials, setTrials] = useState<any[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(today)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ lead_id: '', trial_date: today })

  useEffect(() => { loadData() }, [tab, selectedDate])

  const loadData = async () => {
    setLoading(true)
    try {
      let params = 'select=*&order=trial_date.desc'
      if (tab === 'daily') {
        params += `&trial_date=eq.${selectedDate}`
      } else if (tab === 'weekly') {
        const start = format(startOfWeek(new Date(selectedDate)), 'yyyy-MM-dd')
        const end = format(endOfWeek(new Date(selectedDate)), 'yyyy-MM-dd')
        params += `&trial_date=gte.${start}&trial_date=lte.${end}`
      } else {
        const m = selectedDate.slice(0, 7)
        params += `&trial_date=gte.${m}-01&trial_date=lte.${m}-31`
      }

      const [trialData, leadData] = await Promise.all([
        apiFetch('trials', 'GET', params),
        apiFetch('leads', 'GET', 'select=*&order=created_at.desc'),
      ])

      const list = trialData || []
      setTrials(list)
      setLeads(leadData || [])
      const completed = list.filter((t: any) => t.completed).length
      setStats({ total: list.length, completed, pending: list.length - completed })
    } catch (e: any) {
      toast.error('Failed to load trials: ' + (e?.message || 'error'))
    } finally { setLoading(false) }
  }

  const getLeadDisplay = (leadId: string) => {
    const idx = leads.findIndex(l => l.id === leadId)
    return idx >= 0 ? `Lead ${idx + 1}` : 'Unknown Lead'
  }

  const handleAdd = async () => {
    if (!form.lead_id) return toast.error('Please select a lead')
    setSaving(true)
    try {
      await apiFetch('trials', 'POST', 'select=*', {
        lead_id: form.lead_id,
        trial_date: form.trial_date,
        created_by: user.id,
        completed: false,
      })
      toast.success('Trial scheduled!')
      setShowModal(false)
      setForm({ lead_id: '', trial_date: today })
      loadData()
    } catch (e: any) {
      toast.error('Failed: ' + (e?.message || 'error'))
    } finally { setSaving(false) }
  }

  const toggleComplete = async (trial: any) => {
    try {
      await apiFetch('trials', 'PATCH', `id=eq.${trial.id}`, { completed: !trial.completed })
      setTrials(trials.map(t => t.id === trial.id ? { ...t, completed: !t.completed } : t))
      const updated = trials.map(t => t.id === trial.id ? { ...t, completed: !t.completed } : t)
      const completed = updated.filter(t => t.completed).length
      setStats({ total: updated.length, completed, pending: updated.length - completed })
      toast.success(trial.completed ? 'Marked as pending' : 'Marked as completed')
    } catch (e: any) {
      toast.error('Failed to update: ' + (e?.message || 'error'))
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trials Management</h1>
          <p className="page-subtitle">Schedule and track trial sessions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Add Trial
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Trials', val: stats.total, icon: Calendar, color: 'text-blue-400' },
          { label: 'Completed', val: stats.completed, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Pending', val: stats.pending, icon: Clock, color: 'text-yellow-400' },
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

      {/* Tabs + Date */}
      <div className="crm-card mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {(['daily', 'weekly', 'monthly'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
          <input
            type={tab === 'daily' ? 'date' : 'month'}
            className="crm-input w-auto"
            value={tab === 'daily' ? selectedDate : selectedDate.slice(0, 7)}
            onChange={e => setSelectedDate(tab === 'daily' ? e.target.value : e.target.value + '-01')}
          />
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
                  <th>Lead</th>
                  <th>Trial Date</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {trials.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-500">No trials scheduled</td></tr>}
                {trials.map(trial => (
                  <tr key={trial.id}>
                    <td><span className="font-bold text-emerald-400">{getLeadDisplay(trial.lead_id)}</span></td>
                    <td className="text-slate-300">{format(new Date(trial.trial_date), 'MMM dd, yyyy')}</td>
                    <td>
                      <span className={`badge ${trial.completed ? 'badge-green' : 'badge-yellow'}`}>
                        {trial.completed ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="text-slate-500 text-xs">{trial.notes || '—'}</td>
                    <td>
                      <button onClick={() => toggleComplete(trial)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${trial.completed ? 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600' : 'border-emerald-800 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40'}`}>
                        {trial.completed ? 'Mark Pending' : 'Mark Done'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Trial Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="font-semibold text-white">Schedule New Trial</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Lead *</label>
                <select className="crm-select" value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}>
                  <option value="">Select a lead...</option>
                  {leads.map((l, i) => (
                    <option key={l.id} value={l.id}>Lead {i + 1} — {l.phone}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Trial Date *</label>
                <input type="date" className="crm-input" value={form.trial_date} onChange={e => setForm({ ...form, trial_date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-800">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleAdd} disabled={saving}>
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}