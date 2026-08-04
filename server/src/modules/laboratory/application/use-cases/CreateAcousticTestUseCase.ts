/**
 * Caso de uso: registro de um resultado de teste de laboratorio (acustico /
 * Thiele-Small) sobre um produto, lote ou numero de serie.
 *
 * Regras de negocio:
 * - `tester_id` e SEMPRE o usuario autenticado (JWT) — nunca aceito do body.
 * - `passed` e calculado automaticamente: `true` se `result` foi informado
 *   e esta dentro de `[specification_min, specification_max]` (quando
 *   ambos os limites forem informados; se apenas um limite for informado, a
 *   comparacao e feita so contra ele). Se `result` for `null`/`undefined` e
 *   nenhum limite de especificacao for informado, lanca {@link ValidationError}
 *   (nao ha como determinar aprovacao/reprovacao sem faixa nem medida), com
 *   `details: { product_id, test_type, missing_fields }`.
 * - Se `passed = false` e `create_rnc_on_fail = true`, cria uma
 *   Nao-Conformidade via {@link CreateNonConformityUseCase} (reaproveitado,
 *   sem duplicar logica de bloqueio de lote) e grava `non_conformity_id`
 *   no teste.
 * - Bloco 4/UC-42-E (docs/governance/TODO.md; BUSINESS_RULES.md §12/§13):
 *   quando `consumed_quantity` e informado (> 0) — teste destrutivo — o
 *   registro do teste e o debito automatico do Deposito LABORATORIO
 *   acontecem na MESMA transacao Sequelize (nao exige lancamento manual
 *   separado). Ausente/0 nao debita nada (comportamento anterior mantido).
 *   Saldo insuficiente no Laboratorio propaga o 422 didatico ja lancado por
 *   `warehouseStockService.removeFromWarehouse` (rollback da criacao do
 *   teste tambem).
 *
 * @module modules/laboratory/application/use-cases/CreateAcousticTestUseCase
 */

import UseCase from '../../../../shared/application/UseCase';
import { ValidationError } from '../../../../errors';
import LaboratoryRepository from '../../domain/repositories/LaboratoryRepository';
import { sequelize } from '../../../../config/database';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CreateNonConformityUseCase = require('../../../nonConformities/application/use-cases/CreateNonConformityUseCase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SequelizeNonConformitiesRepository = require('../../../nonConformities/infrastructure/sequelize/SequelizeNonConformitiesRepository');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WarehouseStockService: any = require('../../../../services/warehouseStockService');

/** Codigo do deposito de Laboratorio (Bloco 4, BUSINESS_RULES.md §12/§9, UC-39/UC-42-E). */
const LABORATORY_WAREHOUSE_CODE = 'LABORATORIO';

type CreateAcousticTestInput = {
  product_id: number;
  serial_number?: string;
  lot_number?: string;
  production_order_id?: number;
  test_type: string;
  parameters?: Record<string, unknown>;
  result?: number;
  unit?: string;
  specification_min?: number;
  specification_max?: number;
  curve_data?: Record<string, unknown>;
  notes?: string;
  create_rnc_on_fail?: boolean;
  /** Quantidade consumida (destruida) do produto testado, em teste destrutivo (UC-42-E). */
  consumed_quantity?: number;
  testerId: number;
};

/**
 * Calcula `passed` a partir do resultado medido e da faixa de especificacao.
 *
 * @param result - Valor medido (pode ser `undefined`/`null`).
 * @param min - Limite minimo da especificacao (opcional).
 * @param max - Limite maximo da especificacao (opcional).
 * @returns `true`/`false` se determinavel, `undefined` se nao houver dados suficientes.
 */
function computePassed(
  result: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined
): boolean | undefined {
  if (result === null || result === undefined) return undefined;
  if (min === null || min === undefined) {
    if (max === null || max === undefined) return undefined;
    return result <= max;
  }
  if (max === null || max === undefined) {
    return result >= min;
  }
  return result >= min && result <= max;
}

class CreateAcousticTestUseCase extends UseCase<CreateAcousticTestInput, any> {
  private readonly laboratoryRepository: LaboratoryRepository;

  constructor(laboratoryRepository: LaboratoryRepository) {
    super();
    this.laboratoryRepository = laboratoryRepository;
  }

  async execute(input: CreateAcousticTestInput): Promise<any> {
    const {
      product_id,
      serial_number,
      lot_number,
      production_order_id,
      test_type,
      parameters,
      result,
      unit,
      specification_min,
      specification_max,
      curve_data,
      notes,
      create_rnc_on_fail,
      consumed_quantity,
      testerId,
    } = input;

    const passed = computePassed(result ?? null, specification_min ?? null, specification_max ?? null);

    if (passed === undefined) {
      throw new ValidationError(
        'Informe "result" ou uma faixa de especificacao (specification_min/specification_max) para determinar a aprovacao do teste.',
        {
          product_id,
          test_type,
          missing_fields: ['result', 'specification_min', 'specification_max'],
        }
      );
    }

    // Teste destrutivo (consumed_quantity > 0): consumo do Deposito
    // LABORATORIO vinculado ao teste, na MESMA transacao do registro do
    // AcousticTestResult (UC-42-E) — nunca exige lancamento manual
    // separado. Ausente/0 => nenhum debito (comportamento anterior).
    const consumedQuantity = consumed_quantity !== undefined && consumed_quantity !== null && Number(consumed_quantity) > 0
      ? Number(consumed_quantity)
      : 0;

    const test = await sequelize.transaction(async (transaction: any) => {
      const created = await this.laboratoryRepository.createTest({
        product_id,
        serial_number: serial_number ?? null,
        lot_number: lot_number ?? null,
        production_order_id: production_order_id ?? null,
        test_type,
        tester_id: testerId,
        parameters: parameters ?? null,
        result: result ?? null,
        unit: unit ?? null,
        specification_min: specification_min ?? null,
        specification_max: specification_max ?? null,
        passed,
        curve_data: curve_data ?? null,
        notes: notes ?? null,
        consumed_quantity: consumedQuantity || null,
      }, transaction);

      if (consumedQuantity > 0) {
        const laboratoryWarehouse = await WarehouseStockService.getWarehouseByCode(LABORATORY_WAREHOUSE_CODE, transaction);
        await WarehouseStockService.removeFromWarehouse(product_id, laboratoryWarehouse.id, consumedQuantity, transaction);
      }

      return created;
    });

    if (!passed && create_rnc_on_fail) {
      const nonConformitiesRepository = new SequelizeNonConformitiesRepository();
      const createNonConformityUseCase = new CreateNonConformityUseCase(nonConformitiesRepository);

      const measured = result !== undefined && result !== null ? result : 'N/D';
      const rangeDesc = `[${specification_min ?? '-inf'}, ${specification_max ?? '+inf'}]`;

      const nonConformity = await createNonConformityUseCase.execute({
        product_id,
        production_order_id,
        description: `Reprovacao no teste de laboratorio "${test_type}": medido=${measured}${unit ? ` ${unit}` : ''}, faixa esperada=${rangeDesc}.`,
        severity: 'major',
        origin: 'final',
        defect_type: 'acoustic',
        lot_number,
        reportedBy: testerId,
      });

      const updated = await this.laboratoryRepository.updateTest(test.id, {
        non_conformity_id: nonConformity.id,
      });
      return updated ?? test;
    }

    return test;
  }
}

export = CreateAcousticTestUseCase;
