"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Users, ShieldCheck, UserX, UserCheck, Lock } from "lucide-react";

export default function AdminPage() {
  const { isSuperAdmin, getAllUsers, toggleUserActive, refreshUsers } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace("/dashboard");
      return;
    }
    refreshUsers();
  }, [isSuperAdmin]);

  const users = getAllUsers();

  const handleToggle = (id: string) => {
    toggleUserActive(id);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
          <Lock size={28} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-500">User Management is only accessible to Super Admin.</p>
      </div>
    );
  }

  const roleBadge: Record<string, string> = {
    superadmin: "badge-yellow",
    admin: "badge-blue",
    salesperson: "badge-gray",
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">Manage team accounts and access levels</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="stat-card">
          <span className="text-xs text-slate-500">Total Users</span>
          <div className="text-2xl text-blue-400">{users.length}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-500">Active</span>
          <div className="text-2xl text-emerald-400">
            {users.filter(u => u.active !== false).length}
          </div>
        </div>
        <div className="stat-card">
          <span className="text-xs text-slate-500">Inactive</span>
          <div className="text-2xl text-red-400">
            {users.filter(u => u.active === false).length}
          </div>
        </div>
      </div>

      <div className="crm-card p-0">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.username}</td>
                <td>
                  <span className={`badge ${roleBadge[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  {u.active !== false ? "Active" : "Inactive"}
                </td>
                <td>
                  {u.role !== "superadmin" && (
                    <button onClick={() => handleToggle(u.id)}>
                      Toggle
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}