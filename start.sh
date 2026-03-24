#!/bin/sh
echo "Running database migrations..."
npx prisma db push
echo "Running seed..."
node -e "
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./lib/generated/prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  let escritorio = await prisma.escritorio.findFirst({ where: { cnpj: '00000000000100' } });
  if (!escritorio) {
    escritorio = await prisma.escritorio.create({
      data: { nome: 'Escritório Principal', cnpj: '00000000000100', email: 'admin@saascontabil.com' }
    });
  }

  const modulos = ['dashboard','contratos','clientes','honorarios','calendario-fiscal','rescisoes','timesheet','alertas','configuracoes'];
  for (const modulo of modulos) {
    const existing = await prisma.escritorioModulo.findFirst({ where: { escritorioId: escritorio.id, modulo } });
    if (!existing) await prisma.escritorioModulo.create({ data: { escritorioId: escritorio.id, modulo } });
  }

  const senhaHash = await bcrypt.hash('Joao@3035', 12);
  const existingUser = await prisma.usuario.findUnique({ where: { email: 'admin@saascontabil.com' } });
  if (!existingUser) {
    await prisma.usuario.create({
      data: { escritorioId: escritorio.id, nome: 'JoaoTiossi', email: 'admin@saascontabil.com', senha: senhaHash, role: 'admin' }
    });
  }
  console.log('Seed finalizado! Login: admin@saascontabil.com / Joao@3035');
  await prisma.\$disconnect();
}
main().catch(e => { console.error(e); });
" || echo "Seed failed, continuing..."
echo "Starting application..."
node .next/standalone/server.js
