/**
 * G11 — alcada de aprovacao de pedido de compra por ORIGEM (decisao D-C do
 * dono do produto em 2026-08-10,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).
 *
 * | Origem     | Regra                                                  |
 * |------------|--------------------------------------------------------|
 * | Nacional   | ate R$ 500.000 segue direto; acima exige a diretoria    |
 * | Importacao | sempre exige a diretoria, em qualquer valor             |
 *
 * Os mocks de repositorio aqui sao propositalmente COMPLETOS (todos os
 * metodos que o caminho testado usa): mock incompleto derrubaria o use case
 * com `TypeError` e o teste passaria "por erro", nao pela regra alvo. Por
 * isso todo teste de erro afirma tambem `details.rule === 'G11'`.
 *
 * @module tests/unit/purchase-approval-authority
 */

import ChangePurchaseStatusUseCase = require('../../src/modules/purchases/application/use-cases/ChangePurchaseStatusUseCase');
import ApprovePurchaseUseCase = require('../../src/modules/purchases/application/use-cases/ApprovePurchaseUseCase');
import ListPurchaseApprovalsUseCase = require('../../src/modules/purchases/application/use-cases/ListPurchaseApprovalsUseCase');
import UpdatePurchaseUseCase = require('../../src/modules/purchases/application/use-cases/UpdatePurchaseUseCase');
import UpdateSupplierUseCase = require('../../src/modules/suppliers/application/use-cases/UpdateSupplierUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';
import {
  PURCHASE_APPROVAL_THRESHOLD_DIRECTOR,
  purchaseApprovalValue,
  requiredApproverRoles,
  resolvePurchaseOrigin,
} from '../../src/modules/purchases/domain/constants';

const transaction: any = { LOCK: { UPDATE: 'UPDATE' } };

/**
 * Monta um repositorio de compras mockado para o fluxo de aprovacao.
 *
 * @param options - `purchase` (campos do pedido), `supplier` (cadastro do fornecedor) e `approvals` (alcadas ja registradas).
 */
function buildPurchaseRepository({
  purchase = {},
  supplier = { id: 3, is_foreign: false },
  approvals = [] as any[],
}: { purchase?: Record<string, any>; supplier?: any; approvals?: any[] } = {}) {
  const save = jest.fn(async () => ({}));
  const record = {
    id: 7,
    status: 'pending',
    supplier_id: 3,
    origin: 'national',
    total_amount: 1000,
    freight_value: 0,
    order_number: 'PO-007',
    expected_date: '2026-09-30',
    save,
    ...purchase,
  };

  return {
    record,
    save,
    findPurchaseByIdRawForUpdate: jest.fn(async () => record),
    findPurchaseByIdRaw: jest.fn(async () => record),
    findSupplierByIdRaw: jest.fn(async () => supplier),
    listPurchaseApprovals: jest.fn(async () => approvals),
    findPurchaseApprovalByRole: jest.fn(async (_id: any, role: string) =>
      approvals.find((approval: any) => approval.approver_role === role) ?? null),
    createPurchaseApproval: jest.fn(async (data: any) => ({ id: 55, ...data })),
    findAccountPayableByPurchaseId: jest.fn(async () => null),
    createAccountPayable: jest.fn(async () => ({ id: 91 })),
    updatePurchaseFields: jest.fn(async () => {}),
    findPurchaseById: jest.fn(async () => record),
  };
}

describe('G11 — constantes de alcada de compra', () => {
  it('teto e de R$ 500.000 e a comparacao e "acima de", nao "a partir de"', () => {
    expect(PURCHASE_APPROVAL_THRESHOLD_DIRECTOR).toBe(500000);
    expect(requiredApproverRoles('national', 500000)).toEqual([]);
    expect(requiredApproverRoles('national', 500000.01)).toEqual(['diretor']);
  });

  it('importacao exige diretoria em qualquer valor, inclusive zero', () => {
    expect(requiredApproverRoles('import', 0)).toEqual(['diretor']);
    expect(requiredApproverRoles('import', 10)).toEqual(['diretor']);
    expect(requiredApproverRoles('import', 1000000)).toEqual(['diretor']);
  });

  it('origem efetiva e o OU das duas fontes — cadastro do fornecedor prevalece', () => {
    expect(resolvePurchaseOrigin('national', false)).toBe('national');
    expect(resolvePurchaseOrigin('import', false)).toBe('import');
    // Declarar "nacional" num pedido de fornecedor estrangeiro NAO escapa.
    expect(resolvePurchaseOrigin('national', true)).toBe('import');
    // Pedido legado, anterior a migration (coluna ainda nula na leitura).
    expect(resolvePurchaseOrigin(null, false)).toBe('national');
    expect(resolvePurchaseOrigin(undefined, true)).toBe('import');
  });

  it('valor comparado com o teto e mercadoria + frete', () => {
    expect(purchaseApprovalValue({ total_amount: '499000.00', freight_value: '21000.00' })).toBe(520000);
    expect(purchaseApprovalValue({ total_amount: null, freight_value: null })).toBe(0);
  });
});

describe('G11 — aprovacao do pedido (ChangePurchaseStatusUseCase)', () => {
  it('nacional abaixo do teto segue direto, sem friccao nova', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 120000 } });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const { purchase } = await useCase.execute({ id: 7, status: 'approved', userId: 9, transaction });

    expect(purchase.status).toBe('approved');
    expect(repository.listPurchaseApprovals).not.toHaveBeenCalled();
    // G13 (2026-08-10, CPC 00 (R2) 4.56/4.58): aprovar pedido NAO cria
    // mais passivo — pedido aprovado e nao entregue e contrato executorio.
    // A conta a pagar nasce no recebimento (ReceivePurchaseItemsUseCase).
    expect(repository.createAccountPayable).not.toHaveBeenCalled();
  });

  it('nacional acima do teto sem aprovacao da diretoria e bloqueado', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 600000 } });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const error: any = await useCase
      .execute({ id: 7, status: 'approved', userId: 9, transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11', origin: 'national', missingRoles: ['diretor'] });
    // Nada foi gravado: nem o status, nem a conta a pagar automatica.
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.record.status).toBe('pending');
    expect(repository.createAccountPayable).not.toHaveBeenCalled();
  });

  it('nacional acima do teto passa quando a diretoria ja aprovou', async () => {
    const repository = buildPurchaseRepository({
      purchase: { total_amount: 600000 },
      approvals: [{ id: 1, approver_role: 'diretor', approver_user_id: 4 }],
    });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const { purchase } = await useCase.execute({ id: 7, status: 'approved', userId: 9, transaction });

    expect(purchase.status).toBe('approved');
    // G13 (2026-08-10, CPC 00 (R2) 4.56/4.58): aprovar pedido NAO cria
    // mais passivo — pedido aprovado e nao entregue e contrato executorio.
    // A conta a pagar nasce no recebimento (ReceivePurchaseItemsUseCase).
    expect(repository.createAccountPayable).not.toHaveBeenCalled();
  });

  it('nacional dentro do teto na mercadoria mas acima somando o frete e bloqueado', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 499000, freight_value: 21000 } });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const error: any = await useCase
      .execute({ id: 7, status: 'approved', userId: 9, transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11', approvalValue: 520000 });
  });

  it('importacao declarada exige diretoria mesmo com valor baixo', async () => {
    const repository = buildPurchaseRepository({ purchase: { origin: 'import', total_amount: 1200 } });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const error: any = await useCase
      .execute({ id: 7, status: 'approved', userId: 9, transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11', origin: 'import', missingRoles: ['diretor'] });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('fornecedor estrangeiro exige diretoria mesmo com o pedido declarado nacional (anti-burla)', async () => {
    const repository = buildPurchaseRepository({
      purchase: { origin: 'national', total_amount: 1200 },
      supplier: { id: 3, is_foreign: true },
    });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const error: any = await useCase
      .execute({ id: 7, status: 'approved', userId: 9, transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11', origin: 'import' });
  });

  it('importacao de R$ 1 milhao passa depois da aprovacao da diretoria', async () => {
    const repository = buildPurchaseRepository({
      purchase: { origin: 'import', total_amount: 1000000 },
      approvals: [{ id: 2, approver_role: 'diretor', approver_user_id: 4 }],
    });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const { purchase } = await useCase.execute({ id: 7, status: 'approved', userId: 9, transaction });

    expect(purchase.status).toBe('approved');
  });

  it('a alcada nao interfere nas demais transicoes de status', async () => {
    const repository = buildPurchaseRepository({
      purchase: { status: 'approved', origin: 'import', total_amount: 1000000 },
    });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const { purchase } = await useCase.execute({ id: 7, status: 'sent', userId: 9, transaction });

    expect(purchase.status).toBe('sent');
    expect(repository.findSupplierByIdRaw).not.toHaveBeenCalled();
  });
});

describe('G11 — registro da aprovacao (ApprovePurchaseUseCase)', () => {
  it('grava a aprovacao com o usuario do JWT e o papel resolvido por RBAC', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 900000 } });
    const useCase = new ApprovePurchaseUseCase(repository);

    const approval = await useCase.execute({
      purchaseId: 7,
      approverUserId: 42,
      availableRoles: ['diretor'],
      transaction,
    });

    expect(repository.createPurchaseApproval).toHaveBeenCalledTimes(1);
    const [payload] = repository.createPurchaseApproval.mock.calls[0];
    expect(payload).toMatchObject({ purchase_id: 7, approver_user_id: 42, approver_role: 'diretor' });
    expect(payload.approved_at).toBeInstanceOf(Date);
    expect(approval.approver_role).toBe('diretor');
  });

  it('papel que ja aprovou nao aprova de novo', async () => {
    const repository = buildPurchaseRepository({
      purchase: { total_amount: 900000 },
      approvals: [{ id: 3, approver_role: 'diretor', approver_user_id: 42 }],
    });
    const useCase = new ApprovePurchaseUseCase(repository);

    const error: any = await useCase
      .execute({ purchaseId: 7, approverUserId: 42, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11' });
    expect(error.message).toMatch(/ja aprovou/i);
    expect(repository.createPurchaseApproval).not.toHaveBeenCalled();
  });

  it('usuario sem o papel diretor nao registra aprovacao', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 900000 } });
    const useCase = new ApprovePurchaseUseCase(repository);

    const error: any = await useCase
      .execute({ purchaseId: 7, approverUserId: 42, availableRoles: [], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11' });
    expect(repository.createPurchaseApproval).not.toHaveBeenCalled();
  });

  it('pedido que nao exige alcada nao aceita aprovacao (evita registro decorativo)', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 1000 } });
    const useCase = new ApprovePurchaseUseCase(repository);

    const error: any = await useCase
      .execute({ purchaseId: 7, approverUserId: 42, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11', origin: 'national' });
    expect(repository.createPurchaseApproval).not.toHaveBeenCalled();
  });

  it('pedido ja aprovado nao aceita aprovacao de alcada retroativa', async () => {
    const repository = buildPurchaseRepository({ purchase: { status: 'approved', total_amount: 900000 } });
    const useCase = new ApprovePurchaseUseCase(repository);

    const error: any = await useCase
      .execute({ purchaseId: 7, approverUserId: 42, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11' });
    expect(repository.createPurchaseApproval).not.toHaveBeenCalled();
  });

  it('pedido inexistente devolve 404, nao 422', async () => {
    const repository = buildPurchaseRepository();
    repository.findPurchaseByIdRaw = jest.fn(async () => null) as any;
    const useCase = new ApprovePurchaseUseCase(repository);

    await expect(
      useCase.execute({ purchaseId: 404, approverUserId: 42, availableRoles: ['diretor'], transaction }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('G11 — situacao da alcada (ListPurchaseApprovalsUseCase)', () => {
  it('descreve o que falta sem efeito colateral', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 700000 } });
    const useCase = new ListPurchaseApprovalsUseCase(repository);

    const data = await useCase.execute({ purchaseId: 7 });

    expect(data).toMatchObject({
      origin: 'national',
      origin_source: 'none',
      approval_value: 700000,
      required_roles: ['diretor'],
      missing_roles: ['diretor'],
      approval_complete: false,
    });
    expect(repository.createPurchaseApproval).not.toHaveBeenCalled();
  });

  it('aponta o cadastro do fornecedor como fonte quando o pedido se diz nacional', async () => {
    const repository = buildPurchaseRepository({
      purchase: { origin: 'national', total_amount: 500 },
      supplier: { id: 3, is_foreign: true },
    });
    const useCase = new ListPurchaseApprovalsUseCase(repository);

    const data = await useCase.execute({ purchaseId: 7 });

    expect(data).toMatchObject({ origin: 'import', origin_source: 'supplier', required_roles: ['diretor'] });
  });

  it('pedido nacional dentro do teto aparece como alcada completa (nada a aprovar)', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 1000 } });
    const useCase = new ListPurchaseApprovalsUseCase(repository);

    const data = await useCase.execute({ purchaseId: 7 });

    expect(data).toMatchObject({ required_roles: [], missing_roles: [], approval_complete: true });
  });
});

describe('G11 — campos que definem a alcada nao podem ser afrouxados depois', () => {
  it('origem "import" nao volta para "national"', async () => {
    const repository = buildPurchaseRepository({ purchase: { origin: 'import' } });
    const useCase = new UpdatePurchaseUseCase(repository);

    const error: any = await useCase
      .execute({ id: 7, body: { origin: 'national' }, transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11' });
    expect(repository.updatePurchaseFields).not.toHaveBeenCalled();
  });

  it('origem "national" pode ser corrigida para "import" (escalation-only)', async () => {
    const repository = buildPurchaseRepository({ purchase: { origin: 'national' } });
    const useCase = new UpdatePurchaseUseCase(repository);

    await useCase.execute({ id: 7, body: { origin: 'import' }, transaction });

    expect(repository.updatePurchaseFields).toHaveBeenCalledWith(7, { origin: 'import' }, transaction);
  });

  it('pedido ja aprovado nao muda frete/fornecedor/origem (evita aprovar um pedido e comprar outro)', async () => {
    const repository = buildPurchaseRepository({ purchase: { status: 'approved', total_amount: 450000 } });
    const useCase = new UpdatePurchaseUseCase(repository);

    const error: any = await useCase
      .execute({ id: 7, body: { freight_value: 100000 }, transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11', frozenFields: ['freight_value'] });
    expect(repository.updatePurchaseFields).not.toHaveBeenCalled();
  });

  it('pedido ja aprovado continua aceitando edicao de campos sem efeito de alcada', async () => {
    const repository = buildPurchaseRepository({ purchase: { status: 'approved' } });
    const useCase = new UpdatePurchaseUseCase(repository);

    await useCase.execute({ id: 7, body: { notes: 'entrega no doca 2' }, transaction });

    expect(repository.updatePurchaseFields).toHaveBeenCalledWith(7, { notes: 'entrega no doca 2' }, transaction);
  });

  it('fornecedor estrangeiro nao vira nacional pela API de cadastro', async () => {
    const suppliersRepository = {
      findById: jest.fn(async () => ({ id: 3, company_name: 'ACME GmbH', is_foreign: true })),
      update: jest.fn(async () => 1),
    };
    const useCase = new UpdateSupplierUseCase(suppliersRepository);

    const error: any = await useCase
      .execute({ id: 3, body: { is_foreign: false } })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11' });
    expect(suppliersRepository.update).not.toHaveBeenCalled();
  });

  it('fornecedor nacional pode ser marcado como estrangeiro (correcao de cadastro)', async () => {
    const suppliersRepository = {
      findById: jest.fn(async () => ({ id: 3, company_name: 'ACME GmbH', is_foreign: true })),
      update: jest.fn(async () => 1),
    };
    const useCase = new UpdateSupplierUseCase(suppliersRepository);

    await useCase.execute({ id: 3, body: { is_foreign: true } });

    expect(suppliersRepository.update).toHaveBeenCalledWith(3, { is_foreign: true });
  });
});
