"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import {
  Users, Phone, BookOpen, GraduationCap, TrendingUp,
  MessageCircle, Headphones, DollarSign, ArrowRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function apiFetch(table: string, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const res = await fetch(url, { headers })
  if (!res.ok) return []
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const tooltipStyle = {
  backgroundColor: "#1e293b", border: "1px solid #334155",
  borderRadius: "8px", color: "#f1f5f9", fontSize: "12px",
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = getTodayStr();
  const thisMonth = today.slice(0, 7);

  useEffect(() => {
    async function load() {
      try {
        // ── 1. Total leads count ──────────────────────────────────────────
        const leads = await apiFetch('leads', 'select=id,status,created_at')
        const totalLeads = leads.length
        const totalStudents = leads.filter((l: any) => l.status === 'joined').length
        const totalTrials = leads.filter((l: any) => ['trial_booked', 'trial_done', 'joined'].includes(l.status)).length

        // ── 2. Call logs this month ───────────────────────────────────────
        const [y, m] = thisMonth.split('-').map(Number)
        const lastDay = new Date(y, m, 0).getDate()
        const monthStart = `${thisMonth}-01`
        const monthEnd = `${thisMonth}-${String(lastDay).padStart(2, '0')}`

        const callsThisMonth = await apiFetch('call_logs',
          `select=id,call_type,call_date,agent_id&call_date=gte.${monthStart}&call_date=lte.${monthEnd}`)
        const totalCalls = callsThisMonth.length
        const whatsappCalls = callsThisMonth.filter((c: any) => c.call_type === 'whatsapp').length
        const vikiCalls = callsThisMonth.filter((c: any) => c.call_type === 'viki').length

        // ── 3. Fee collected (students table if exists, else estimate) ────
        let totalFee = 0
        try {
          const students = await apiFetch('students', `select=fee&created_at=gte.${monthStart}&created_at=lte.${monthEnd}T23:59:59`)
          totalFee = students.reduce((sum: number, s: any) => sum + (parseFloat(s.fee) || 0), 0)
        } catch { totalFee = 0 }

        const joinRate = totalLeads > 0 ? ((totalStudents / totalLeads) * 100).toFixed(1) : '0'

        setStats({ totalLeads, totalCalls, whatsappCalls, vikiCalls, totalTrials, totalStudents, joinRate, totalFee })

        // ── 4. Weekly chart — WhatsApp vs Viber per day ───────────────────
        try {
          const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
          const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
          const weekCalls = await apiFetch('call_logs',
            `select=call_type,call_date&call_date=gte.${weekStart}&call_date=lte.${weekEnd}`)

          const days = eachDayOfInterval({
            start: startOfWeek(new Date(), { weekStartsOn: 1 }),
            end: endOfWeek(new Date(), { weekStartsOn: 1 })
          })
          const weekly = days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayLabel = format(day, 'EEE') // Mon, Tue...
            const dayCalls = weekCalls.filter((c: any) => c.call_date === dayStr)
            return {
              day: dayLabel,
              whatsapp: dayCalls.filter((c: any) => c.call_type === 'whatsapp').length,
              viber: dayCalls.filter((c: any) => c.call_type === 'viki').length,
            }
          })
          setWeeklyData(weekly)
        } catch { setWeeklyData([]) }

        // ── 5. 6-month trend — Leads added vs Students joined ─────────────
        try {
          const months6 = Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(new Date(), 5 - i)
            return {
              label: format(d, 'MMM'),
              start: format(startOfMonth(d), 'yyyy-MM-dd'),
              end: format(endOfMonth(d), 'yyyy-MM-dd'),
            }
          })

          const trend = await Promise.all(months6.map(async ({ label, start, end }) => {
            const monthLeads = await apiFetch('leads', `select=id,status,created_at&created_at=gte.${start}&created_at=lte.${end}T23:59:59`)
            return {
              month: label,
              leads: monthLeads.length,
              students: monthLeads.filter((l: any) => l.status === 'joined').length,
            }
          }))
          setTrendData(trend)
        } catch { setTrendData([]) }

      } catch {
        setStats({ totalLeads: 0, totalCalls: 0, whatsappCalls: 0, vikiCalls: 0, totalTrials: 0, totalStudents: 0, joinRate: '0', totalFee: 0 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { label: "Total Leads",     value: stats?.totalLeads ?? 0,     icon: Users,         color: "text-blue-400",   bg: "bg-blue-900/20" },
    { label: "Total Calls",     value: stats?.totalCalls ?? 0,     icon: Phone,         color: "text-emerald-400",bg: "bg-emerald-900/20" },
    { label: "WhatsApp Calls",  value: stats?.whatsappCalls ?? 0,  icon: MessageCircle, color: "text-green-400",  bg: "bg-green-900/20" },
    { label: "Viber Calls",     value: stats?.vikiCalls ?? 0,      icon: Headphones,    color: "text-purple-400", bg: "bg-purple-900/20" },
    { label: "Trials Booked",   value: stats?.totalTrials ?? 0,    icon: BookOpen,      color: "text-yellow-400", bg: "bg-yellow-900/20" },
    { label: "Students Joined", value: stats?.totalStudents ?? 0,  icon: GraduationCap, color: "text-emerald-400",bg: "bg-emerald-900/20" },
    { label: "Join Rate",       value: `${stats?.joinRate ?? 0}%`, icon: TrendingUp,    color: "text-pink-400",   bg: "bg-pink-900/20" },
    { label: "Fee Collected",   value: `${((stats?.totalFee ?? 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-900/20" },
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
          {weeklyData.length > 0 && weeklyData.some(d => d.whatsapp > 0 || d.viber > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
                <Bar dataKey="whatsapp" name="WhatsApp" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="viber" name="Viber" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
              Is hafte koi call log nahi mili
            </div>
          )}
        </div>

        <div className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">6 Month Trend — Leads vs Students</h3>
            <span className="badge badge-purple">6 Months</span>
          </div>
          {trendData.length > 0 && trendData.some(d => d.leads > 0 || d.students > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="students" name="Students" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
              Abhi tak koi data nahi
            </div>
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="crm-card">
        <h3 className="font-semibold text-white text-sm mb-4">Conversion Funnel — This Month</h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Leads In",      val: stats?.totalLeads ?? 0,    color: "bg-blue-600" },
            { label: "Calls Made",    val: stats?.totalCalls ?? 0,    color: "bg-indigo-600" },
            { label: "Trials",        val: stats?.totalTrials ?? 0,   color: "bg-yellow-600" },
            { label: "Joined",        val: stats?.totalStudents ?? 0, color: "bg-emerald-600" },
            { label: "Fee",           val: `${((stats?.totalFee ?? 0) / 1000).toFixed(0)}K`, color: "bg-amber-600" },
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