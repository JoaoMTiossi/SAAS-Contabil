/**
 * Notificações por email via SMTP (nodemailer)
 * Busca config SMTP do escritório no banco.
 */

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export interface EmailInput {
  para: string;
  assunto: string;
  corpo: string;
  html?: string;
  escritorioId?: string;
}

/**
 * Envia email real via SMTP configurado no escritório.
 * Retorna false se SMTP não estiver configurado.
 */
export async function enviarEmail(input: EmailInput): Promise<boolean> {
  let config = null;

  if (input.escritorioId) {
    config = await prisma.escritorioConfig.findUnique({
      where: { escritorioId: input.escritorioId },
    });
  }

  // Se não achou config específica, tenta qualquer uma que tenha SMTP configurado
  if (!config?.smtpHost) {
    config = await prisma.escritorioConfig.findFirst({
      where: { smtpHost: { not: null } },
    });
  }

  if (!config?.smtpHost || !config?.smtpUser) {
    console.log(`[EMAIL] SMTP não configurado. Email não enviado para: ${input.para}`);
    console.log(`[EMAIL] Assunto: ${input.assunto}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort ?? 587,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass ?? "",
      },
    });

    await transporter.sendMail({
      from: config.emailRemetente ?? config.smtpUser,
      to: input.para,
      subject: input.assunto,
      text: input.corpo,
      html: input.html ?? input.corpo.replace(/\n/g, "<br>"),
    });

    console.log(`[EMAIL] Enviado para: ${input.para} | Assunto: ${input.assunto}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Erro ao enviar para ${input.para}:`, err);
    return false;
  }
}
