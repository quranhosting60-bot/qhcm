import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import AppShell from "@/components/ui/AppShell";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Quran Hosting CRM",
  description: "Quran Hosting CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
