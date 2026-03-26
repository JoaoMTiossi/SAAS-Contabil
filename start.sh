#!/bin/sh
echo "Running database migrations..."
npx prisma db push
echo "Running seed..."
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Create escritorio if not exists
  let res = await pool.query(\"SELECT id FROM \\\"Escritorio\\\" WHERE cnpj = '00000000000100' LIMIT 1\");
  let escritorioId;
  if (res.rows.length === 0) {
    const r = await pool.query(
      \"INSERT INTO \\\"Escritorio\\\" (id, nome, cnpj, email, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES (gen_random_uuid(), 'Escritório Principal', '00000000000100', 'admin@saascontabil.com', NOW(), NOW()) RETURNING id\"
    );
    escritorioId = r.rows[0].id;
    console.log('Escritorio criado:', escritorioId);
  } else {
    escritorioId = res.rows[0].id;
    console.log('Escritorio existente:', escritorioId);
  }

  // Create modules
  const modulos = ['dashboard','contratos','clientes','honorarios','calendario-fiscal','rescisoes','timesheet','alertas','configuracoes'];
  for (const modulo of modulos) {
    const exists = await pool.query(\"SELECT id FROM \\\"EscritorioModulo\\\" WHERE \\\"escritorioId\\\" = \$1 AND modulo = \$2\", [escritorioId, modulo]);
    if (exists.rows.length === 0) {
      await pool.query(\"INSERT INTO \\\"EscritorioModulo\\\" (id, \\\"escritorioId\\\", modulo) VALUES (gen_random_uuid(), \$1, \$2)\", [escritorioId, modulo]);
    }
  }
  console.log('Modulos configurados');

  // Create admin user if not exists
  const userRes = await pool.query(\"SELECT id FROM \\\"Usuario\\\" WHERE email = 'admin@saascontabil.com' LIMIT 1\");
  const senhaHash = await bcrypt.hash('Joao@3035', 12);
  if (userRes.rows.length === 0) {
    await pool.query(
      \"INSERT INTO \\\"Usuario\\\" (id, \\\"escritorioId\\\", nome, email, senha, role, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES (gen_random_uuid(), \$1, 'JoaoTiossi', 'admin@saascontabil.com', \$2, 'admin', NOW(), NOW())\",
      [escritorioId, senhaHash]
    );
    console.log('Usuario admin criado');
  } else {
    await pool.query(\"UPDATE \\\"Usuario\\\" SET senha = \$1 WHERE email = 'admin@saascontabil.com'\", [senhaHash]);
    console.log('Usuario admin atualizado');
  }

  console.log('Seed finalizado! Login: admin@saascontabil.com / Joao@3035');
  await pool.end();
}
seed().catch(e => { console.error('Seed error:', e); });
" || echo "Seed failed, continuing..."
echo "Starting application..."
node server.js
