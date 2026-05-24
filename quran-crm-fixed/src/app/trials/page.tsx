'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { createTrial, getDailyTrials, getWeeklyTrials, getMonthlyTrials } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Calendar, TrendingUp } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export default function TrialsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [trials, setTrials] = useState<any[]>([])
  const [stats, setStats] = useState({ today: 0, completed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    lead_id: '',
    trial_date: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    loadTrials()
  }, [tab, selectedDate])

  const loadTrials = async () => {
    setLoading(true)
    try {
      if (tab === 'daily') {
        const data = await getDailyTrials(selectedDate)
        setTrials(data)
        const completed = data.filter(t => t.completed).length
        setStats({ today: data.length, completed, pending: data.length - completed })
      } else if (tab === 'weekly') {
        const start = format(startOfWeek(new Date(selectedDate)), 'yyyy-MM-dd')
        const end = format(endOfWeek(new Date(selectedDate)), 'yyyy-MM-dd')
        const data = await getWeeklyTrials(start, end)
        setTrials(data)
        const completed = data.filter(t => t.completed).length
        setStats({ today: data.length, completed, pending: data.length - completed })
      } else {
        const [year, month] = selectedDate.split('-')
        const data = await getMonthlyTrials(`${year}-${month}`)
        setTrials(data)
        const completed = data.filter(t => t.completed).length
        setStats({ today: data.length, completed, pending: data.length - completed })
      }
    } catch (error) {
      toast.error('Failed to load trials')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTrial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !formData.lead_id) {
      toast.error('Please fill all fields')
      return
    }

    try {
      const newTrial = await createTrial(formData.lead_id, formData.trial_date, user.id)
      setTrials([newTrial, ...trials])
      toast.success('Trial added successfully')
      setShowForm(false)
      setFormData({ lead_id: '', trial_date: format(new Date(), 'yyyy-MM-dd') })
      await loadTrials()
    } catch (error) {
      toast.error('Failed to add trial')
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Trials Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-5 h-5" />
          Add Trial
        </button>
      </div>

      {/* Add Trial Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Schedule New Trial</h2>
          <form onSubmit={handleAddTrial} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead ID
              </label>
              <input
                type="text"
                value={formData.lead_id}
                onChange={e => setFormData({ ...formData, lead_id: e.target.value })}
                placeholder="Enter lead ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trial Date
              </label>
              <input
                type="date"
                value={formData.trial_date}
                onChange={e => setFormData({ ...formData, trial_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
              >
                Schedule Trial
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Trials</p>
              <p className="text-3xl font-bold text-gray-800">{stats.today}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-4 rounded-lg shadow-md">
        {(['daily', 'weekly', 'monthly'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {tab === 'daily' ? 'Select Date' : 'Select Month'}
        </label>
        <input
          type={tab === 'daily' ? 'date' : 'month'}
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Trials Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : trials.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No trials scheduled</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lead ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Trial Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trials.map(trial => (
                  <tr key={trial.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{trial.lead_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {format(new Date(trial.trial_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded ${
                        trial.completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {trial.completed ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{trial.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
