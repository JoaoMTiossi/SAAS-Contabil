export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertaCard } from "@/components/alertas/AlertaCard";
import { TipoAlerta, PrioridadeAlerta } from "@/types/contrato";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type AlertaProximo = DashboardData["alertasProximos"][number];
type ContratoRecente = DashboardData["contratosRecentes"][number];

async function getDashboardData() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30Dias = new Date(hoje);
  em30Dias.setDate(em30Dias.getDate() + 30);

  const [
    totalContratos,
    contratosAtivos,
    totalAlertas,
    alertasProximos,
    contratosRecentes,
    parcelasPendentes,
  ] = await Promise.all([
    prisma.contrato.count(),
    prisma.contrato.count({ where: { status: "ativo" } }),
    prisma.alerta.count({ where: { status: "agendado" } }),
    prisma.alerta.findMany({
      where: {
        status: "agendado",
        dataAlerta: { lte: em30Dias },
      },
      orderBy: { dataAlerta: "asc" },
      take: 10,
      include: {
        contrato: {
          select: { identificador: true, contratante: true, contratado: true },
        },
      },
    }),
    prisma.contrato.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { alertas: true } } },
    }),
    prisma.parcela.count({ where: { status: "pendente" } }),
  ]);

  return {
    totalContratos,
    contratosAtivos,
    totalAlertas,
    alertasProximos,
    contratosRecentes,
    parcelasPendentes,
  };
}

export default async function DashboardPage() {
  const {
    totalContratos,
    contratosAtivos,
    totalAlertas,
    alertasProximos,
    contratosRecentes,
    parcelasPendentes,
  } = await getDashboardData();

  const cards = [
    { label: "Contratos Ativos", valor: contratosAtivos, total: totalContratos, cor: "blue" },
    { label: "Alertas Pendentes", valor: totalAlertas, cor: "orange" },
    { label: "Parcelas a Vencer", valor: parcelasPendentes, cor: "purple" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Link
          href="/contratos/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Novo Contrato
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{card.valor}</p>
            {card.total !== undefined && (
              <p className="mt-1 text-xs text-gray-400">de {card.total} total</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas próximos (30 dias) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Alertas nos Próximos 30 Dias</h2>
            <Link href="/alertas" className="text-xs text-blue-600 hover:underline">
              Ver todos →
            </Link>
          </div>
          {alertasProximos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
              Nenhum alerta nos próximos 30 dias.
            </div>
          ) : (
            <div className="space-y-2">
              {alertasProximos.map((a: AlertaProximo) => (
                <AlertaCard
                  key={a.id}
                  id={a.id}
                  refTipo={a.refTipo as TipoAlerta}
                  refDescricao={a.refDescricao}
                  dataAlerta={format(a.dataAlerta, "dd/MM/yyyy")}
                  antecedenciaDias={a.antecedenciaDias}
                  prioridade={a.prioridade as PrioridadeAlerta}
                  canais={a.canais}
                  status={a.status}
                  contrato={a.contrato}
                />
              ))}
            </div>
          )}
        </section>

        {/* Contratos recentes */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Contratos Recentes</h2>
            <Link href="/contratos" className="text-xs text-blue-600 hover:underline">
              Ver todos →
            </Link>
          </div>
          {contratosRecentes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
              Nenhum contrato cadastrado ainda.{" "}
              <Link href="/contratos/novo" className="text-blue-600 hover:underline">
                Cadastrar agora
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {contratosRecentes.map((c: ContratoRecente) => (
                <Link
                  key={c.id}
                  href={`/contratos/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {c.identificador ?? "Contrato sem identificador"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {c.contratante ?? ""}{c.contratante && c.contratado ? " · " : ""}{c.contratado ?? ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {c._count.alertas} alertas
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium
                        ${c.status === "ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {c.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
