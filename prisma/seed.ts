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

  // Populate fiscal obligations
  console.log("Populando obrigações fiscais brasileiras...");
  const OBRIGACOES = [
    { nome: "DAS", sigla: "DAS", tipo: "imposto" as const, regimes: ["simples_nacional"], dia: 20, periodicidade: "mensal" as const, descricao: "Documento de Arrecadação do Simples Nacional" },
    { nome: "DEFIS", sigla: "DEFIS", tipo: "acessoria" as const, regimes: ["simples_nacional"], dia: 31, mes: 3, periodicidade: "anual" as const, descricao: "Declaração de Informações Socioeconômicas e Fiscais" },
    { nome: "PGDAS-D", sigla: "PGDAS-D", tipo: "acessoria" as const, regimes: ["simples_nacional"], dia: 20, periodicidade: "mensal" as const, descricao: "Programa Gerador do DAS Declaratório" },
    { nome: "IRPJ Presumido", sigla: "IRPJ", tipo: "imposto" as const, regimes: ["lucro_presumido"], dia: 31, periodicidade: "trimestral" as const, descricao: "Imposto de Renda PJ - Lucro Presumido" },
    { nome: "CSLL Presumido", sigla: "CSLL", tipo: "imposto" as const, regimes: ["lucro_presumido"], dia: 31, periodicidade: "trimestral" as const, descricao: "Contribuição Social sobre Lucro Líquido" },
    { nome: "PIS", sigla: "PIS", tipo: "imposto" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 25, periodicidade: "mensal" as const, descricao: "Programa de Integração Social" },
    { nome: "COFINS", sigla: "COFINS", tipo: "imposto" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 25, periodicidade: "mensal" as const, descricao: "Contribuição para Financiamento da Seguridade Social" },
    { nome: "IRPJ Real", sigla: "IRPJ", tipo: "imposto" as const, regimes: ["lucro_real"], dia: 31, periodicidade: "trimestral" as const, descricao: "Imposto de Renda PJ - Lucro Real" },
    { nome: "CSLL Real", sigla: "CSLL", tipo: "imposto" as const, regimes: ["lucro_real"], dia: 31, periodicidade: "trimestral" as const, descricao: "CSLL - Lucro Real" },
    { nome: "SPED Fiscal", sigla: "EFD-ICMS/IPI", tipo: "acessoria" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 20, periodicidade: "mensal" as const, descricao: "Escrituração Fiscal Digital ICMS/IPI" },
    { nome: "SPED Contribuições", sigla: "EFD-Contrib", tipo: "acessoria" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 15, periodicidade: "mensal" as const, descricao: "Escrituração Fiscal Digital das Contribuições" },
    { nome: "DCTF", sigla: "DCTF", tipo: "acessoria" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 15, periodicidade: "mensal" as const, descricao: "Declaração de Débitos e Créditos Tributários Federais" },
    { nome: "ECD", sigla: "ECD", tipo: "acessoria" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 31, mes: 5, periodicidade: "anual" as const, descricao: "Escrituração Contábil Digital" },
    { nome: "ECF", sigla: "ECF", tipo: "acessoria" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 31, mes: 7, periodicidade: "anual" as const, descricao: "Escrituração Contábil Fiscal" },
    { nome: "eSocial", sigla: "eSocial", tipo: "acessoria" as const, regimes: ["simples_nacional", "lucro_presumido", "lucro_real", "mei"], dia: 15, periodicidade: "mensal" as const, descricao: "Escrituração Digital das Obrigações Trabalhistas" },
    { nome: "DCTFWeb", sigla: "DCTFWeb", tipo: "acessoria" as const, regimes: ["simples_nacional", "lucro_presumido", "lucro_real"], dia: 15, periodicidade: "mensal" as const, descricao: "DCTF Web - Previdenciária" },
    { nome: "DIRF", sigla: "DIRF", tipo: "acessoria" as const, regimes: ["simples_nacional", "lucro_presumido", "lucro_real"], dia: 28, mes: 2, periodicidade: "anual" as const, descricao: "Declaração do IR Retido na Fonte" },
    { nome: "RAIS", sigla: "RAIS", tipo: "acessoria" as const, regimes: ["simples_nacional", "lucro_presumido", "lucro_real", "mei"], dia: 31, mes: 3, periodicidade: "anual" as const, descricao: "Relação Anual de Informações Sociais" },
    { nome: "GFIP/SEFIP", sigla: "GFIP", tipo: "acessoria" as const, regimes: ["simples_nacional", "lucro_presumido", "lucro_real"], dia: 7, periodicidade: "mensal" as const, descricao: "Guia de Recolhimento do FGTS e Informações à Previdência" },
    { nome: "DAS-MEI", sigla: "DAS-MEI", tipo: "imposto" as const, regimes: ["mei"], dia: 20, periodicidade: "mensal" as const, descricao: "DAS do Microempreendedor Individual" },
    { nome: "DASN-SIMEI", sigla: "DASN", tipo: "acessoria" as const, regimes: ["mei"], dia: 31, mes: 5, periodicidade: "anual" as const, descricao: "Declaração Anual do Simples Nacional - MEI" },
    { nome: "ISS", sigla: "ISS", tipo: "imposto" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 10, periodicidade: "mensal" as const, descricao: "Imposto Sobre Serviços" },
    { nome: "ICMS", sigla: "ICMS", tipo: "imposto" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 12, periodicidade: "mensal" as const, descricao: "Imposto sobre Circulação de Mercadorias e Serviços" },
    { nome: "GIA", sigla: "GIA", tipo: "acessoria" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 15, periodicidade: "mensal" as const, descricao: "Guia de Informação e Apuração do ICMS" },
    { nome: "INSS Patronal", sigla: "INSS", tipo: "imposto" as const, regimes: ["lucro_presumido", "lucro_real"], dia: 20, periodicidade: "mensal" as const, descricao: "Contribuição Previdenciária Patronal" },
    { nome: "IRRF Folha", sigla: "IRRF", tipo: "imposto" as const, regimes: ["simples_nacional", "lucro_presumido", "lucro_real"], dia: 20, periodicidade: "mensal" as const, descricao: "Imposto de Renda Retido na Fonte sobre Folha" },
    { nome: "FGTS", sigla: "FGTS", tipo: "imposto" as const, regimes: ["simples_nacional", "lucro_presumido", "lucro_real"], dia: 7, periodicidade: "mensal" as const, descricao: "Fundo de Garantia do Tempo de Serviço" },
  ];

  let criadasFiscal = 0;
  for (const obr of OBRIGACOES) {
    const existe = await prisma.obrigacaoFiscal.findFirst({ where: { nome: obr.nome } });
    if (!existe) {
      await prisma.obrigacaoFiscal.create({
        data: {
          nome: obr.nome,
          sigla: obr.sigla,
          tipo: obr.tipo,
          regimes: { set: obr.regimes as ("simples_nacional" | "lucro_presumido" | "lucro_real" | "mei")[] },
          diaVencimento: obr.dia,
          mesVencimento: obr.mes ?? null,
          periodicidade: obr.periodicidade,
          descricao: obr.descricao,
        },
      });
      criadasFiscal++;
    }
  }
  console.log(`${criadasFiscal} obrigações fiscais criadas.`);

  console.log("Seed finalizado com sucesso!");
  console.log("Login: admin@saascontabil.com / Joao@3035");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
