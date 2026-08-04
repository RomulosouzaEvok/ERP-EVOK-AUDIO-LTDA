/**
 * Test: Workflow de status da Requisicao de Compra
 *
 * Valida ChangePurchaseRequisitionStatusUseCase: transicoes validas/invalidas
 * e preenchimento de `approved_by`/`approval_date` a partir do usuario logado.
 */

import ChangePurchaseRequisitionStatusUseCase = require('../../src/modules/purchaseRequisitions/application/use-cases/ChangePurchaseRequisitionStatusUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';

describe('ChangePurchaseRequisitionStatusUseCase', () => {
  it('transiciona draft -> pending', async () => {
    const requisitionRepository = {
      findRequisitionById: jest.fn(async (id: number) => ({ id, status: 'draft', requisition_number: 'RQ-1' })),
      updateRequisition: jest.fn(async (id: number, data: any) => ({ id, requisition_number: 'RQ-1', ...data })),
    };

    const useCase = new ChangePurchaseRequisitionStatusUseCase(requisitionRepository as any);
    const result = await useCase.execute({ id: 1, status: 'pending', userId: 9 });

    expect(requisitionRepository.updateRequisition).toHaveBeenCalledWith(1, { status: 'pending' });
    expect(result).toMatchObject({ status: 'pending' });
  });

  it('transiciona pending -> approved e registra approved_by/approval_date do usuario logado', async () => {
    const requisitionRepository = {
      findRequisitionById: jest.fn(async (id: number) => ({ id, status: 'pending', requisition_number: 'RQ-2' })),
      updateRequisition: jest.fn(async (id: number, data: any) => ({ id, requisition_number: 'RQ-2', ...data })),
    };

    const useCase = new ChangePurchaseRequisitionStatusUseCase(requisitionRepository as any);
    const result = await useCase.execute({ id: 2, status: 'approved', userId: 42 });

    expect(requisitionRepository.updateRequisition).toHaveBeenCalledTimes(1);
    const [, updateData] = requisitionRepository.updateRequisition.mock.calls[0];
    expect(updateData.status).toBe('approved');
    expect(updateData.approved_by).toBe(42);
    expect(typeof updateData.approval_date).toBe('string');
    expect(result).toMatchObject({ status: 'approved', approved_by: 42 });
  });

  it('transiciona draft -> canceled e pending -> canceled', async () => {
    const requisitionRepository = {
      findRequisitionById: jest.fn(async (id: number) => ({ id, status: id === 1 ? 'draft' : 'pending' })),
      updateRequisition: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    };

    const useCase = new ChangePurchaseRequisitionStatusUseCase(requisitionRepository as any);

    await expect(useCase.execute({ id: 1, status: 'canceled', userId: 1 })).resolves.toMatchObject({ status: 'canceled' });
    await expect(useCase.execute({ id: 2, status: 'canceled', userId: 1 })).resolves.toMatchObject({ status: 'canceled' });
  });

  it('rejeita transicao invalida draft -> approved com BusinessRuleError (422)', async () => {
    const requisitionRepository = {
      findRequisitionById: jest.fn(async (id: number) => ({ id, status: 'draft' })),
      updateRequisition: jest.fn(),
    };

    const useCase = new ChangePurchaseRequisitionStatusUseCase(requisitionRepository as any);

    await expect(
      useCase.execute({ id: 1, status: 'approved', userId: 1 })
    ).rejects.toMatchObject({
      constructor: BusinessRuleError,
      details: { current_status: 'draft', requested_status: 'approved' },
    });

    expect(requisitionRepository.updateRequisition).not.toHaveBeenCalled();
  });

  it('rejeita transicao invalida approved -> pending com BusinessRuleError (422)', async () => {
    const requisitionRepository = {
      findRequisitionById: jest.fn(async (id: number) => ({ id, status: 'approved' })),
      updateRequisition: jest.fn(),
    };

    const useCase = new ChangePurchaseRequisitionStatusUseCase(requisitionRepository as any);

    await expect(
      useCase.execute({ id: 1, status: 'pending', userId: 1 })
    ).rejects.toMatchObject({
      constructor: BusinessRuleError,
      details: { current_status: 'approved', requested_status: 'pending' },
    });
  });

  it('lanca NotFoundError (404) se a requisicao nao existir', async () => {
    const requisitionRepository = {
      findRequisitionById: jest.fn(async () => null),
      updateRequisition: jest.fn(),
    };

    const useCase = new ChangePurchaseRequisitionStatusUseCase(requisitionRepository as any);

    await expect(
      useCase.execute({ id: 999, status: 'pending', userId: 1 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('purchaseRequisitionController.changeStatus — nivel de aprovacao', () => {
  const controller = require('../../src/modules/purchaseRequisitions/presentation/controllers/purchaseRequisitionController');

  const makeRes = () => {
    const res: any = { statusCode: 200 };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    return res;
  };

  it('bloqueia aprovacao (403) para operador sem nivel approve no modulo requisicoes', async () => {
    const next = jest.fn();
    await controller.changeStatus(
      {
        params: { id: '10' },
        body: { status: 'approved' },
        user: { id: 9, role: 'operator', permissions: { requisicoes: 'operate' } },
      } as any,
      makeRes(),
      next
    );

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err?.statusCode ?? err?.status).toBe(403);
  });
});
