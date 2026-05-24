"use client";
import { useAuth } from "@/lib/auth";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-6 max-w-7xl mx-auto w-full flex-1">{children}</div>
      </main>
    </div>
  );
}
