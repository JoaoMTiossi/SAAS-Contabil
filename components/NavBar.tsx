"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import NotificacaoBell from "./NotificacaoBell";
import UserMenu from "./UserMenu";

const allNavItems = [
  { href: "/dashboard", label: "Dashboard", modulo: "dashboard" },
  { href: "/contratos", label: "Contratos", modulo: "contratos" },
  { href: "/clientes", label: "Clientes", modulo: "clientes" },
  { href: "/honorarios", label: "Honorários", modulo: "honorarios" },
  { href: "/calendario-fiscal", label: "Calendário Fiscal", modulo: "calendario-fiscal" },
  { href: "/rescisoes", label: "Rescisões", modulo: "rescisoes" },
  { href: "/timesheet", label: "Timesheet", modulo: "timesheet" },
  { href: "/alertas", label: "Alertas", modulo: "alertas" },
];

export default function NavBar() {
  const { data: session } = useSession();

  if (!session) return null;

  const modulos = session.user.modulos ?? [];
  const navItems = allNavItems.filter((item) => modulos.includes(item.modulo));

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="shrink-0 text-lg font-bold text-gray-900">
          SAAS-Contabil
        </Link>

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

        <div className="flex items-center gap-2">
          <NotificacaoBell />
          <UserMenu />
        </div>
      </nav>

      {/* Mobile nav */}
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
  );
}
