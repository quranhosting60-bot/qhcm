"use client";
import { createContext, useContext, ReactNode } from "react";

// Dummy user — login nahi, seedha access
export type UserRole = "superadmin" | "admin" | "salesperson";
export type UserStatus = "approved";

export interface CRMUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  active: boolean;
}

const DUMMY_USER: CRMUser = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Admin",
  email: "admin@quranhosting.com",
  username: "admin",
  role: "superadmin",
  status: "approved",
  active: true,
};

interface AuthContextType {
  user: CRMUser;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSalesPerson: boolean;
  isIbrahimSetup: boolean;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  getPendingUsers: () => any[];
  getAllUsers: () => any[];
  approveUser: (id: string) => boolean;
  rejectUser: (id: string) => boolean;
  toggleUserActive: (id: string) => any[];
  updateUserLastSeen: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: DUMMY_USER,
        loading: false,
        isAdmin: true,
        isSuperAdmin: true,
        isSalesPerson: false,
        isIbrahimSetup: true,
        logout: () => {},
        refreshUsers: async () => {},
        getPendingUsers: () => [],
        getAllUsers: () => [],
        approveUser: () => true,
        rejectUser: () => true,
        toggleUserActive: () => [],
        updateUserLastSeen: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const SUPERADMIN_EMAIL = "admin@quranhosting.com";
