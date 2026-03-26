"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import NotificacaoBell from "./NotificacaoBell";

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session) return null;

  const iniciais = session.user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 lg:px-8">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <NotificacaoBell />

        {/* User Menu */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
              {iniciais}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-700">{session.user.name}</p>
              <p className="text-[11px] text-slate-400">{session.user.escritorioNome}</p>
            </div>
            <svg className="hidden h-4 w-4 text-slate-400 sm:block" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{session.user.name}</p>
                <p className="text-xs text-slate-500">{session.user.email}</p>
              </div>
              <div className="border-t border-slate-100 p-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
