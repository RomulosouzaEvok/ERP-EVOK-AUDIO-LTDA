/**
 * Contrato do repositorio do Auditor Inteligente (relatórios de
 * consistência de estoque, vendas, compras e financeiro).
 *
 * @module modules/intelligentAuditor/domain/repositories/IntelligentAuditorRepository
 */

class IntelligentAuditorRepository {
  /** @returns Produtos com estoque negativo e produtos sem movimentação. @throws {Error} Se nao implementado. */
  public async auditStock(): Promise<any> {
    throw new Error('IntelligentAuditorRepository.auditStock não implementado.');
  }

  /** @returns Indicadores de consistência de vendas. @throws {Error} Se nao implementado. */
  public async auditSales(): Promise<any> {
    throw new Error('IntelligentAuditorRepository.auditSales não implementado.');
  }

  /** @returns Compras paradas há mais de 30 dias. @throws {Error} Se nao implementado. */
  public async auditPurchases(): Promise<any> {
    throw new Error('IntelligentAuditorRepository.auditPurchases não implementado.');
  }

  /** @returns Indicadores financeiros (contas vencidas e totais por status). @throws {Error} Se nao implementado. */
  public async auditFinancial(): Promise<any> {
    throw new Error('IntelligentAuditorRepository.auditFinancial não implementado.');
  }
}

export = IntelligentAuditorRepository;
