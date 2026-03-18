/**
 * Engine de Notificações
 * Dispatcher central: decide qual canal usar e envia.
 */

import { enviarNotificacaoDashboard } from "./dashboard";
import { enviarEmail } from "./email";

export type CanalNotificacao = "dashboard" | "email";

export interface NotificacaoInput {
  escritorioId: string;
  titulo: string;
  mensagem: string;
  canais: CanalNotificacao[];
  link?: string;
  destinatarioEmail?: string;
}

/**
 * Envia notificação por todos os canais especificados.
 */
export async function enviarNotificacao(
  input: NotificacaoInput
): Promise<void> {
  const promises: Promise<unknown>[] = [];

  if (input.canais.includes("dashboard")) {
    promises.push(
      enviarNotificacaoDashboard({
        escritorioId: input.escritorioId,
        titulo: input.titulo,
        mensagem: input.mensagem,
        link: input.link,
      })
    );
  }

  if (input.canais.includes("email") && input.destinatarioEmail) {
    promises.push(
      enviarEmail({
        para: input.destinatarioEmail,
        assunto: input.titulo,
        corpo: input.mensagem,
      })
    );
  }

  await Promise.allSettled(promises);
}
