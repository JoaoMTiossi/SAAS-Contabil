"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginPage = pathname === "/login";

  if (!session || isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-[260px]">
        <Header onMenuToggle={() => setMobileOpen(true)} />
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
