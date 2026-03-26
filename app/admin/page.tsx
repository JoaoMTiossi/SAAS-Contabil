"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface TopEscritorio {
  id: string;
  nome: string;
  _count: { usuarios: number; clientes: number };
}

interface CrescimentoMes {
  mes: string;
  total: number;
}

interface DashboardData {
  totalEscritorios: number;
  totalUsuarios: number;
  totalClientes: number;
  totalContratos: number;
  escritoriosAtivos: number;
  escritoriosSuspensos: number;
  escritoriosBloqueados: number;
  receitaMensal: number;
  inadimplencia: number;
  novasEmpresas: number;
  novosUsuarios: number;
  topEscritorios: TopEscritorio[];
  crescimentoMensal: CrescimentoMes[];
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse ${className}`}>
      <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-16 bg-gray-200 rounded" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
      <div className="flex items-end gap-3 h-40">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${30 + Math.random() * 70}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    async function fetchData() {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session, status, router]);

  if (status === "loading" || (!session && loading)) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (!session || session.user.role !== "admin") return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const maxCrescimento = data
    ? Math.max(...data.crescimentoMensal.map((m) => m.total), 1)
    : 1;

  const formatMesLabel = (mes: string) => {
    const [ano, mesNum] = mes.split("-");
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${meses[parseInt(mesNum, 10) - 1]}/${ano.slice(2)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonChart />
        <SkeletonTable />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          Erro ao carregar dados do dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          +{data.novasEmpresas} empresas / +{data.novosUsuarios} usuários nos últimos 30 dias
        </div>
      </div>

      {/* Row 1: Totais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Escritórios", value: data.totalEscritorios, color: "text-blue-600" },
          { label: "Total Usuários", value: data.totalUsuarios, color: "text-indigo-600" },
          { label: "Total Clientes", value: data.totalClientes, color: "text-violet-600" },
          { label: "Total Contratos", value: data.totalContratos, color: "text-purple-600" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>
              {card.value.toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>

      {/* Row 2: Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Ativos", value: data.escritoriosAtivos, dotColor: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50" },
          { label: "Suspensos", value: data.escritoriosSuspensos, dotColor: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50" },
          { label: "Bloqueados", value: data.escritoriosBloqueados, dotColor: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${card.dotColor}`} />
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
            </div>
            <p className={`mt-2 text-3xl font-bold ${card.textColor}`}>
              {card.value.toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>

      {/* Row 3: Receita e Inadimplência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Receita Mensal</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {formatCurrency(data.receitaMensal)}
          </p>
          <p className="mt-1 text-xs text-gray-400">Cobranças pagas no mês atual</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Inadimplência</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {data.inadimplencia.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-gray-400">Cobranças com status atrasado</p>
        </div>
      </div>

      {/* Row 4: Crescimento Mensal */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Crescimento Mensal</h2>
        <p className="text-xs text-gray-400 mb-4">Novos escritórios por mês (últimos 6 meses)</p>
        <div className="flex items-end gap-3" style={{ height: "180px" }}>
          {data.crescimentoMensal.map((m) => (
            <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-700">{m.total}</span>
              <div
                className="w-full bg-blue-500 rounded-t transition-all duration-300"
                style={{
                  height: `${Math.max((m.total / maxCrescimento) * 140, 4)}px`,
                }}
              />
              <span className="text-[10px] text-gray-500 mt-1">{formatMesLabel(m.mes)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 5: Top 5 Escritórios */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Top 5 Escritórios</h2>
          <p className="text-xs text-gray-400 mt-0.5">Por número de clientes</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Escritório</th>
              <th className="px-5 py-3 text-right">Clientes</th>
              <th className="px-5 py-3 text-right">Usuários</th>
            </tr>
          </thead>
          <tbody>
            {data.topEscritorios.map((e, i) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-400 font-medium">{i + 1}</td>
                <td className="px-5 py-3 font-medium text-gray-900">{e.nome}</td>
                <td className="px-5 py-3 text-right text-gray-700">{e._count.clientes}</td>
                <td className="px-5 py-3 text-right text-gray-700">{e._count.usuarios}</td>
              </tr>
            ))}
            {data.topEscritorios.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                  Nenhum escritório encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
