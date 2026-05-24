// src/app/students/page.tsx
"use client";
import { useEffect, useState } from "react";
import { getLeads, updateLead, Lead } from "@/lib/supabase";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { GraduationCap, DollarSign, CheckCircle2, XCircle, Edit3, X } from "lucide-react";

export default function StudentsPage() {
  const [students, setStudents] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editFee, setEditFee] = useState<{ lead: Lead; fee: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStudents = async () => {
    try {
      const res = await getLeads({ status: "joined" });
      // getLeads returns an array (with .documents alias) — both work
      setStudents((res as any).documents || (res as any) || []);
    } catch {
      toast.error("Data load nahi hua — Supabase connection check karein");
      setStudents([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStudents(); }, []);

  const totalFee = students.reduce((s, st) => s + (st.fee_amount || st.feeAmount || 0), 0);
  const paidFee = students.filter((s) => s.fee_paid ?? s.feePaid).reduce((sum, st) => sum + (st.fee_amount || st.feeAmount || 0), 0);
  const pendingFee = totalFee - paidFee;

  const togglePaid = async (s: Lead) => {
    try {
      await updateLead(s.id, { fee_paid: !(s.fee_paid ?? s.feePaid) });
      toast.success((s.fee_paid ?? s.feePaid) ? "Fee pending mark ki" : "Fee paid mark ki");
      loadStudents();
    } catch { toast.error("Update fail"); }
  };

  const saveFee = async () => {
    if (!editFee) return;
    setSaving(true);
    try {
      await updateLead(editFee.lead.id, { fee_amount: Number(editFee.fee) });
      toast.success("Fee update ho gai");
      setEditFee(null);
      loadStudents();
    } catch { toast.error("Update fail"); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Students</h1><p className="page-subtitle">Join kiye hue students aur fees</p></div>
      </div>

      {/* Fee Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Total Students", val: students.length, color: "text-blue-400" },
          { label: "Total Fee", val: `PKR ${totalFee.toLocaleString()}`, color: "text-amber-400" },
          { label: "Paid", val: `PKR ${paidFee.toLocaleString()}`, color: "text-emerald-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="stat-card">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={`text-xl font-bold ${color} mt-1`}>{val}</span>
          </div>
        ))}
      </div>

      {/* Fee Pending banner */}
      {pendingFee > 0 && (
        <div className="mb-5 p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-center gap-3">
          <DollarSign size={20} className="text-red-400 shrink-0" />
          <div>
            <p className="font-medium text-red-300 text-sm">Pending Fee: PKR {pendingFee.toLocaleString()}</p>
            <p className="text-xs text-red-400/70">{students.filter(s => !s.feePaid).length} students ki fee abhi pending hai</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="crm-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>#</th><th>Phone</th><th>Country</th><th>Platform</th>
                  <th>Join Date</th><th>Fee (PKR)</th><th>Fee Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td><span className="font-mono text-xs text-slate-500">{i + 1}</span></td>
                    <td><span className="font-medium text-white">{s.phone}</span></td>
                    <td>{s.country}</td>
                    <td>{s.platform}</td>
                    <td className="text-slate-400 text-xs">{s.joined_date || s.joinedDate || format(new Date(s.created_at), "d MMM yyyy")}</td>
                    <td>
                      <span className="font-medium text-amber-400">
                        {(s.fee_amount || s.feeAmount) ? (s.fee_amount || s.feeAmount)!.toLocaleString() : "—"}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => togglePaid(s)} className={`badge cursor-pointer hover:opacity-80 transition-opacity ${(s.fee_paid ?? s.feePaid) ? "badge-green" : "badge-red"}`}>
                        {(s.fee_paid ?? s.feePaid) ? <><CheckCircle2 size={10} className="mr-1" />Paid</> : <><XCircle size={10} className="mr-1" />Pending</>}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => setEditFee({ lead: s, fee: String(s.fee_amount || s.feeAmount || "") })} className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-900/20 rounded-lg transition-colors">
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
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
              <h2 className="font-semibold text-white">Fee Update Karein</h2>
              <button onClick={() => setEditFee(null)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-400 mb-3">{editFee.lead.phone}</p>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Fee Amount (PKR)</label>
              <input type="number" className="crm-input" value={editFee.fee} onChange={(e) => setEditFee({ ...editFee, fee: e.target.value })} />
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button className="btn-secondary flex-1" onClick={() => setEditFee(null)}>Cancel</button>
              <button className="btn-primary flex-1 justify-center" onClick={saveFee} disabled={saving}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}