"use client";
import { useEffect, useState } from "react";
import { type Lead } from "@/lib/supabase";
import { format, startOfWeek, endOfWeek } from "date-fns";
import toast from "react-hot-toast";
import { DollarSign, CheckCircle2, XCircle, Edit3, X, Search, Plus, Calendar } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function apiFetch(table: string, method = 'GET', params = '', body?: any) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json', Accept: 'application/json',
    'Accept-Profile': 'public', 'Content-Profile': 'public',
  }
  if (method === 'PATCH' || method === 'POST') headers['Prefer'] = 'return=representation'
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.details || `HTTP ${res.status}`) }
  const text = await res.text(); return text ? JSON.parse(text) : null
}

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const today = todayStr()

const COUNTRY_FLAG: Record<string, string> = {
  'Pakistan': '🇵🇰', 'India': '🇮🇳', 'USA': '🇺🇸', 'UK': '🇬🇧', 'Canada': '🇨🇦',
  'Australia': '🇦🇺', 'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪', 'Qatar': '🇶🇦',
  'Kuwait': '🇰🇼', 'Egypt': '🇪🇬', 'Bangladesh': '🇧🇩', 'Malaysia': '🇲🇾', 'Other': '🌍',
}

// Roll number is stored prefixed onto the phone field, e.g. "R12 | 03001234567"
// for legacy records created before this simplified form (kept for backward compatibility).
const ROLL_SEPARATOR = ' | '
function splitRollAndPhone(raw: string): { roll: string; phone: string } {
  if (raw && raw.includes(ROLL_SEPARATOR)) {
    const idx = raw.indexOf(ROLL_SEPARATOR)
    return { roll: raw.slice(0, idx).trim(), phone: raw.slice(idx + ROLL_SEPARATOR.length).trim() }
  }
  return { roll: '', phone: raw || '' }
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editFee, setEditFee] = useState<{ lead: Lead; fee: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Date-wise check (daily / weekly / monthly) — same pattern as Trials page
  const [tab, setTab] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [selectedDate, setSelectedDate] = useState(today);

  // Add Student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ roll: '', fee: '' });
  const [addSaving, setAddSaving] = useState(false);

  const loadStudents = async () => {
    try {
      // Students = leads with status joined, ordered by joined_date desc
      const data = await apiFetch('leads', 'GET', 'select=*&status=eq.joined&order=joined_date.desc.nullslast,created_at.desc')
      setStudents(data || []);
    } catch (e: any) {
      toast.error("Failed to load: " + (e?.message || 'error'));
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStudents(); }, []);

  const getJoinDateStr = (s: Lead) => (s.joined_date || s.created_at || '').slice(0, 10);

  const dateFiltered = students.filter(s => {
    if (tab === 'all') return true
    const d = getJoinDateStr(s)
    if (!d) return false
    if (tab === 'daily') return d === selectedDate
    if (tab === 'weekly') {
      const start = format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const end = format(endOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      return d >= start && d <= end
    }
    // monthly
    return d.slice(0, 7) === selectedDate.slice(0, 7)
  })

  const filtered = dateFiltered.filter(s => {
    const { roll, phone } = splitRollAndPhone(s.phone)
    const matchSearch = !search
      || phone.includes(search)
      || roll.toLowerCase().includes(search.toLowerCase())
      || (s.country || '').toLowerCase().includes(search.toLowerCase())
    const matchPaid = filterPaid === 'all' || (filterPaid === 'paid' ? s.fee_paid : !s.fee_paid)
    return matchSearch && matchPaid
  })

  const totalFee = dateFiltered.reduce((s, st) => s + (st.fee_amount || 0), 0);
  const paidFee = dateFiltered.filter(s => s.fee_paid).reduce((sum, st) => sum + (st.fee_amount || 0), 0);
  const pendingFee = totalFee - paidFee;

  const togglePaid = async (s: Lead) => {
    try {
      await apiFetch('leads', 'PATCH', `id=eq.${s.id}`, { fee_paid: !s.fee_paid })
      toast.success(s.fee_paid ? "Marked as pending" : "✅ Marked as paid");
      loadStudents();
    } catch { toast.error("Update failed"); }
  };

  const saveFee = async () => {
    if (!editFee) return;
    setSaving(true);
    try {
      await apiFetch('leads', 'PATCH', `id=eq.${editFee.lead.id}`, { fee_amount: Number(editFee.fee) })
      toast.success("Fee updated");
      setEditFee(null); loadStudents();
    } catch { toast.error("Update failed"); } finally { setSaving(false); }
  };

  const resetAddForm = () => setAddForm({ roll: '', fee: '' });

  const handleAddStudent = async () => {
    if (!addForm.roll.trim()) return toast.error('Please enter a roll number');
    setAddSaving(true);
    try {
      await apiFetch('leads', 'POST', 'select=*', {
        phone: addForm.roll.trim(),
        country: 'Other',
        platform: 'manual',
        status: 'joined',
        joined_date: today,
        fee_amount: addForm.fee ? Number(addForm.fee) : 0,
        fee_paid: false,
      })
      toast.success('🎓 Student added');
      setShowAddModal(false); resetAddForm(); loadStudents();
    } catch (e: any) {
      toast.error('Add failed: ' + (e?.message || 'error'));
    } finally { setAddSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Students</h1><p className="page-subtitle">Students auto-added after completing a trial</p></div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary"><Plus size={16} /> Add Student</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total Students", val: dateFiltered.length, color: "text-blue-400", bg: "bg-blue-900/20" },
          { label: "Total Fee", val: `PKR ${totalFee.toLocaleString()}`, color: "text-amber-400", bg: "bg-amber-900/20" },
          { label: "Paid", val: `PKR ${paidFee.toLocaleString()}`, color: "text-emerald-400", bg: "bg-emerald-900/20" },
          { label: "Pending", val: `PKR ${pendingFee.toLocaleString()}`, color: "text-red-400", bg: "bg-red-900/20" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className="stat-card">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={`text-lg font-bold ${color} mt-1 block`}>{val}</span>
          </div>
        ))}
      </div>

      {/* Pending Fee Banner */}
      {pendingFee > 0 && (
        <div className="mb-5 p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-center gap-3">
          <DollarSign size={20} className="text-red-400 shrink-0" />
          <div>
            <p className="font-medium text-red-300 text-sm">Pending Fee: PKR {pendingFee.toLocaleString()}</p>
            <p className="text-xs text-red-400/70">{dateFiltered.filter(s => !s.fee_paid).length} students still have pending fees</p>
          </div>
        </div>
      )}

      {/* Date tabs */}
      <div className="crm-card mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {(['all', 'daily', 'weekly', 'monthly'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
          {tab !== 'all' && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-500" />
              <input
                type={tab === 'monthly' ? 'month' : 'date'}
                className="crm-input w-auto"
                value={tab === 'monthly' ? selectedDate.slice(0, 7) : selectedDate}
                onChange={e => setSelectedDate(tab === 'monthly' ? e.target.value + '-01' : e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="crm-card mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-3 text-slate-500" />
            <input className="crm-input pl-9" placeholder="Search roll #, phone or country..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="crm-select w-auto" value={filterPaid} onChange={e => setFilterPaid(e.target.value as any)}>
            <option value="all">All Students</option>
            <option value="paid">✅ Fee Paid</option>
            <option value="unpaid">❌ Fee Pending</option>
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
                  <th>#</th><th>Roll No.</th><th>Country</th><th>Phone</th><th>Platform</th>
                  <th>Join Date</th><th>Fee (PKR)</th><th>Fee Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-slate-500">No students found</td></tr>}
                {filtered.map((s, i) => {
                  const { roll, phone } = splitRollAndPhone(s.phone)
                  const isManual = s.platform === 'manual'
                  const displayRoll = isManual && !roll ? phone : roll
                  const displayPhone = isManual && !roll ? '—' : phone
                  return (
                    <tr key={s.id}>
                      <td><span className="font-bold text-emerald-400">Student {filtered.length - i}</span></td>
                      <td><span className="font-mono text-xs text-slate-300">{displayRoll || '—'}</span></td>
                      <td><span className="flex items-center gap-1.5">{COUNTRY_FLAG[s.country] || '🌍'} {s.country}</span></td>
                      <td className="font-mono text-xs text-slate-300">{displayPhone}</td>
                      <td>{isManual ? <span className="text-slate-500">Manual</span> : s.platform}</td>
                      <td className="text-slate-400 text-xs">
                        {s.joined_date ? format(new Date(s.joined_date), "d MMM yyyy") : format(new Date(s.created_at), "d MMM yyyy")}
                      </td>
                      <td>
                        <span className="font-medium text-amber-400">{s.fee_amount ? s.fee_amount.toLocaleString() : "—"}</span>
                      </td>
                      <td>
                        <button onClick={() => togglePaid(s)}
                          className={`badge cursor-pointer hover:opacity-80 transition-opacity ${s.fee_paid ? "badge-green" : "badge-red"}`}>
                          {s.fee_paid
                            ? <><CheckCircle2 size={10} className="inline mr-1" />Paid</>
                            : <><XCircle size={10} className="inline mr-1" />Pending</>}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => setEditFee({ lead: s, fee: String(s.fee_amount || "") })}
                          className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors">
                          <Edit3 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Fee Modal */}
      {editFee && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="font-semibold text-white">Update Fee</h2>
              <button onClick={() => setEditFee(null)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-400 mb-3">
                {(() => {
                  const { roll, phone } = splitRollAndPhone(editFee.lead.phone)
                  const isManual = editFee.lead.platform === 'manual'
                  const label = isManual && !roll ? phone : (roll || phone)
                  return <>Roll No. {label}</>
                })()}
              </p>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Fee Amount (PKR)</label>
              <input type="number" className="crm-input" value={editFee.fee}
                onChange={e => setEditFee({ ...editFee, fee: e.target.value })} />
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setEditFee(null)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={saveFee} disabled={saving}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="font-semibold text-white">Add Student</h2>
              <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Roll Number *</label>
                <input className="crm-input" placeholder="e.g. R-101" value={addForm.roll}
                  onChange={e => setAddForm({ ...addForm, roll: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Fee Amount (PKR)</label>
                <input type="number" className="crm-input" placeholder="e.g. 5000" value={addForm.fee}
                  onChange={e => setAddForm({ ...addForm, fee: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-800">
              <button className="btn-secondary flex-1 justify-center" onClick={() => { setShowAddModal(false); resetAddForm(); }}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleAddStudent} disabled={addSaving}>
                {addSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}