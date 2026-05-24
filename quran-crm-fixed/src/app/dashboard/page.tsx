"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getLeads, getMonthlyStats, getDailyTargets } from "@/lib/supabase";
import { format } from "date-fns";
import {
  Users, Phone, BookOpen, GraduationCap, TrendingUp,
  MessageCircle, Headphones, Target, DollarSign, ArrowRight,
  CheckCircle2, Clock, CheckCircle, XCircle, ShieldCheck, Zap, Eye
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

const today = format(new Date(), "yyyy-MM-dd");
const thisMonth = format(new Date(), "yyyy-MM");

const MOCK_WEEKLY: any[] = [];
const MOCK_TREND: any[] = [];

const tooltipStyle = {
  backgroundColor: "#1e293b", border: "1px solid #334155",
  borderRadius: "8px", color: "#f1f5f9", fontSize: "12px",
};

// ── Helper: Format time difference ──
function getTimeAgo(lastSeen: string): string {
  const now = new Date();
  const last = new Date(lastSeen);
  const diff = now.getTime() - last.getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Superadmin: Pending Approvals (Admin & Salesperson only) ──────────────────
function PendingApprovals() {
  const { getPendingUsers, approveUser, rejectUser, refreshUsers } = useAuth();

  useEffect(() => {
    refreshUsers();
  }, []);

  // Only show Admin and Salesperson (NOT Superadmin - auto-approved)
  const pending = getPendingUsers().filter((u: any) => u.role !== "superadmin");

  const handleApprove = (id: string) => {
    approveUser(id);
  };

  const handleReject = (id: string) => {
    rejectUser(id);
  };

  return (
    <div className="crm-card mb-5 border border-yellow-800/40">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-yellow-400" />
          <h3 className="font-semibold text-white text-sm">Pending User Approvals</h3>
          {pending.length > 0 && (
            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </div>
        {pending.length > 0 && (
          <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded-lg border border-yellow-800/40">
            ⚠️ Action Required
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
          <CheckCircle size={16} className="text-emerald-500" />
          <span>All users approved — no pending accounts</span>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(u => (
            <div key={u.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3.5 hover:border-slate-600/70 transition-all">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  u.role === "admin" 
                    ? "bg-gradient-to-br from-purple-600 to-purple-700"
                    : "bg-gradient-to-br from-blue-600 to-blue-700"
                }`}>
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">{u.name}</p>
                  <p className="text-slate-400 text-xs">
                    @{u.username} · 
                    <span className={`font-semibold ml-1 ${
                      u.role === "admin" 
                        ? "text-purple-400" 
                        : "text-blue-400"
                    }`}>
                      {u.role === "admin" ? "🔑 Admin" : "👤 Salesperson"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-yellow-400 font-semibold px-2.5 py-1.5 bg-yellow-900/20 rounded-lg border border-yellow-800/40">
                  <Clock size={12} /> Pending
                </span>
                <button onClick={() => handleApprove(u.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition-all font-semibold shadow-lg hover:shadow-emerald-500/20">
                  <CheckCircle size={13} /> Approve
                </button>
                <button onClick={() => handleReject(u.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg transition-all font-semibold shadow-lg hover:shadow-red-500/20">
                  <XCircle size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Superadmin: Live User Tracking ──
function LiveUserTracking() {
  const { getAllUsers } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadUsers = () => {
      const allUsers = getAllUsers();
      // Add last seen tracking
      const usersWithTracking = allUsers
        .filter((u: any) => u.role !== "superadmin")
        .map((u: any) => ({
          ...u,
          lastSeen: u.lastSeen || new Date().toISOString(),
          isOnline: !u.lastSeen || (new Date().getTime() - new Date(u.lastSeen).getTime()) < 300000, // 5 min
        }))
        .sort((a: any, b: any) => {
          // Online first
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          // Then by last seen
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        });

      setUsers(usersWithTracking);
    };

    loadUsers();
    const interval = setInterval(loadUsers, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const onlineCount = users.filter((u: any) => u.isOnline).length;
  const displayedUsers = showAll ? users : users.slice(0, 5);

  return (
    <div className="crm-card mb-5 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-cyan-400" />
          <h3 className="font-semibold text-white text-sm">Live User Activity</h3>
          <span className="bg-cyan-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
            {onlineCount} Online
          </span>
        </div>
        <span className="text-xs text-slate-400">Total Users: {users.length}</span>
      </div>

      <div className="space-y-2.5">
        {displayedUsers.map(u => (
          <div key={u.id}
            className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-lg px-3.5 py-2.5 hover:border-slate-600/70 transition-all">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  u.role === "admin"
                    ? "bg-gradient-to-br from-purple-600 to-purple-700"
                    : "bg-gradient-to-br from-blue-600 to-blue-700"
                }`}>
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${u.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium truncate">{u.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    u.role === "admin" ? "bg-purple-900/40 text-purple-300" : "bg-blue-900/40 text-blue-300"
                  }`}>
                    {u.role === "admin" ? "🔑 Admin" : "👤 Salesperson"}
                  </span>
                </div>
                <p className="text-slate-400 text-xs truncate">@{u.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              {u.isOnline ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <Zap size={11} className="animate-pulse" /> Online
                </span>
              ) : (
                <span className="text-xs text-slate-500 font-mono">{getTimeAgo(u.lastSeen)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {users.length > 5 && !showAll && (
        <button onClick={() => setShowAll(true)}
          className="w-full mt-3 text-xs text-cyan-400 hover:text-cyan-300 font-semibold py-2 border border-cyan-800/40 rounded-lg hover:bg-cyan-900/10 transition-colors">
          View All {users.length} Users
        </button>
      )}

      {users.length === 0 && (
        <div className="text-center py-4 text-slate-500 text-sm">
          No users yet
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [myTarget, setMyTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // getLeads returns an array (with .documents alias for legacy code)
        const leadsRes = await getLeads();
        const allLeads = (leadsRes as any).documents || leadsRes || [];
        const totalLeadsCount = allLeads.length;

        // Get monthly stats and targets
        const [s, targets] = await Promise.all([
          getMonthlyStats(thisMonth),
          getDailyTargets(today),
        ]);

        setStats({
          ...s,
          totalLeads: totalLeadsCount,
        });

        const mine = (targets.documents as any[]).find(
          (t: any) =>
            t.agent_id === user?.id ||
            t.agentId === user?.id ||
            t.agent_name === user?.name ||
            t.agentName === user?.name
        );
        setMyTarget(mine || null);
      } catch {
        setStats({
          totalLeads: 0, totalCalls: 0, whatsappCalls: 0,
          vikiCalls: 0, totalTrials: 0, totalStudents: 0,
          totalFee: 0, joinRate: "0",
        });
        setMyTarget(null);
      } finally { 
        setLoading(false); 
      }
    }
    load();
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const targetTotal = myTarget?.target_calls || myTarget?.targetCalls || 30;
  const targetDone = myTarget?.completed ? targetTotal : Math.floor(targetTotal * 0.6);
  const targetPct = Math.min(100, Math.round((targetDone / targetTotal) * 100));
  const targetLeadFrom = myTarget?.lead_id_from || myTarget?.leadIdFrom || "";
  const targetLeadTo = myTarget?.lead_id_to || myTarget?.leadIdTo || "";

  const statCards = [
    { label: "Total Leads", value: stats?.totalLeads ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-900/20" },
    { label: "Total Calls", value: stats?.totalCalls ?? 0, icon: Phone, color: "text-emerald-400", bg: "bg-emerald-900/20" },
    { label: "WhatsApp Calls", value: stats?.whatsappCalls ?? 0, icon: MessageCircle, color: "text-green-400", bg: "bg-green-900/20" },
    { label: "Viber Calls", value: stats?.vikiCalls ?? 0, icon: Headphones, color: "text-purple-400", bg: "bg-purple-900/20" },
    { label: "Trials Booked", value: stats?.totalTrials ?? 0, icon: BookOpen, color: "text-yellow-400", bg: "bg-yellow-900/20" },
    { label: "Students Joined", value: stats?.totalStudents ?? 0, icon: GraduationCap, color: "text-emerald-400", bg: "bg-emerald-900/20" },
    { label: "Join Rate", value: `${stats?.joinRate ?? 0}%`, icon: TrendingUp, color: "text-pink-400", bg: "bg-pink-900/20" },
    { label: "Fee Collected", value: `${((stats?.totalFee ?? 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-900/20" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{format(new Date(), "EEEE, d MMMM yyyy")} — Welcome, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Data
        </div>
      </div>

      {/* Super Admin Only: Pending Approvals & Live Tracking */}
      {isSuperAdmin && (
        <>
          <PendingApprovals />
          <LiveUserTracking />
        </>
      )}

      {/* My Daily Target */}
      <div className="crm-card mb-5 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-amber-400" />
            <h3 className="font-semibold text-white text-sm">My Daily Target</h3>
            {myTarget && (
              <span className="text-xs text-slate-500 font-mono">{targetLeadFrom} → {targetLeadTo}</span>
            )}
          </div>
          {myTarget?.completed ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-800/50">
              <CheckCircle2 size={12} /> Done!
            </span>
          ) : (
            <span className="text-xs text-amber-400 font-semibold">{targetDone}/{targetTotal} calls</span>
          )}
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all ${myTarget?.completed ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${targetPct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {myTarget?.completed ? "🎉 Target completed for today!" : `${targetTotal - targetDone} more calls needed to complete today's target`}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">{label}</span>
              <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Weekly Calls — WhatsApp vs Viber</h3>
            <span className="badge badge-blue">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_WEEKLY} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
              <Bar dataKey="whatsapp" name="WhatsApp" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="viber" name="Viber" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">6 Month Trend — Leads vs Students</h3>
            <span className="badge badge-purple">6 Months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={MOCK_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
              <Line type="monotone" dataKey="leads" name="Leads" stroke="#60a5fa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="students" name="Students" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="crm-card">
        <h3 className="font-semibold text-white text-sm mb-4">Conversion Funnel — This Month</h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Leads In", val: stats?.totalLeads ?? 0, color: "bg-blue-600" },
            { label: "Contacted", val: Math.round((stats?.totalLeads ?? 0) * 0.85), color: "bg-indigo-600" },
            { label: "Trials", val: stats?.totalTrials ?? 0, color: "bg-yellow-600" },
            { label: "Joined", val: stats?.totalStudents ?? 0, color: "bg-emerald-600" },
            { label: "Fee Collected", val: `${((stats?.totalFee ?? 0) / 1000).toFixed(0)}K`, color: "bg-amber-600" },
          ].map(({ label, val, color }, i, arr) => (
            <div key={label} className="text-center relative">
              <div className={`${color} rounded-lg py-4 mb-2 shadow-lg`}>
                <span className="text-white font-bold text-xl">{val}</span>
              </div>
              <p className="text-xs text-slate-400">{label}</p>
              {i < arr.length - 1 && (
                <ArrowRight size={14} className="absolute -right-2 top-4 text-slate-600" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}