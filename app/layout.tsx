import type { Metadata } from "next";
import "./globals.css";
import "@/lib/auth/types";
import SessionProvider from "@/components/SessionProvider";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "SAAS-Contabil — Gestão Contábil",
  description: "Plataforma completa de gestão contábil para escritórios de contabilidade",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
