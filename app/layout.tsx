import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SAAS-Contabil — Gestão Contábil",
  description: "Plataforma completa de gestão contábil para escritórios de contabilidade",
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contratos", label: "Contratos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/honorarios", label: "Honorários" },
  { href: "/calendario-fiscal", label: "Calendário Fiscal" },
  { href: "/rescisoes", label: "Rescisões" },
  { href: "/timesheet", label: "Timesheet" },
  { href: "/alertas", label: "Alertas" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {/* Navbar */}
        <header className="border-b border-gray-200 bg-white">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            {/* Logo */}
            <Link href="/dashboard" className="shrink-0 text-lg font-bold text-gray-900">
              SAAS-Contabil
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* CTA button */}
            <div className="shrink-0">
              <Link
                href="/contratos/novo"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Novo Contrato
              </Link>
            </div>
          </nav>

          {/* Mobile nav — horizontal scroll */}
          <div className="md:hidden overflow-x-auto border-t border-gray-100">
            <div className="flex items-center gap-1 px-4 py-2 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
