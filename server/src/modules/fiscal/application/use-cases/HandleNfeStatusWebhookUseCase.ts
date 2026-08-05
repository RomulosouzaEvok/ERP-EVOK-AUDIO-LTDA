/**
 * Reage a uma notificação assíncrona de mudança de status de NF-e (ex.:
 * webhook da Focus NFe). NUNCA aplica o payload recebido diretamente no
 * banco — usa apenas a referência (`ref`) para identificar a venda e
 * dispara uma reconsulta real ao provedor via
 * `GetSaleNfeStatusUseCase`, que é quem de fato atualiza o registro.
 *
 * @module modules/fiscal/application/use-cases/HandleNfeStatusWebhookUseCase
 */

const { NotFoundError } = require('../../../../errors');
const GetSaleNfeStatusUseCase = require('./GetSaleNfeStatusUseCase');
const SequelizeFiscalRepository = require('../../infrastructure/sequelize/SequelizeFiscalRepository');

/** `ref` segue o formato `sale-{saleId}-{series}-{number}` gerado por `IssueSaleNfeUseCase`. */
function extractSaleId(ref: string): number | null {
  const match = /^sale-(\d+)-/.exec(String(ref || ''));
  return match ? Number(match[1]) : null;
}

// Instância única do repository — `HandleNfeStatusWebhookUseCase` é
// instanciado sem argumentos pelo `webhookController` (fora do módulo
// `fiscal`); mantemos essa assinatura e resolvemos a dependência aqui
// dentro para não precisar tocar em `modules/webhooks/`.
const fiscalRepository = new SequelizeFiscalRepository();

class HandleNfeStatusWebhookUseCase {
  async execute({ ref }: { ref: string }) {
    const saleId = extractSaleId(ref);
    if (!saleId) {
      throw new NotFoundError('Referência de NF-e não reconhecida.');
    }

    const useCase = new GetSaleNfeStatusUseCase(fiscalRepository);
    return useCase.execute({ saleId });
  }
}

module.exports = HandleNfeStatusWebhookUseCase;
