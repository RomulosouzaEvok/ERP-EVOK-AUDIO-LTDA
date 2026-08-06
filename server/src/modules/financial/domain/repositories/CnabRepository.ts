import type { Transaction } from 'sequelize';

/**
 * Formato estrutural do contrato `CnabRepository`, usado pelos use cases da
 * Cobrança CNAB 240 v1 (remessa/retorno) para tipar a dependência sem
 * acoplar à classe concreta (nominal) — qualquer objeto com esta forma
 * (ex.: `SequelizeCnabRepository`) satisfaz o tipo.
 *
 * @module modules/financial/domain/repositories/CnabRepository
 */
export interface ICnabRepository {
  /** Busca a configuração bancária singleton (id=1) da empresa, ou `null` se ainda não configurada. */
  findBankingConfig(): Promise<any | null>;
  /** Busca a configuração bancária com lock pessimista (reserva de nosso-número/nº de remessa concorrente). */
  findBankingConfigForUpdate(transaction: Transaction): Promise<any | null>;
  createOrUpdateBankingConfig(data: Record<string, any>): Promise<any>;
  incrementBankingCounters(id: number | string, data: { next_our_number?: number; next_remittance_number?: number }, transaction: Transaction): Promise<void>;

  /** Contas a receber elegíveis (status pending/partial/overdue), com cliente incluído, pelos ids informados. */
  findReceivablesByIds(ids: Array<number | string>, transaction?: Transaction): Promise<any[]>;
  /** Itens de remessa em aberto (`status='pending'`) para os `receivable_id` informados — bloqueia remessa duplicada do mesmo título. */
  findOpenRemittanceItemsByReceivableIds(receivableIds: Array<number | string>): Promise<any[]>;

  createRemittance(data: Record<string, any>, transaction: Transaction): Promise<any>;
  createRemittanceItems(items: Array<Record<string, any>>, transaction: Transaction): Promise<any[]>;
  findRemittanceById(id: number | string): Promise<any | null>;
  listRemittances(pagination: { limit?: number; offset?: number }): Promise<{ rows: any[]; count: number }>;

  createReturnFile(data: Record<string, any>, transaction: Transaction): Promise<any>;
  updateReturnFile(id: number | string, data: Record<string, any>, transaction: Transaction): Promise<any>;
  createReturnOccurrence(data: Record<string, any>, transaction: Transaction): Promise<any>;
  /** Verifica se uma ocorrência idêntica já foi aplicada antes (dedup de reimportação do mesmo retorno). */
  findExistingOccurrence(where: { remittance_item_id: number | string; movement_code: string; occurrence_date: string | null; amount_paid: number }): Promise<any | null>;
  findRemittanceItemByNossoNumero(nossoNumero: string, transaction?: Transaction): Promise<any | null>;
  findRemittanceItemByNossoNumeroForUpdate(nossoNumero: string, transaction: Transaction): Promise<any | null>;
  updateRemittanceItem(id: number | string, data: Record<string, any>, transaction: Transaction): Promise<any>;

  findReceivableByIdForUpdate(id: number | string, transaction: Transaction): Promise<any | null>;
  updateReceivablePayment(id: number | string, data: Record<string, any>, transaction: Transaction): Promise<any>;

  listReturnFiles(pagination: { limit?: number; offset?: number }): Promise<{ rows: any[]; count: number }>;
  listOccurrencesByReturnFile(returnFileId: number | string): Promise<any[]>;
}

/**
 * Interface (contrato) de repositório da Cobrança CNAB 240 v1
 * (remessa/retorno, módulo `financial`).
 *
 * Define os métodos que qualquer implementação de persistência deve
 * fornecer. A camada de aplicação (use cases) depende apenas desta
 * interface, nunca de uma implementação concreta.
 */
class CnabRepository {
  async findBankingConfig() { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findBankingConfig não implementado.');
  }

  async findBankingConfigForUpdate(transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findBankingConfigForUpdate não implementado.');
  }

  async createOrUpdateBankingConfig(data: Record<string, any>) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.createOrUpdateBankingConfig não implementado.');
  }

  async incrementBankingCounters(id: number | string, data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.incrementBankingCounters não implementado.');
  }

  async findReceivablesByIds(ids: Array<number | string>, transaction?: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findReceivablesByIds não implementado.');
  }

  async findOpenRemittanceItemsByReceivableIds(receivableIds: Array<number | string>) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findOpenRemittanceItemsByReceivableIds não implementado.');
  }

  async createRemittance(data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.createRemittance não implementado.');
  }

  async createRemittanceItems(items: Array<Record<string, any>>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.createRemittanceItems não implementado.');
  }

  async findRemittanceById(id: number | string) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findRemittanceById não implementado.');
  }

  async listRemittances(pagination: { limit?: number; offset?: number }) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.listRemittances não implementado.');
  }

  async createReturnFile(data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.createReturnFile não implementado.');
  }

  async updateReturnFile(id: number | string, data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.updateReturnFile não implementado.');
  }

  async createReturnOccurrence(data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.createReturnOccurrence não implementado.');
  }

  async findExistingOccurrence(where: Record<string, any>) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findExistingOccurrence não implementado.');
  }

  async findRemittanceItemByNossoNumero(nossoNumero: string, transaction?: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findRemittanceItemByNossoNumero não implementado.');
  }

  async findRemittanceItemByNossoNumeroForUpdate(nossoNumero: string, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findRemittanceItemByNossoNumeroForUpdate não implementado.');
  }

  async updateRemittanceItem(id: number | string, data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.updateRemittanceItem não implementado.');
  }

  async findReceivableByIdForUpdate(id: number | string, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.findReceivableByIdForUpdate não implementado.');
  }

  async updateReceivablePayment(id: number | string, data: Record<string, any>, transaction: Transaction) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.updateReceivablePayment não implementado.');
  }

  async listReturnFiles(pagination: { limit?: number; offset?: number }) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.listReturnFiles não implementado.');
  }

  async listOccurrencesByReturnFile(returnFileId: number | string) { // eslint-disable-line no-unused-vars
    throw new Error('CnabRepository.listOccurrencesByReturnFile não implementado.');
  }
}

module.exports = CnabRepository;
