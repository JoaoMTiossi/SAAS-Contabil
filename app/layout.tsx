import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Contabil SAAS — Gestão de Prazos Contratuais",
  description: "Módulo de extração e gerenciamento de prazos e vencimentos de contratos",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {/* Navbar */}
        <header className="border-b border-gray-200 bg-[#0f0a1e]">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.svg" alt="Contabil SAAS" width={160} height={38} priority />
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/contratos" className="text-slate-300 hover:text-white transition-colors">
                Contratos
              </Link>
              <Link href="/kanban" className="text-slate-300 hover:text-white transition-colors">
                Kanban
              </Link>
              <Link href="/alertas" className="text-slate-300 hover:text-white transition-colors">
                Alertas
              </Link>
            </div>
            <div className="ml-auto">
              <Link
                href="/contratos/novo"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
              >
                + Novo Contrato
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
