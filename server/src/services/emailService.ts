/**
 * Servico de envio de e-mail transacional (SEC-12: recuperacao de senha).
 *
 * Usa SMTP real quando configurado (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`).
 * Sem SMTP configurado (padrao em desenvolvimento/CI), nao lanca erro nem
 * bloqueia o fluxo: registra o conteudo no log do servidor, permitindo que
 * o suporte entregue o link manualmente enquanto o SMTP real nao existe.
 *
 * @module services/emailService
 */

import nodemailer from 'nodemailer';

let cachedTransporter: nodemailer.Transporter | null | undefined;

/**
 * Monta (e cacheia) o transporter SMTP a partir das variaveis de ambiente.
 *
 * @returns Transporter configurado, ou `null` se SMTP nao estiver configurado.
 */
function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return cachedTransporter;
}

/**
 * Envia um e-mail transacional. Nunca lanca: falha de envio e registrada no
 * log e o chamador deve tratar o fluxo de negocio como ja concluido (o
 * e-mail e best-effort, nao deve bloquear nem vazar detalhes ao usuario).
 *
 * @param to - Destinatario.
 * @param subject - Assunto do e-mail.
 * @param text - Corpo em texto plano.
 * @returns Promise resolvida sempre, nunca rejeitada.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[emailService] SMTP nao configurado. Conteudo do e-mail para ${to}:\n${subject}\n${text}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error(`[emailService] Falha ao enviar e-mail para ${to}:`, error);
  }
}

/**
 * Permite zerar o cache do transporter (uso em testes).
 */
export function resetEmailTransporterCache(): void {
  cachedTransporter = undefined;
}
