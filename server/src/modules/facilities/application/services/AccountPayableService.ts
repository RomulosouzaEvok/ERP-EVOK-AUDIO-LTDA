/**
 * Interface de serviço para criação de `AccountPayable` a partir do
 * módulo `facilities` (RF-FAC-034/058 — multa paga pela empresa gera
 * título em "Frota"), sem import direto do model/módulo Financeiro.
 * Implementada por `AccountPayableServiceAdapter`, mesmo padrão de
 * `server/src/modules/juridico/application/services/AccountPayableService.ts`.
 *
 * @module modules/facilities/application/services/AccountPayableService
 */

interface CreatePayableData {
  description: string;
  amount: number | string;
  due_date: string;
  category?: string;
  cost_center_id?: number | null;
}

class AccountPayableService {
  public async create(_data: CreatePayableData): Promise<any> {
    throw new Error('AccountPayableService.create não implementado.');
  }
}

export = AccountPayableService;
