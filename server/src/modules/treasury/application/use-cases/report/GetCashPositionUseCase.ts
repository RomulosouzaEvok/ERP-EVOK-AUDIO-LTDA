/**
 * Caso de uso: Posição de Caixa consolidada, cobrindo o fluxo do endpoint
 * `GET /api/treasury/cash-position`. Relatório 100% derivado (sem tabela
 * própria): soma o saldo atual de todas as `treasury_bank_accounts` ativas
 * (por tipo de conta e total geral) e cruza com o resumo de títulos em
 * aberto de `accounts_payable`/`accounts_receivable` (mesmo critério de
 * `GetCashFlowProjectionUseCase` do módulo `financial`, sem reimplementar a
 * query — apenas reagregado aqui em totais simples de "hoje", não em baldes
 * semanais).
 *
 * @module modules/treasury/application/use-cases/report/GetCashPositionUseCase
 */

import UseCase from '../../../../../shared/application/UseCase';
import TreasuryRepository from '../../../domain/repositories/TreasuryRepository';

class GetCashPositionUseCase extends UseCase<void, any> {
  private readonly treasuryRepository: TreasuryRepository;

  constructor(treasuryRepository: TreasuryRepository) {
    super();
    this.treasuryRepository = treasuryRepository;
  }

  async execute() {
    const accounts = await this.treasuryRepository.listActiveBankAccountsForCashPosition();
    const openTitles = await this.treasuryRepository.getOpenPayablesAndReceivablesSummary();

    const balanceByType: Record<string, number> = { corrente: 0, poupanca: 0, aplicacao: 0 };
    let totalBankBalance = 0;
    for (const account of accounts) {
      const balance = Number(account.current_balance) || 0;
      balanceByType[account.account_type] = (balanceByType[account.account_type] || 0) + balance;
      totalBankBalance += balance;
    }

    const projectedBalance = totalBankBalance + openTitles.totalReceivable - openTitles.totalPayable;

    return {
      as_of: new Date().toISOString().slice(0, 10),
      bank_accounts: {
        count: accounts.length,
        balance_by_type: balanceByType,
        total_balance: totalBankBalance,
        accounts: accounts.map((a: any) => ({
          id: a.id,
          bank_name: a.bank_name,
          agency: a.agency,
          account_number: a.account_number,
          account_type: a.account_type,
          current_balance: Number(a.current_balance) || 0,
        })),
      },
      open_titles: {
        total_receivable: openTitles.totalReceivable,
        total_payable: openTitles.totalPayable,
        overdue_receivable: openTitles.overdueReceivable,
        overdue_payable: openTitles.overduePayable,
      },
      projected_balance: projectedBalance,
    };
  }
}

export = GetCashPositionUseCase;
