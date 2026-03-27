import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SAAS-Contabil — Gestão de Prazos Contratuais",
  description: "Módulo de extração e gerenciamento de prazos e vencimentos de contratos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {/* Navbar */}
        <header className="border-b border-gray-200 bg-white">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/dashboard" className="text-lg font-bold text-gray-900">
              📋 SAAS-Contabil
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link href="/contratos" className="text-gray-600 hover:text-gray-900">Contratos</Link>
              <Link href="/modelos" className="text-gray-600 hover:text-gray-900">Modelos</Link>
              <Link href="/rescisao" className="text-gray-600 hover:text-gray-900">Rescisão</Link>
              <Link href="/alertas" className="text-gray-600 hover:text-gray-900">Alertas</Link>
            </div>
            <div className="ml-auto">
              <Link
                href="/contratos/novo"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
