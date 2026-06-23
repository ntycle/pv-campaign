"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TeamSetupModal } from "@/components/layout/TeamSetupModal";


import { SystemProvider } from "@/hooks/useSystem";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <SystemProvider>
      <div className="flex min-h-screen bg-slate-100">
        <TeamSetupModal />
        <Sidebar />
        <main className="flex-1 ml-60 min-h-screen flex flex-col">
          {children}
        </main>
      </div>
    </SystemProvider>
  );
}
