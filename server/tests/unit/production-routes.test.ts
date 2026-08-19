/**
 * Test: Roteiro de Producao (gap G5) — camada de dominio e de aplicacao.
 *
 * Cobre as regras que a API de roteiro tem de garantir de verdade:
 * - sequencia de operacoes sem buraco e sem duplicidade (1..N contigua);
 * - `step_code` unico dentro do roteiro;
 * - vinculo com centro de trabalho EXISTENTE e ATIVO;
 * - imutabilidade do roteiro liberado (o que protege as OPs ja abertas de
 *   uma troca de roteiro) e o caminho de nova revisao;
 * - unicidade de `route_code` e de `(produto, revisao)`;
 * - guarda de historico: etapa ja apontada nunca some.
 *
 * TODO teste de erro afirma `error.details.rule` — o codigo de regra e parte
 * do contrato da API (ver `docs/arquitetura/API.md` §36), nao so a mensagem.
 *
 * @module tests/unit/production-routes
 */

import CreateProductionRouteUseCase = require('../../src/modules/production/application/use-cases/CreateProductionRouteUseCase');
import UpdateProductionRouteUseCase = require('../../src/modules/production/application/use-cases/UpdateProductionRouteUseCase');
import ReplaceProductionRouteStepsUseCase = require('../../src/modules/production/application/use-cases/ReplaceProductionRouteStepsUseCase');
import ActivateProductionRouteUseCase = require('../../src/modules/production/application/use-cases/ActivateProductionRouteUseCase');
import InactivateProductionRouteUseCase = require('../../src/modules/production/application/use-cases/InactivateProductionRouteUseCase');
import ReviseProductionRouteUseCase = require('../../src/modules/production/application/use-cases/ReviseProductionRouteUseCase');
import RemoveProductionRouteUseCase = require('../../src/modules/production/application/use-cases/RemoveProductionRouteUseCase');
import GetProductionRouteByIdUseCase = require('../../src/modules/production/application/use-cases/GetProductionRouteByIdUseCase');
import ListProductionRoutesUseCase = require('../../src/modules/production/application/use-cases/ListProductionRoutesUseCase');
import {
  PRODUCTION_ROUTE_RULES,
  normalizeAndValidateSteps,
  computeTotalStandardTimeMinutes,
  computeTotalSetupTimeMinutes,
} from '../../src/modules/production/domain/productionRouteRules';
import { ConflictError, BusinessRuleError, NotFoundError } from '../../src/errors';

/** Transacao falsa: os use cases so a repassam ao repositorio (que e mock). */
const TX = { id: 'tx' } as any;

/** Etapa valida minima. */
const step = (sequence: number, overrides: Record<string, any> = {}) => ({
  sequence,
  step_code: `OP${sequence}0`,
  name: `Operacao ${sequence}`,
  standard_time_minutes: 10,
  setup_time_minutes: 5,
  ...overrides,
});

/**
 * Captura o erro lancado por uma promise, para permitir asserts sobre
 * `details.rule` (o `rejects.toBeInstanceOf` sozinho nao da acesso ao erro).
 *
 * @param promise - Promise que deve rejeitar.
 * @returns O erro capturado.
 */
async function catchError(promise: Promise<unknown>): Promise<any> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Esperava que a promise rejeitasse, mas ela resolveu.');
}

/** Repositorio mock com os defaults do "caminho feliz". */
function buildRepository(overrides: Record<string, any> = {}) {
  return {
    listRoutes: jest.fn(async () => ({ rows: [], count: 0 })),
    findRouteById: jest.fn(async () => null),
    findRouteByIdRaw: jest.fn(async (id: number) => ({ id, status: 'draft', product_id: 7, route_code: 'ROT-001', revision: '00' })),
    findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'draft', product_id: 7, route_code: 'ROT-001', revision: '00' })),
    findRouteByCode: jest.fn(async () => null),
    findRouteByProductAndRevision: jest.fn(async () => null),
    findActiveRouteByProduct: jest.fn(async () => null),
    listRevisionsByProduct: jest.fn(async () => ['00']),
    createRoute: jest.fn(async (data: any) => ({ id: 99, ...data })),
    updateRouteFields: jest.fn(async () => undefined),
    deleteRoute: jest.fn(async () => undefined),
    listSteps: jest.fn(async () => []),
    deleteStepsByRoute: jest.fn(async () => undefined),
    createStep: jest.fn(async (data: any) => ({ id: Math.random(), ...data })),
    countTrackingByRoute: jest.fn(async () => 0),
    findProductByIdRaw: jest.fn(async (id: number) => ({ id, code: 'ALT-15', name: 'Alto-falante 15"', status: 'active', product_type: 'finished' })),
    findItemIdByProductCode: jest.fn(async () => null),
    findWorkCentersByIds: jest.fn(async (ids: number[]) => ids.map((id) => ({ id, code: `WC-${id}`, name: `Centro ${id}`, active: true }))),
    ...overrides,
  };
}

describe('productionRouteRules — sequencia de operacoes', () => {
  it('ordena por sequence e normaliza step_code para uppercase', () => {
    const steps = normalizeAndValidateSteps([
      { sequence: 2, step_code: ' mont ', name: 'Montagem' },
      { sequence: 1, step_code: 'corte', name: 'Corte' },
    ]);

    expect(steps.map((s) => s.sequence)).toEqual([1, 2]);
    expect(steps.map((s) => s.step_code)).toEqual(['CORTE', 'MONT']);
    expect(steps[0].standard_time_minutes).toBe(0);
    expect(steps[0].is_active).toBe(true);
  });

  it('rejeita sequencia duplicada com G5-SEQ-DUP', () => {
    let error: any;
    try {
      normalizeAndValidateSteps([step(1), step(1, { step_code: 'OP11' })]);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.SEQUENCE_DUPLICATE);
    expect(error.details.duplicated).toEqual([1]);
  });

  it('rejeita buraco na sequencia (1, 3) com G5-SEQ-GAP', () => {
    let error: any;
    try {
      normalizeAndValidateSteps([step(1), step(3)]);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.SEQUENCE_GAP);
    expect(error.details.expected).toEqual([1, 2]);
    expect(error.details.received).toEqual([1, 3]);
  });

  it('rejeita sequencia que nao comeca em 1 com G5-SEQ-GAP', () => {
    let error: any;
    try {
      normalizeAndValidateSteps([step(10), step(20)]);
    } catch (caught) {
      error = caught;
    }

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.SEQUENCE_GAP);
  });

  it('rejeita step_code repetido no mesmo roteiro com G5-STEP-CODE-DUP', () => {
    let error: any;
    try {
      normalizeAndValidateSteps([step(1, { step_code: 'CORTE' }), step(2, { step_code: 'corte' })]);
    } catch (caught) {
      error = caught;
    }

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.STEP_CODE_DUPLICATE);
    expect(error.details.duplicated).toEqual(['CORTE']);
  });

  it('soma o tempo padrao apenas das etapas ativas, sem incluir setup', () => {
    const steps = normalizeAndValidateSteps([
      step(1, { standard_time_minutes: 10, setup_time_minutes: 30 }),
      step(2, { standard_time_minutes: 2.5, setup_time_minutes: 1 }),
      step(3, { standard_time_minutes: 99, setup_time_minutes: 99, is_active: false }),
    ]);

    expect(computeTotalStandardTimeMinutes(steps)).toBe(12.5);
    expect(computeTotalSetupTimeMinutes(steps)).toBe(31);
  });
});

describe('CreateProductionRouteUseCase', () => {
  const baseInput = {
    product_id: 7,
    route_code: ' rot-alt-15 ',
    description: 'Roteiro principal',
    created_by: 42,
    transaction: TX,
  };

  it('cria o roteiro sempre em draft, com created_by do JWT e codigo normalizado', async () => {
    const repository = buildRepository();
    const useCase = new CreateProductionRouteUseCase(repository as any);

    const route = await useCase.execute({ ...baseInput, steps: [step(1), step(2)] });

    expect(repository.createRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 7,
        route_code: 'ROT-ALT-15',
        revision: '00',
        status: 'draft',
        created_by: 42,
        approved_by: null,
        approved_at: null,
        total_standard_time_minutes: 20,
      }),
      TX,
    );
    expect(repository.createStep).toHaveBeenCalledTimes(2);
    expect(route.status).toBe('draft');
  });

  it('rejeita produto que nao e acabado nem subconjunto com G5-PRODUCT-NOT-PRODUCIBLE', async () => {
    const repository = buildRepository({
      findProductByIdRaw: jest.fn(async (id: number) => ({ id, code: 'MP-1', name: 'Ima', status: 'active', product_type: 'raw_material' })),
    });
    const useCase = new CreateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute(baseInput));

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.PRODUCT_NOT_PRODUCIBLE);
    expect(repository.createRoute).not.toHaveBeenCalled();
  });

  it('rejeita produto inativo com G5-PRODUCT-NOT-PRODUCIBLE', async () => {
    const repository = buildRepository({
      findProductByIdRaw: jest.fn(async (id: number) => ({ id, code: 'ALT-15', name: 'Alto-falante', status: 'inactive', product_type: 'finished' })),
    });
    const useCase = new CreateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute(baseInput));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.PRODUCT_NOT_PRODUCIBLE);
  });

  it('lanca NotFoundError (404) quando o produto nao existe', async () => {
    const repository = buildRepository({ findProductByIdRaw: jest.fn(async () => null) });
    const useCase = new CreateProductionRouteUseCase(repository as any);

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita route_code duplicado com 409 e G5-ROUTE-CODE-DUP', async () => {
    const repository = buildRepository({ findRouteByCode: jest.fn(async () => ({ id: 5, route_code: 'ROT-ALT-15' })) });
    const useCase = new CreateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute(baseInput));

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.statusCode).toBe(409);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_CODE_DUPLICATE);
  });

  it('rejeita revisao ja existente para o mesmo produto com G5-REVISION-DUP', async () => {
    const repository = buildRepository({ findRouteByProductAndRevision: jest.fn(async () => ({ id: 5, revision: '00' })) });
    const useCase = new CreateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute(baseInput));

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.REVISION_DUPLICATE);
  });

  it('rejeita etapa apontando para centro de trabalho inexistente com G5-WC-NOT-FOUND', async () => {
    const repository = buildRepository({ findWorkCentersByIds: jest.fn(async () => []) });
    const useCase = new CreateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ ...baseInput, steps: [step(1, { work_center_id: 404 })] }));

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.WORK_CENTER_NOT_FOUND);
    expect(error.details.work_center_ids).toEqual([404]);
    expect(repository.createRoute).not.toHaveBeenCalled();
  });

  it('rejeita etapa apontando para centro de trabalho inativo com G5-WC-INACTIVE', async () => {
    const repository = buildRepository({
      findWorkCentersByIds: jest.fn(async (ids: number[]) => ids.map((id) => ({ id, code: 'WC-OFF', name: 'Desativado', active: false }))),
    });
    const useCase = new CreateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ ...baseInput, steps: [step(1, { work_center_id: 3 })] }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.WORK_CENTER_INACTIVE);
    expect(error.details.work_center_ids).toEqual([3]);
  });

  it('preenche o campo legado work_center com o codigo do centro estruturado', async () => {
    const repository = buildRepository();
    const useCase = new CreateProductionRouteUseCase(repository as any);

    await useCase.execute({ ...baseInput, steps: [step(1, { work_center_id: 8 })] });

    expect(repository.createStep).toHaveBeenCalledWith(
      expect.objectContaining({ work_center_id: 8, work_center: 'WC-8' }),
      TX,
    );
  });

  it('faz dual-write de item_id quando ha Item com o mesmo codigo do produto', async () => {
    const repository = buildRepository({
      findItemIdByProductCode: jest.fn(async () => '11111111-2222-3333-4444-555555555555'),
    });
    const useCase = new CreateProductionRouteUseCase(repository as any);

    await useCase.execute(baseInput);

    expect(repository.findItemIdByProductCode).toHaveBeenCalledWith('ALT-15', TX);
    expect(repository.createRoute).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: '11111111-2222-3333-4444-555555555555' }),
      TX,
    );
  });
});

describe('UpdateProductionRouteUseCase — imutabilidade do roteiro liberado', () => {
  it('rejeita alteracao de cabecalho de roteiro ativo com G5-ROUTE-NOT-DRAFT', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'active', product_id: 7, route_code: 'ROT-001', revision: '00' })),
    });
    const useCase = new UpdateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, description: 'nova', transaction: TX }));

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_NOT_DRAFT);
    expect(error.details.status).toBe('active');
    expect(repository.updateRouteFields).not.toHaveBeenCalled();
  });

  it('rejeita alteracao de roteiro superseded com G5-ROUTE-NOT-DRAFT', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'superseded', product_id: 7, route_code: 'ROT-001', revision: '00' })),
    });
    const useCase = new UpdateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, description: 'x', transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_NOT_DRAFT);
  });

  it('atualiza o rascunho normalizando route_code', async () => {
    const repository = buildRepository();
    const useCase = new UpdateProductionRouteUseCase(repository as any);

    await useCase.execute({ id: 1, route_code: ' rot-002 ', description: 'ajuste', transaction: TX });

    expect(repository.updateRouteFields).toHaveBeenCalledWith(
      1,
      { route_code: 'ROT-002', description: 'ajuste' },
      TX,
    );
  });

  it('rejeita route_code de outro roteiro com G5-ROUTE-CODE-DUP', async () => {
    const repository = buildRepository({ findRouteByCode: jest.fn(async () => ({ id: 77, route_code: 'ROT-002' })) });
    const useCase = new UpdateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, route_code: 'ROT-002', transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_CODE_DUPLICATE);
  });

  it('lanca NotFoundError (404) quando o roteiro nao existe', async () => {
    const repository = buildRepository({ findRouteByIdForUpdate: jest.fn(async () => null) });
    const useCase = new UpdateProductionRouteUseCase(repository as any);

    await expect(useCase.execute({ id: 404, transaction: TX })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ReplaceProductionRouteStepsUseCase', () => {
  it('substitui as etapas do rascunho e recalcula o tempo padrao total', async () => {
    const repository = buildRepository();
    const useCase = new ReplaceProductionRouteStepsUseCase(repository as any);

    await useCase.execute({
      id: 1,
      steps: [step(1, { standard_time_minutes: 4 }), step(2, { standard_time_minutes: 6 })],
      transaction: TX,
    });

    expect(repository.deleteStepsByRoute).toHaveBeenCalledWith(1, TX);
    expect(repository.createStep).toHaveBeenCalledTimes(2);
    expect(repository.updateRouteFields).toHaveBeenCalledWith(1, { total_standard_time_minutes: 10 }, TX);
  });

  it('rejeita substituicao em roteiro ja liberado com G5-ROUTE-NOT-DRAFT', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'active', product_id: 7, route_code: 'ROT-001' })),
    });
    const useCase = new ReplaceProductionRouteStepsUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, steps: [step(1)], transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_NOT_DRAFT);
    expect(repository.deleteStepsByRoute).not.toHaveBeenCalled();
  });

  it('rejeita reescrita quando ja ha apontamento vinculado, com G5-ROUTE-IN-USE', async () => {
    const repository = buildRepository({ countTrackingByRoute: jest.fn(async () => 3) });
    const useCase = new ReplaceProductionRouteStepsUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, steps: [step(1)], transaction: TX }));

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_IN_USE);
    expect(error.details.tracking_count).toBe(3);
    expect(repository.deleteStepsByRoute).not.toHaveBeenCalled();
  });

  it('rejeita buraco de sequencia antes de apagar qualquer etapa (G5-SEQ-GAP)', async () => {
    const repository = buildRepository();
    const useCase = new ReplaceProductionRouteStepsUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, steps: [step(1), step(4)], transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.SEQUENCE_GAP);
    expect(repository.deleteStepsByRoute).not.toHaveBeenCalled();
  });
});

describe('ActivateProductionRouteUseCase', () => {
  it('ativa o rascunho, grava approved_by do JWT e torna superseded a revisao ativa anterior', async () => {
    const repository = buildRepository({
      listSteps: jest.fn(async () => [step(1, { is_active: true }), step(2, { is_active: true })]),
      findActiveRouteByProduct: jest.fn(async () => ({ id: 55, status: 'active', product_id: 7 })),
    });
    const useCase = new ActivateProductionRouteUseCase(repository as any);

    const result = await useCase.execute({ id: 1, approved_by: 42, transaction: TX });

    expect(repository.updateRouteFields).toHaveBeenCalledWith(55, { status: 'superseded' }, TX);
    expect(repository.updateRouteFields).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'active', approved_by: 42, total_standard_time_minutes: 20 }),
      TX,
    );
    expect(result.superseded_route_id).toBe(55);
  });

  it('rejeita ativacao de roteiro sem etapa com G5-SEQ-EMPTY', async () => {
    const repository = buildRepository({ listSteps: jest.fn(async () => []) });
    const useCase = new ActivateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, approved_by: 42, transaction: TX }));

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.SEQUENCE_EMPTY);
    expect(repository.updateRouteFields).not.toHaveBeenCalled();
  });

  it('CASE-013/FIND-ERP-009: bloqueia autoativacao antes de validar etapas', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'draft', product_id: 7, created_by: 42 })),
      listSteps: jest.fn(async () => [step(1)]),
    });
    const useCase = new ActivateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, approved_by: 42, transaction: TX }));

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe('CASE-013-PRODUCTION-ROUTE-ACTIVATE');
    expect(repository.listSteps).not.toHaveBeenCalled();
    expect(repository.updateRouteFields).not.toHaveBeenCalled();
  });

  it('rejeita ativacao de roteiro ja superseded com G5-ROUTE-STATUS-TRANSITION', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'superseded', product_id: 7 })),
    });
    const useCase = new ActivateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, approved_by: 42, transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_STATUS_TRANSITION);
    expect(error.details.current).toBe('superseded');
    expect(error.details.next).toBe('active');
  });

  it('rejeita ativacao quando um centro de trabalho foi desativado depois do rascunho (G5-WC-INACTIVE)', async () => {
    const repository = buildRepository({
      listSteps: jest.fn(async () => [step(1, { work_center_id: 9 })]),
      findWorkCentersByIds: jest.fn(async () => [{ id: 9, code: 'WC-9', name: 'Prensa', active: false }]),
    });
    const useCase = new ActivateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, approved_by: 42, transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.WORK_CENTER_INACTIVE);
    expect(repository.updateRouteFields).not.toHaveBeenCalled();
  });

  it('nao mexe em nenhum outro roteiro quando o produto ainda nao tem revisao ativa', async () => {
    const repository = buildRepository({ listSteps: jest.fn(async () => [step(1)]) });
    const useCase = new ActivateProductionRouteUseCase(repository as any);

    const result = await useCase.execute({ id: 1, approved_by: 42, transaction: TX });

    expect(result.superseded_route_id).toBeNull();
    expect(repository.updateRouteFields).toHaveBeenCalledTimes(1);
  });

  it('reativa um roteiro inactive (transicao permitida)', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'inactive', product_id: 7 })),
      listSteps: jest.fn(async () => [step(1)]),
    });
    const useCase = new ActivateProductionRouteUseCase(repository as any);

    await expect(useCase.execute({ id: 1, approved_by: 42, transaction: TX })).resolves.toBeDefined();
  });
});

describe('InactivateProductionRouteUseCase', () => {
  it('inativa um roteiro ativo', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'active', product_id: 7, created_by: 7 })),
    });
    const useCase = new InactivateProductionRouteUseCase(repository as any);

    await useCase.execute({ id: 1, approved_by: 42, transaction: TX });

    expect(repository.updateRouteFields).toHaveBeenCalledWith(1, { status: 'inactive' }, TX);
  });

  it('CASE-013/FIND-ERP-009: bloqueia autoinativacao antes de alterar status', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'active', product_id: 7, created_by: 42 })),
    });
    const useCase = new InactivateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, approved_by: 42, transaction: TX }));

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details.rule).toBe('CASE-013-PRODUCTION-ROUTE-INACTIVATE');
    expect(repository.updateRouteFields).not.toHaveBeenCalled();
  });

  it('rejeita inativacao de rascunho com G5-ROUTE-STATUS-TRANSITION', async () => {
    const repository = buildRepository();
    const useCase = new InactivateProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_STATUS_TRANSITION);
    expect(error.details.allowed).toEqual(['active']);
  });
});

describe('ReviseProductionRouteUseCase — caminho oficial para mudar um roteiro liberado', () => {
  it('clona cabecalho e etapas em um novo rascunho, sugerindo a proxima revisao', async () => {
    const repository = buildRepository({
      findRouteByIdRaw: jest.fn(async (id: number) => ({
        id, status: 'active', product_id: 7, route_code: 'ROT-001', revision: '00',
        description: 'original', item_id: null, total_standard_time_minutes: 20,
      })),
      listRevisionsByProduct: jest.fn(async () => ['00']),
      listSteps: jest.fn(async () => [step(1), step(2)]),
    });
    const useCase = new ReviseProductionRouteUseCase(repository as any);

    const draft = await useCase.execute({ id: 1, created_by: 42, transaction: TX });

    expect(repository.createRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 7,
        route_code: 'ROT-001-R01',
        revision: '01',
        status: 'draft',
        created_by: 42,
        approved_by: null,
      }),
      TX,
    );
    expect(repository.createStep).toHaveBeenCalledTimes(2);
    expect(draft.status).toBe('draft');
    // O roteiro de origem permanece intacto: a revisao anterior so vira
    // `superseded` na ATIVACAO da nova, nunca na criacao do rascunho.
    expect(repository.updateRouteFields).not.toHaveBeenCalled();
  });

  it('rejeita revisao informada que ja existe, com G5-REVISION-DUP', async () => {
    const repository = buildRepository({
      listRevisionsByProduct: jest.fn(async () => ['00', '01']),
    });
    const useCase = new ReviseProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, revision: '01', created_by: 42, transaction: TX }));

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.REVISION_DUPLICATE);
    expect(repository.createRoute).not.toHaveBeenCalled();
  });

  it('rejeita route_code derivado que colide com roteiro existente, com G5-ROUTE-CODE-DUP', async () => {
    const repository = buildRepository({
      findRouteByCode: jest.fn(async () => ({ id: 88, route_code: 'ROT-001-R01' })),
    });
    const useCase = new ReviseProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, created_by: 42, transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_CODE_DUPLICATE);
  });

  it('lanca NotFoundError (404) quando o roteiro de origem nao existe', async () => {
    const repository = buildRepository({ findRouteByIdRaw: jest.fn(async () => null) });
    const useCase = new ReviseProductionRouteUseCase(repository as any);

    await expect(useCase.execute({ id: 404, created_by: 42, transaction: TX })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('RemoveProductionRouteUseCase', () => {
  it('remove rascunho sem apontamento (etapas primeiro, depois o cabecalho)', async () => {
    const repository = buildRepository();
    const useCase = new RemoveProductionRouteUseCase(repository as any);

    const result = await useCase.execute({ id: 1, transaction: TX });

    expect(repository.deleteStepsByRoute).toHaveBeenCalledWith(1, TX);
    expect(repository.deleteRoute).toHaveBeenCalledWith(1, TX);
    expect(result).toEqual({ id: 1 });
  });

  it('rejeita remocao de roteiro liberado com G5-ROUTE-NOT-DRAFT', async () => {
    const repository = buildRepository({
      findRouteByIdForUpdate: jest.fn(async (id: number) => ({ id, status: 'active', product_id: 7 })),
    });
    const useCase = new RemoveProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_NOT_DRAFT);
    expect(repository.deleteRoute).not.toHaveBeenCalled();
  });

  it('rejeita remocao de rascunho com apontamento vinculado, com G5-ROUTE-IN-USE', async () => {
    const repository = buildRepository({ countTrackingByRoute: jest.fn(async () => 1) });
    const useCase = new RemoveProductionRouteUseCase(repository as any);

    const error = await catchError(useCase.execute({ id: 1, transaction: TX }));

    expect(error.details.rule).toBe(PRODUCTION_ROUTE_RULES.ROUTE_IN_USE);
    expect(repository.deleteRoute).not.toHaveBeenCalled();
  });
});

describe('GetProductionRouteByIdUseCase / ListProductionRoutesUseCase', () => {
  it('devolve totais derivados junto do roteiro', async () => {
    const repository = buildRepository({
      findRouteById: jest.fn(async () => ({
        get: () => ({
          id: 1,
          route_code: 'ROT-001',
          steps: [
            { standard_time_minutes: 10, setup_time_minutes: 5, is_active: true },
            { standard_time_minutes: 20, setup_time_minutes: 0, is_active: true },
          ],
        }),
      })),
    });
    const useCase = new GetProductionRouteByIdUseCase(repository as any);

    const route = await useCase.execute({ id: 1 });

    expect(route.total_standard_time_minutes).toBe(30);
    expect(route.total_setup_time_minutes).toBe(5);
    expect(route.steps_count).toBe(2);
  });

  it('lanca NotFoundError (404) quando o roteiro nao existe', async () => {
    const repository = buildRepository();
    const useCase = new GetProductionRouteByIdUseCase(repository as any);

    await expect(useCase.execute({ id: 404 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('repassa filtros e calcula a paginacao', async () => {
    const repository = buildRepository({
      listRoutes: jest.fn(async () => ({ rows: [{ id: 1 }], count: 25 })),
    });
    const useCase = new ListProductionRoutesUseCase(repository as any);

    const result = await useCase.execute({ product_id: 7, status: 'active', page: 2, limit: 10, offset: 10 });

    expect(repository.listRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: 7, status: 'active' }),
      { limit: 10, offset: 10 },
    );
    expect(result.totalPages).toBe(3);
  });
});
