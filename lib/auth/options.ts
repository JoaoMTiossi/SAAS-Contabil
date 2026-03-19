import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          include: { escritorio: { include: { modulos: true } } },
        });

        if (!usuario) return null;

        const senhaValida = await bcrypt.compare(credentials.senha, usuario.senha);
        if (!senhaValida) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          escritorioId: usuario.escritorioId,
          escritorioNome: usuario.escritorio.nome,
          modulos: usuario.escritorio.modulos.map((m) => m.modulo),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          role: string;
          escritorioId: string;
          escritorioNome: string;
          modulos: string[];
        };
        token.id = u.id;
        token.role = u.role;
        token.escritorioId = u.escritorioId;
        token.escritorioNome = u.escritorioNome;
        token.modulos = u.modulos;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.escritorioId = token.escritorioId as string;
        session.user.escritorioNome = token.escritorioNome as string;
        session.user.modulos = token.modulos as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
