/**
 * Notificações por email
 * Abstração para envio de emails. Usa nodemailer ou API REST.
 * No MVP, apenas registra no log. Implementação real quando configurar SMTP.
 */

export interface EmailInput {
  para: string;
  assunto: string;
  corpo: string;
  html?: string;
}

/**
 * Envia email. No MVP, faz log e retorna sucesso.
 * Para produção, integrar com Resend, SendGrid ou SMTP.
 */
export async function enviarEmail(input: EmailInput): Promise<boolean> {
  // TODO: Integrar com serviço de email real
  // Por enquanto, registra no console para desenvolvimento
  console.log(`[EMAIL] Para: ${input.para}`);
  console.log(`[EMAIL] Assunto: ${input.assunto}`);
  console.log(`[EMAIL] Corpo: ${input.corpo.substring(0, 200)}...`);

  return true;
}
