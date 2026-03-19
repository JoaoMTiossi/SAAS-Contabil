import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

const TODOS_MODULOS = [
  "dashboard",
  "contratos",
  "clientes",
  "honorarios",
  "calendario-fiscal",
  "rescisoes",
  "timesheet",
  "alertas",
  "configuracoes",
];

async function main() {
  console.log("Criando escritório principal...");

  // Check if already exists
  let escritorio = await prisma.escritorio.findFirst({
    where: { cnpj: "00000000000100" },
  });

  if (!escritorio) {
    escritorio = await prisma.escritorio.create({
      data: {
        nome: "Escritório Principal",
        cnpj: "00000000000100",
        email: "admin@saascontabil.com",
      },
    });
  }

  console.log("Habilitando todos os módulos...");
  for (const modulo of TODOS_MODULOS) {
    const existing = await prisma.escritorioModulo.findFirst({
      where: { escritorioId: escritorio.id, modulo },
    });
    if (!existing) {
      await prisma.escritorioModulo.create({
        data: { escritorioId: escritorio.id, modulo },
      });
    }
  }

  console.log("Criando usuário admin (JoaoTiossi)...");
  const senhaHash = await bcrypt.hash("Joao@3035", 12);

  const existingUser = await prisma.usuario.findUnique({
    where: { email: "admin@saascontabil.com" },
  });

  if (existingUser) {
    await prisma.usuario.update({
      where: { email: "admin@saascontabil.com" },
      data: { senha: senhaHash },
    });
  } else {
    await prisma.usuario.create({
      data: {
        escritorioId: escritorio.id,
        nome: "JoaoTiossi",
        email: "admin@saascontabil.com",
        senha: senhaHash,
        role: "admin",
      },
    });
  }

  console.log("Seed finalizado com sucesso!");
  console.log("Login: admin@saascontabil.com / Joao@3035");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
