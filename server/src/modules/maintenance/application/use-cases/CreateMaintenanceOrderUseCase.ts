/**
 * Use case: criar uma nova ordem de manutenção.
 *
 * Corrigido em 2026-08-12 (achado de UAT — primeira escrita real do módulo):
 * o use case gravava colunas que NÃO existem no model (`description`) e
 * omitia as obrigatórias (`order_number` NOT NULL UNIQUE,
 * `problem_description` NOT NULL), então **todo** `POST /api/maintenance`
 * morria em 500 de validação Sequelize. O default de prioridade era
 * `'medium'`, valor que nem existe no enum (`low/normal/high/emergency`).
 * Typecheck e o teste unitário de dublê passavam — o dublê aceitava qualquer
 * chave — que é exatamente a classe de defeito de
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`.
 * A prova real agora está em
 * `server/tests/integration/maintenance-order-lifecycle.test.ts`.
 *
 * @module modules/maintenance/application/use-cases/CreateMaintenanceOrderUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';
import MaintenanceRepository from '../../domain/repositories/MaintenanceRepository';
import { sequelize } from '../../../../config/database';

interface CreateMaintenanceOrderInput {
  asset_id?: number;
  description?: string;
  priority?: string;
  maintenance_type?: string;
  reportedBy: number;
}

class CreateMaintenanceOrderUseCase extends UseCase<CreateMaintenanceOrderInput, any> {
  private readonly maintenanceRepository: MaintenanceRepository;

  /** @param maintenanceRepository - Repositorio de ordens de manutenção. */
  public constructor(maintenanceRepository: MaintenanceRepository) {
    super();
    this.maintenanceRepository = maintenanceRepository;
  }

  /**
   * @param input - Dados da ordem (asset_id e description obrigatórios) e id do usuário autenticado.
   * @returns Ordem de manutenção criada (com número `OM-<ano>-NNNN` gerado).
   * @throws {ValidationError} Se `asset_id` ou `description` estiverem ausentes.
   */
  public async execute(input: CreateMaintenanceOrderInput): Promise<any> {
    const { asset_id, description, priority, maintenance_type, reportedBy } = input;
    if (!asset_id || !description) {
      throw new ValidationError('Ativo e descrição são obrigatórios');
    }

    // Transação: numeração serializada (advisory lock) + INSERT no mesmo
    // escopo, para duas criações concorrentes nunca colidirem no UNIQUE.
    const t = await sequelize.transaction();
    try {
      const yearPrefix = `OM-${new Date().getFullYear()}`;
      const orderNumber = await this.maintenanceRepository.nextOrderNumberForYear(yearPrefix, t);

      const order = await this.maintenanceRepository.create({
        order_number: orderNumber,
        asset_id,
        problem_description: description,
        priority: priority || 'normal',
        maintenance_type: maintenance_type || 'corrective',
        reported_by: reportedBy,
        created_by: reportedBy,
        status: 'open'
      }, t);

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

export = CreateMaintenanceOrderUseCase;
