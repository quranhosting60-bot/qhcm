"use client";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import AppShell from "./AppShell";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155" },
        }}
      />
    </AuthProvider>
  );
}
