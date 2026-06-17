"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Target, Plus, CheckCircle2, Clock, X, User, TrendingUp, Trash2, Edit3, BookOpen, GraduationCap } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function apiFetch(table: string, method = 'GET', params = '', body?: any) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json', Accept: 'application/json',
    'Accept-Profile': 'public', 'Content-Profile': 'public',
  }
  if (method === 'POST') headers['Prefer'] = 'return=representation'
  if (method === 'PATCH') headers['Prefer'] = 'return=representation'
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.details || `HTTP ${res.status}`) }
  if (method === 'DELETE') return null
  const text = await res.text(); return text ? JSON.parse(text) : null
}

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

type TargetWithProgress = {
  id: string
  agent_id: string
  agent_name: string
  lead_id_from: string
  lead_id_to: string
  target_calls: number
  date: string
  completed: boolean
  calls_done: number   // real count from call_logs
}

const EMPTY_FORM = { agent_name: '', lead_id_from: '', lead_id_to: '', target_calls: '' }

export default function TargetsPage() {
  const { user, isAdmin } = useAuth()
  const [targets, setTargets] = useState<TargetWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<TargetWithProgress | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  // For multi-assign: list of agents being added
  const [agents, setAgents] = useState([{ ...EMPTY_FORM }])

  // Company-wide info for the selected date (not per-agent, not a target — just progress info)
  const [dayInfo, setDayInfo] = useState({ trialsBooked: 0, studentsJoined: 0 })

  const loadTargets = async () => {
    setLoading(true)
    try {
      // Load targets for selected date
      const targetsData = await apiFetch('daily_targets', 'GET', `select=*&date=eq.${selectedDate}&order=created_at.desc`)

      // Load call counts per agent for this date (from call_logs) — call_date is the correct column
      const callLogs = await apiFetch('call_logs', 'GET', `select=agent_id,agent_name&call_date=eq.${selectedDate}`).catch(() => [])

      // Load company-wide trials booked on this date
      const trialsToday = await apiFetch('trials', 'GET', `select=id&trial_date=eq.${selectedDate}`).catch(() => [])

      // Load company-wide students joined on this date
      const studentsToday = await apiFetch('leads', 'GET', `select=id&status=eq.joined&joined_date=eq.${selectedDate}`).catch(() => [])

      setDayInfo({
        trialsBooked: (trialsToday || []).length,
        studentsJoined: (studentsToday || []).length,
      })

      if (!targetsData || targetsData.length === 0) { setTargets([]); setLoading(false); return }

      // Count calls per agent
      const callCount: Record<string, number> = {}
      for (const log of (callLogs || [])) {
        const key = log.agent_id || log.agent_name
        callCount[key] = (callCount[key] || 0) + 1
      }

      // Merge
      const merged: TargetWithProgress[] = targetsData.map((t: any) => {
        const key = t.agent_id || t.agent_name
        const calls_done = callCount[key] || 0
        const completed = calls_done >= (t.target_calls || 0)
        return { ...t, calls_done, completed }
      })

      // Auto-update completed status in DB if changed
      for (const t of merged) {
        if (t.completed !== targetsData.find((d: any) => d.id === t.id)?.completed) {
          await apiFetch('daily_targets', 'PATCH', `id=eq.${t.id}`, { completed: t.completed }).catch(() => null)
        }
      }

      setTargets(merged)
    } catch (e: any) {
      toast.error('Load failed: ' + (e?.message || 'error'))
      setTargets([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadTargets() }, [selectedDate])

  // ── Save single or multiple targets ──────────────────────────────────────
  const handleSave = async () => {
    const list = editTarget ? [form] : agents
    for (const a of list) {
      if (!a.agent_name.trim() || !a.lead_id_from.trim() || !a.lead_id_to.trim()) {
        return toast.error('Please fill in all fields — agent name, lead from/to are required')
      }
    }
    setSaving(true)
    try {
      if (editTarget) {
        await apiFetch('daily_targets', 'PATCH', `id=eq.${editTarget.id}`, {
          agent_name: form.agent_name,
          lead_id_from: form.lead_id_from,
          lead_id_to: form.lead_id_to,
          target_calls: Number(form.target_calls),
        })
        toast.success('Target updated!')
      } else {
        for (const a of agents) {
          // Check existing target for this agent on this date
          const existing = await apiFetch('daily_targets', 'GET',
            `agent_name=eq.${encodeURIComponent(a.agent_name)}&date=eq.${selectedDate}&select=id`
          ).catch(() => [])

          if (existing && existing.length > 0) {
            // Update existing
            await apiFetch('daily_targets', 'PATCH', `id=eq.${existing[0].id}`, {
              lead_id_from: a.lead_id_from,
              lead_id_to: a.lead_id_to,
              target_calls: Number(a.target_calls),
              completed: false,
            })
          } else {
            await apiFetch('daily_targets', 'POST', 'select=*', {
              agent_id: a.agent_name.toLowerCase().replace(/\s+/g, '_'),
              agent_name: a.agent_name,
              lead_id_from: a.lead_id_from,
              lead_id_to: a.lead_id_to,
              target_calls: Number(a.target_calls),
              date: selectedDate,
              completed: false,
            })
          }
        }
        toast.success(`${agents.length} target(s) set!`)
      }
      setShowModal(false)
      setEditTarget(null)
      setForm(EMPTY_FORM)
      setAgents([{ ...EMPTY_FORM }])
      loadTargets()
    } catch (e: any) { toast.error('Error: ' + (e?.message || 'Unknown')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this target?')) return
    try { await apiFetch('daily_targets', 'DELETE', `id=eq.${id}`); toast.success('Deleted!'); loadTargets() }
    catch { toast.error('Delete failed') }
  }

  const openEdit = (t: TargetWithProgress) => {
    setEditTarget(t)
    setForm({ agent_name: t.agent_name, lead_id_from: t.lead_id_from, lead_id_to: t.lead_id_to, target_calls: String(t.target_calls) })
    setShowModal(true)
  }

  const openAdd = () => { setEditTarget(null); setAgents([{ ...EMPTY_FORM }]); setShowModal(true) }

  const addAgentRow = () => setAgents(prev => [...prev, { ...EMPTY_FORM }])
  const removeAgentRow = (i: number) => setAgents(prev => prev.filter((_, idx) => idx !== i))
  const updateAgent = (i: number, field: string, val: string) =>
    setAgents(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))

  const totalTarget = targets.reduce((s, t) => s + t.target_calls, 0)
  const totalDone = targets.reduce((s, t) => s + t.calls_done, 0)
  const completedCount = targets.filter(t => t.completed).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Targets</h1>
          <p className="page-subtitle">Assign lead ranges and call targets to agents — separate for each day</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input type="date" className="crm-input w-auto" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          {isAdmin && <button className="btn-primary" onClick={openAdd}><Plus size={16} />Assign Targets</button>}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total Agents", val: targets.length, icon: User, color: "text-blue-400" },
          { label: "Total Target Calls", val: totalTarget, icon: Target, color: "text-amber-400" },
          { label: "Calls Done (Selected Date)", val: totalDone, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Targets Completed", val: `${completedCount}/${targets.length}`, icon: CheckCircle2, color: "text-pink-400" },
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

      {/* Company-wide info: trials + students for this date (informational, not a target) */}
      <div className="crm-card mb-5 border border-slate-700/60">
        <p className="text-xs text-slate-500 mb-3">
          Results generated automatically from calls — {format(new Date(selectedDate + 'T00:00:00'), 'd MMM yyyy')}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-900/20 flex items-center justify-center">
              <BookOpen size={18} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-yellow-400">{dayInfo.trialsBooked}</p>
              <p className="text-xs text-slate-500">Trials Booked</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/20 flex items-center justify-center">
              <GraduationCap size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{dayInfo.studentsJoined}</p>
              <p className="text-xs text-slate-500">Students Joined</p>
            </div>
          </div>
        </div>
      </div>

      {/* Target Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : targets.length === 0 ? (
        <div className="crm-card text-center py-16 text-slate-500">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-1">No target set for this date</p>
          <p className="text-xs text-slate-600 mb-4">Change the date above or assign a new target</p>
          {isAdmin && <button className="btn-primary mx-auto" onClick={openAdd}><Plus size={14} />Assign Targets</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map(target => {
            const pct = Math.min(100, target.target_calls > 0 ? Math.round((target.calls_done / target.target_calls) * 100) : 0)
            const remaining = Math.max(0, target.target_calls - target.calls_done)
            return (
              <div key={target.id}
                className={`crm-card border transition-all ${target.completed ? 'border-emerald-700/60 bg-emerald-900/5' : 'border-slate-700/60'}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${target.completed ? 'bg-emerald-700' : 'bg-slate-700'}`}>
                      {target.agent_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{target.agent_name}</p>
                      <p className="text-xs text-slate-500">{format(new Date(target.date + 'T00:00:00'), 'd MMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {target.completed
                      ? <span className="badge badge-green"><CheckCircle2 size={10} className="mr-1 inline" />Done ✅</span>
                      : <span className="badge badge-yellow"><Clock size={10} className="mr-1 inline" />In Progress</span>
                    }
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(target)} className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors"><Edit3 size={12} /></button>
                        <button onClick={() => handleDelete(target.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-0 text-sm mb-4">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-500 text-xs">Lead Range</span>
                    <span className="font-mono text-blue-400 text-xs">{target.lead_id_from} → {target.lead_id_to}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-500 text-xs">Target Calls</span>
                    <span className="font-bold text-amber-400">{target.target_calls}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 text-xs">Calls Done</span>
                    <span className={`font-bold ${target.calls_done > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{target.calls_done}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Progress</span>
                    <span className={`font-semibold ${target.completed ? 'text-emerald-400' : 'text-amber-400'}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${target.completed ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-amber-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1.5">
                    {target.completed
                      ? <span className="text-emerald-400 font-semibold">🎉 Target complete!</span>
                      : <span className="text-slate-500">{remaining} more calls needed</span>
                    }
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — Add Multiple / Edit Single */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="font-semibold text-white">{editTarget ? 'Edit Target' : 'Assign Targets'}</h2>
                {!editTarget && <p className="text-xs text-slate-500 mt-0.5">Assign targets to multiple agents at once</p>}
              </div>
              <button onClick={() => { setShowModal(false); setEditTarget(null); setAgents([{ ...EMPTY_FORM }]) }} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Date */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Date</label>
                <input type="date" className="crm-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>

              {editTarget ? (
                /* Single edit form */
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">Agent Name</label>
                    <input className="crm-input" value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-400 mb-1.5 block">Lead From *</label>
                      <input className="crm-input" placeholder="Lead 1" value={form.lead_id_from} onChange={e => setForm({ ...form, lead_id_from: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 mb-1.5 block">Lead To *</label>
                      <input className="crm-input" placeholder="Lead 50" value={form.lead_id_to} onChange={e => setForm({ ...form, lead_id_to: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 mb-1.5 block">Target Calls</label>
                      <input type="number" className="crm-input" value={form.target_calls} onChange={e => setForm({ ...form, target_calls: e.target.value })} />
                    </div>
                  </div>
                </>
              ) : (
                /* Multi-agent rows */
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 font-medium px-1">
                    <span>Agent Name *</span><span>Lead From *</span><span>Lead To *</span><span>Target Calls</span>
                  </div>
                  {agents.map((agent, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
                      <input className="crm-input text-sm" placeholder="Ahmed" value={agent.agent_name}
                        onChange={e => updateAgent(i, 'agent_name', e.target.value)} />
                      <input className="crm-input text-sm" placeholder="Lead 1" value={agent.lead_id_from}
                        onChange={e => updateAgent(i, 'lead_id_from', e.target.value)} />
                      <input className="crm-input text-sm" placeholder="Lead 50" value={agent.lead_id_to}
                        onChange={e => updateAgent(i, 'lead_id_to', e.target.value)} />
                      <div className="flex gap-1.5 items-center">
                        <input type="number" className="crm-input text-sm flex-1" placeholder="e.g. 25" value={agent.target_calls}
                          onChange={e => updateAgent(i, 'target_calls', e.target.value)} />
                        {agents.length > 1 && (
                          <button onClick={() => removeAgentRow(i)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={addAgentRow}
                    className="w-full py-2 border border-dashed border-slate-600 rounded-xl text-xs text-slate-400 hover:border-emerald-600 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1.5">
                    <Plus size={13} /> Add Agent
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-800">
              <button className="btn-secondary flex-1 justify-center" onClick={() => { setShowModal(false); setEditTarget(null); setAgents([{ ...EMPTY_FORM }]) }}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editTarget ? 'Update' : `Save ${agents.length} Target${agents.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}