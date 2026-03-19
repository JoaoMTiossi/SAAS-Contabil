import type { Metadata } from "next";
import "./globals.css";
import "@/lib/auth/types";
import SessionProvider from "@/components/SessionProvider";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "SAAS-Contabil — Gestão Contábil",
  description: "Plataforma completa de gestão contábil para escritórios de contabilidade",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <SessionProvider>
          <NavBar />
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
