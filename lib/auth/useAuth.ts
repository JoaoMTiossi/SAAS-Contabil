"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();
  return {
    session,
    status,
    loading: status === "loading",
    escritorioId: session?.user?.escritorioId ?? "",
    usuarioId: session?.user?.id ?? "",
    role: session?.user?.role ?? "",
    modulos: session?.user?.modulos ?? [],
  };
}
