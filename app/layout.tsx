import type { Metadata } from "next";
import "./globals.css";
import "@/lib/auth/types";
import SessionProvider from "@/components/SessionProvider";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "APOLUM HORIZON — Gest\u00e3o Cont\u00e1bil",
  description: "Plataforma completa de gest\u00e3o cont\u00e1bil para escrit\u00f3rios de contabilidade",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Exo+2:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
