"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function UserMenu() {
  const { data: session } = useSession();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(!aberto)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
      >
        {iniciais}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
            <p className="text-xs text-gray-500">{session.user.email}</p>
            <p className="mt-1 text-xs text-gray-400">{session.user.escritorioNome}</p>
          </div>
          <div className="py-1">
            {session.user.role === "admin" && (
              <>
                <Link
                  href="/admin/empresas"
                  onClick={() => setAberto(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Gerenciar Empresas
                </Link>
                <Link
                  href="/admin/usuarios"
                  onClick={() => setAberto(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Gerenciar Usuários
                </Link>
              </>
            )}
            <Link
              href="/configuracoes"
              onClick={() => setAberto(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Configurações
            </Link>
          </div>
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
