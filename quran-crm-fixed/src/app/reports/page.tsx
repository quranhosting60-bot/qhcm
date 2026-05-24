"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ReportsPage() {
  const { user } = useAuth();

  const mockData = [
    { month: "Jan", leads: 40, trials: 24, joined: 12 },
    { month: "Feb", leads: 30, trials: 13, joined: 5 },
    { month: "Mar", leads: 20, trials: 9, joined: 3 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Statistics</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="leads" fill="#3b82f6" />
            <Bar dataKey="trials" fill="#10b981" />
            <Bar dataKey="joined" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
