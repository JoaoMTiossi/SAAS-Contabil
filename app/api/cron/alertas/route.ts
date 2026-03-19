import { NextRequest, NextResponse } from "next/server";
import { processarAlertasVencidos } from "@/lib/scheduler";
import { prisma } from "@/lib/prisma";
import { enviarNotificacao } from "@/lib/notificacoes/engine";

export async function POST(req: NextRequest) {
  try {
    // Optional: verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
    }

    // 1. Process overdue alerts
    const atualizados = await processarAlertasVencidos();

    // 2. Send notifications for alerts due today
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const alertasHoje = await prisma.alerta.findMany({
      where: {
        status: "agendado",
        dataAlerta: { gte: hoje, lt: amanha },
      },
      include: {
        contrato: {
          include: {
            cliente: { include: { escritorio: true } },
          },
        },
      },
    });

    let notificacoesEnviadas = 0;

    for (const alerta of alertasHoje) {
      const escritorioId = alerta.contrato?.cliente?.escritorioId;
      if (!escritorioId) continue;

      await enviarNotificacao({
        escritorioId,
        titulo: `Alerta: ${alerta.refDescricao}`,
        mensagem: `Alerta ${alerta.prioridade} para o contrato ${alerta.contrato?.identificador ?? "sem ID"}. ${alerta.refDescricao}`,
        canais: (alerta.canais as string[]).includes("email") ? ["dashboard", "email"] : ["dashboard"],
        link: `/contratos/${alerta.contratoId}`,
        destinatarioEmail: alerta.contrato?.cliente?.email ?? undefined,
      });

      await prisma.alerta.update({
        where: { id: alerta.id },
        data: { status: "enviado" },
      });

      notificacoesEnviadas++;
    }

    return NextResponse.json({
      ok: true,
      alertasAtualizados: atualizados,
      notificacoesEnviadas,
      alertasProcessados: alertasHoje.length,
    });
  } catch (err) {
    console.error("[POST /api/cron/alertas]", err);
    return NextResponse.json({ erro: "Erro ao processar alertas." }, { status: 500 });
  }
}
