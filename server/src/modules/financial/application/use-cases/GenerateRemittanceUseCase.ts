import type { Transaction } from 'sequelize';
import type { ICnabRepository } from '../../domain/repositories/CnabRepository';

const UseCase = require('../../../../shared/application/UseCase');
const { ValidationError, NotFoundError, BusinessRuleError, ConflictError } = require('../../../../errors');
const { buildRemittanceFile } = require('../../infrastructure/cnab/buildRemittanceFile');

/** Status de `AccountReceivable` elegíveis para entrar em uma remessa de cobrança. */
const ELIGIBLE_RECEIVABLE_STATUSES = ['pending', 'partial', 'overdue'];

/** Dados de entrada de `GenerateRemittanceUseCase.execute`. */
interface GenerateRemittanceInput {
  receivableIds: Array<number | string>;
  userId: number;
  transaction: Transaction;
}

/**
 * Gera um arquivo de remessa CNAB 240 (cobrança registrada) a partir de
 * contas a receber selecionadas: reserva um "nosso número" sequencial e
 * único por título, monta o arquivo (`buildRemittanceFile`) e persiste
 * `CnabRemittance`/`CnabRemittanceItem` na mesma transação, avançando os
 * contadores de `CompanyBankingConfig` (nunca reaproveitados).
 */
class GenerateRemittanceUseCase extends UseCase {
  cnabRepository: ICnabRepository;

  constructor(cnabRepository: ICnabRepository) {
    super();
    this.cnabRepository = cnabRepository;
  }

  /**
   * @param {GenerateRemittanceInput} input
   * @returns {Promise<{ remittance: Object, items: Object[] }>}
   * @throws {ValidationError} Se `receivableIds` estiver vazio.
   * @throws {NotFoundError} Se algum id de `receivableIds` não existir.
   * @throws {BusinessRuleError} Se a configuração bancária não existir, se algum título não estiver em status elegível, ou se o cliente do título não tiver documento (CPF/CNPJ) cadastrado.
   * @throws {ConflictError} Se algum título já estiver em uma remessa aberta (não liquidada/rejeitada ainda).
   */
  async execute({ receivableIds, userId, transaction }: GenerateRemittanceInput) {
    if (!receivableIds || receivableIds.length === 0) {
      throw new ValidationError('Selecione ao menos uma conta a receber para gerar a remessa.');
    }

    const bankingConfig = await this.cnabRepository.findBankingConfigForUpdate(transaction);
    if (!bankingConfig) {
      throw new BusinessRuleError(
        'Configuração bancária da empresa (CNAB) ainda não cadastrada. '
        + 'Configure banco/agência/conta/convênio/carteira antes de gerar uma remessa.',
      );
    }

    const receivables = await this.cnabRepository.findReceivablesByIds(receivableIds, transaction);
    const foundIds = new Set(receivables.map((r: any) => r.id));
    const missingIds = receivableIds.filter((id) => !foundIds.has(Number(id)));
    if (missingIds.length > 0) {
      throw new NotFoundError(`Conta(s) a receber não encontrada(s): ${missingIds.join(', ')}.`);
    }

    for (const receivable of receivables) {
      if (!ELIGIBLE_RECEIVABLE_STATUSES.includes(receivable.status)) {
        throw new BusinessRuleError(
          `Conta a receber #${receivable.id} está com status "${receivable.status}" e não pode entrar em remessa `
          + `(apenas ${ELIGIBLE_RECEIVABLE_STATUSES.join(', ')}).`,
        );
      }
      if (!receivable.customer || !receivable.customer.cpf_cnpj) {
        throw new BusinessRuleError(
          `Cliente da conta a receber #${receivable.id} não tem CPF/CNPJ cadastrado — obrigatório para o Segmento Q do CNAB.`,
        );
      }
    }

    const openItems = await this.cnabRepository.findOpenRemittanceItemsByReceivableIds(receivableIds);
    if (openItems.length > 0) {
      const openReceivableIds = openItems.map((item: any) => item.receivable_id).join(', ');
      throw new ConflictError(
        `Conta(s) a receber já incluída(s) em remessa não liquidada/rejeitada: ${openReceivableIds}. `
        + 'Aguarde o retorno do banco (ou trate o item na remessa anterior) antes de gerar nova remessa para elas.',
      );
    }

    const generatedAt = new Date();
    let nextOurNumber = bankingConfig.next_our_number;

    const titles = receivables.map((receivable: any) => {
      const nossoNumero = String(nextOurNumber);
      nextOurNumber += 1;
      return {
        sequenceInLot: 0,
        nossoNumero,
        documentNumber: String(receivable.id),
        dueDate: receivable.due_date,
        amount: parseFloat(receivable.amount) - parseFloat(receivable.amount_paid || 0),
        issueDate: generatedAt.toISOString().slice(0, 10),
        payerDocument: receivable.customer.cpf_cnpj,
        payerName: receivable.customer.name,
        payerAddress: receivable.customer.street
          ? `${receivable.customer.street}, ${receivable.customer.number || 'S/N'}`
          : null,
        payerNeighborhood: receivable.customer.neighborhood,
        payerZip: receivable.customer.cep,
        payerCity: receivable.customer.city,
        payerState: receivable.customer.state,
        receivable,
      };
    });

    const company = {
      bankCode: bankingConfig.bank_code,
      bankName: bankingConfig.bank_name,
      agency: bankingConfig.agency,
      agencyDv: bankingConfig.agency_dv,
      account: bankingConfig.account_number,
      accountDv: bankingConfig.account_dv,
      agencyAccountDv: bankingConfig.agency_account_dv,
      covenantCode: bankingConfig.covenant_code,
      walletCode: bankingConfig.wallet_code,
      companyDocument: bankingConfig.company_document,
      companyLegalName: bankingConfig.company_legal_name,
    };

    const built = buildRemittanceFile({
      company,
      titles,
      fileSequence: bankingConfig.next_remittance_number,
      generatedAt,
    });

    const totalAmount = titles.reduce((sum: number, title: any) => sum + title.amount, 0);

    const remittance = await this.cnabRepository.createRemittance({
      sequential_number: bankingConfig.next_remittance_number,
      bank_code: bankingConfig.bank_code,
      filename: built.suggestedFilename,
      file_content: built.content,
      total_items: titles.length,
      total_amount: totalAmount,
      generated_by: userId,
    }, transaction);

    const items = await this.cnabRepository.createRemittanceItems(
      titles.map((title: any) => ({
        remittance_id: remittance.id,
        receivable_id: title.receivable.id,
        nosso_numero: title.nossoNumero,
        amount: title.amount,
        due_date: title.dueDate,
        status: 'pending',
      })),
      transaction,
    );

    await this.cnabRepository.incrementBankingCounters(bankingConfig.id, {
      next_our_number: nextOurNumber,
      next_remittance_number: bankingConfig.next_remittance_number + 1,
    }, transaction);

    return { remittance, items };
  }
}

module.exports = GenerateRemittanceUseCase;
