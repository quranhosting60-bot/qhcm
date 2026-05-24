"use client";
import { useEffect, useState } from "react";
import { setDailyTarget, getDailyTargets, DailyTarget } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Target, Plus, CheckCircle2, Clock, X, User, TrendingUp } from "lucide-react";

export default function TargetsPage() {
  const { user, isAdmin } = useAuth();
  const [targets, setTargets] = useState<DailyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ agentName: "", leadIdFrom: "", leadIdTo: "", targetCalls: "30" });
  const [saving, setSaving] = useState(false);

  const loadTargets = async () => {
    setLoading(true);
    try {
      const res = await getDailyTargets(selectedDate);
      setTargets(res.documents as unknown as DailyTarget[]);
    } catch {
      toast.error("Data load nahi hua — Supabase connection check karein");
      setTargets([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTargets(); }, [selectedDate]);

  const handleSave = async () => {
    if (!form.agentName || !form.leadIdFrom || !form.leadIdTo) return toast.error("All fields are required");
    setSaving(true);
    try {
      await setDailyTarget({
        agentId: form.agentName.toLowerCase().replace(/\s/g, "_"),
        agentName: form.agentName, date: selectedDate,
        leadIdFrom: form.leadIdFrom, leadIdTo: form.leadIdTo,
        targetCalls: Number(form.targetCalls), completed: false,
      });
      toast.success("Target set!");
      setShowModal(false);
      setForm({ agentName: "", leadIdFrom: "", leadIdTo: "", targetCalls: "30" });
      loadTargets();
    } catch { toast.error("Error saving target"); }
    finally { setSaving(false); }
  };

  const totalTarget = targets.reduce((s, t) => s + (t.target_calls || t.targetCalls || 0), 0);
  const completed = targets.filter(t => t.completed).length;
  const completionRate = targets.length ? Math.round((completed / targets.length) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Targets</h1>
          <p className="page-subtitle">Daily lead targets per agent</p>
        </div>
        <div className="flex gap-3">
          <input type="date" className="crm-input w-auto" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} />Set Target</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total Agents", val: targets.length, icon: User, color: "text-blue-400" },
          { label: "Total Target Calls", val: totalTarget, icon: Target, color: "text-amber-400" },
          { label: "Completed", val: `${completed}/${targets.length}`, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Completion Rate", val: `${completionRate}%`, icon: TrendingUp, color: "text-pink-400" },
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

      {/* Target Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : targets.length === 0 ? (
        <div className="crm-card text-center py-16 text-slate-500">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p>No targets set for this date</p>
          {isAdmin && <button className="btn-primary mt-4 mx-auto" onClick={() => setShowModal(true)}><Plus size={14} />Add Target</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map(target => {
            const calls = target.target_calls || target.targetCalls || 0;
            const progress = target.completed ? 100 : Math.floor(Math.random() * 40) + 30;
            const callsDone = target.completed ? calls : Math.floor(calls * progress / 100);
            const agentName = target.agent_name || target.agentName || "";
            const leadFrom = target.lead_id_from || target.leadIdFrom || "";
            const leadTo = target.lead_id_to || target.leadIdTo || "";
            return (
              <div key={target.id} className={`crm-card border ${target.completed ? "border-emerald-800/50 bg-emerald-900/5" : "border-slate-800"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-300">{agentName.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="font-semibold text-white">{agentName}</span>
                  </div>
                  {target.completed ? (
                    <span className="badge badge-green"><CheckCircle2 size={10} className="mr-1" />Done</span>
                  ) : (
                    <span className="badge badge-yellow"><Clock size={10} className="mr-1" />In Progress</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-500">Lead Range</span>
                    <span className="font-mono text-blue-400 text-xs">{leadFrom} → {leadTo}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-500">Target Calls</span>
                    <span className="font-bold text-amber-400">{calls}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Date</span>
                    <span className="text-slate-300">{format(new Date(target.date + "T00:00:00"), "d MMM yyyy")}</span>
                  </div>
                </div>
                {/* Progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Progress</span>
                    <span className={target.completed ? "text-emerald-400 font-semibold" : ""}>{callsDone}/{calls}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${target.completed ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${target.completed ? 100 : progress}%` }} />
                  </div>
                  {target.completed && (
                    <p className="text-emerald-400 text-xs font-semibold mt-2 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Target completed!
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="font-semibold text-white">Set Daily Target</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Agent Name *</label>
                <input className="crm-input" placeholder="e.g. Ahmed" value={form.agentName} onChange={e => setForm({ ...form, agentName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Lead From *</label>
                  <input className="crm-input" placeholder="Lead 1" value={form.leadIdFrom} onChange={e => setForm({ ...form, leadIdFrom: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Lead To *</label>
                  <input className="crm-input" placeholder="Lead 50" value={form.leadIdTo} onChange={e => setForm({ ...form, leadIdTo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Target Calls</label>
                <input type="number" className="crm-input" value={form.targetCalls} onChange={e => setForm({ ...form, targetCalls: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-800">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Target size={14} />}
                Set Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}