export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertaCard } from "@/components/alertas/AlertaCard";
import { TipoAlerta, PrioridadeAlerta } from "@/types/contrato";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type AlertaProximo = DashboardData["alertasProximos"][number];
type ContratoRecente = DashboardData["contratosRecentes"][number];

async function getDashboardData(escritorioId: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30Dias = new Date(hoje);
  em30Dias.setDate(em30Dias.getDate() + 30);

  const clienteIds = (
    await prisma.cliente.findMany({
      where: { escritorioId },
      select: { id: true },
    })
  ).map((c) => c.id);

  const contratoWhere = clienteIds.length > 0
    ? { clienteId: { in: clienteIds } }
    : { clienteId: "__none__" };

  const [
    totalContratos,
    contratosAtivos,
    totalAlertas,
    alertasProximos,
    contratosRecentes,
    parcelasPendentes,
    totalClientes,
    honorariosMes,
  ] = await Promise.all([
    prisma.contrato.count({ where: contratoWhere }),
    prisma.contrato.count({ where: { ...contratoWhere, status: "ativo" } }),
    prisma.alerta.count({
      where: {
        status: "agendado",
        contrato: contratoWhere,
      },
    }),
    prisma.alerta.findMany({
      where: {
        status: "agendado",
        dataAlerta: { lte: em30Dias },
        contrato: contratoWhere,
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
      where: contratoWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { alertas: true } } },
    }),
    prisma.parcela.count({
      where: {
        status: "pendente",
        contrato: contratoWhere,
      },
    }),
    prisma.cliente.count({ where: { escritorioId } }),
    prisma.lancamentoHonorario.count({
      where: {
        status: "pendente",
        honorario: {
          cliente: { escritorioId },
        },
      },
    }),
  ]);

  return {
    totalContratos,
    contratosAtivos,
    totalAlertas,
    alertasProximos,
    contratosRecentes,
    parcelasPendentes,
    totalClientes,
    honorariosMes,
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const escritorioId = session.user.escritorioId;
  const {
    totalContratos,
    contratosAtivos,
    totalAlertas,
    alertasProximos,
    contratosRecentes,
    parcelasPendentes,
    totalClientes,
    honorariosMes,
  } = await getDashboardData(escritorioId);

  const cards = [
    { label: "Clientes", valor: totalClientes, cor: "text-blue-600", bg: "bg-blue-50", iconBg: "bg-blue-100",
      icon: <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg> },
    { label: "Contratos Ativos", valor: contratosAtivos, total: totalContratos, cor: "text-slate-900", bg: "bg-slate-50", iconBg: "bg-slate-100",
      icon: <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
    { label: "Alertas Pendentes", valor: totalAlertas, cor: "text-orange-600", bg: "bg-orange-50", iconBg: "bg-orange-100",
      icon: <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" /></svg> },
    { label: "Parcelas a Vencer", valor: parcelasPendentes, cor: "text-purple-600", bg: "bg-purple-50", iconBg: "bg-purple-100",
      icon: <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg> },
    { label: "Honorários Pendentes", valor: honorariosMes, cor: "text-green-600", bg: "bg-green-50", iconBg: "bg-green-100",
      icon: <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Link
          href="/contratos/novo"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-lg"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo Contrato
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            <p className={`mt-2 text-3xl font-bold ${card.cor}`}>{card.valor}</p>
            {card.total !== undefined && (
              <p className="mt-1 text-xs text-slate-400">de {card.total} total</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas próximos (30 dias) */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Alertas nos Próximos 30 Dias</h2>
            <Link href="/alertas" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Ver todos
            </Link>
          </div>
          <div className="p-4">
            {alertasProximos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
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
          </div>
        </section>

        {/* Contratos recentes */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Contratos Recentes</h2>
            <Link href="/contratos" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Ver todos
            </Link>
          </div>
          <div className="p-4">
            {contratosRecentes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                Nenhum contrato cadastrado ainda.{" "}
                <Link href="/contratos/novo" className="font-medium text-blue-600 hover:text-blue-700">
                  Cadastrar agora
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {contratosRecentes.map((c: ContratoRecente) => (
                  <Link
                    key={c.id}
                    href={`/contratos/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-4 transition-all hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {c.identificador ?? "Contrato sem identificador"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.contratante ?? ""}{c.contratante && c.contratado ? " · " : ""}{c.contratado ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {c._count.alertas} alertas
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium
                          ${c.status === "ativo" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
