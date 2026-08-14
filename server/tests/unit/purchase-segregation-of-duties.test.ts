/**
 * D-K — segregacao de funcao na compra: **quem solicita nao aprova**
 * (decisao do dono do produto em 2026-08-10,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4 D-K; fecha o
 * criterio de pronto da §5 "quem aprova uma compra nao e quem a solicitou").
 *
 * Cobre os 4 pontos de aprovacao da cadeia de suprimentos, cada um com seu
 * proprio `details.rule`:
 *
 * | Ponto                                             | `details.rule`     | Solicitante lido de            |
 * |---------------------------------------------------|--------------------|--------------------------------|
 * | `PATCH /api/purchase-requisitions/:id/status`      | `D-K-REQUISICAO`   | `purchase_requisitions.requester_id` |
 * | `PUT /api/purchases/:id/status`                    | `D-K-PEDIDO`       | `purchase_orders.requester_id` |
 * | `POST /api/purchases/:id/approve` (alcada G11)     | `D-K-ALCADA`       | `purchase_orders.requester_id` |
 * | `POST /api/comex/import-processes/:id/approve`     | `D-K-COMEX`        | `import_processes.created_by`  |
 *
 * Em TODO teste de recusa a afirmacao e dupla: o erro certo (`details.rule`)
 * **e** a ausencia de escrita — segregacao que reprova mas deixa estado
 * gravado seria pior que nao ter regra. Os mocks sao propositalmente
 * completos, para que uma falha nunca seja `TypeError` disfarcado de regra.
 *
 * @module tests/unit/purchase-segregation-of-duties
 */

import ChangePurchaseRequisitionStatusUseCase = require('../../src/modules/purchaseRequisitions/application/use-cases/ChangePurchaseRequisitionStatusUseCase');
import ChangePurchaseStatusUseCase = require('../../src/modules/purchases/application/use-cases/ChangePurchaseStatusUseCase');
import ApprovePurchaseUseCase = require('../../src/modules/purchases/application/use-cases/ApprovePurchaseUseCase');
import ApproveImportProcessUseCase = require('../../src/modules/comex/application/use-cases/ApproveImportProcessUseCase');
import { BusinessRuleError } from '../../src/errors';
import {
  SEGREGATION_RULES,
  assertApproverIsNotRequester,
  isSelfApproval,
} from '../../src/shared/domain/segregationOfDuties';

const transaction: any = { LOCK: { UPDATE: 'UPDATE' }, id: 'tx-d-k' };

/** Usuario que SOLICITOU (criou) o documento em todos os cenarios abaixo. */
const SOLICITANTE = 7;
/** Segundo usuario, habilitado a aprovar — o "outro par de olhos" da regra. */
const OUTRO_APROVADOR = 8;

/**
 * Repositorio de requisicoes mockado.
 *
 * @param overrides - Campos da requisicao carregada (`status`, `requester_id`, ...).
 */
function buildRequisitionRepository(overrides: Record<string, any> = {}) {
  const record = {
    id: 1,
    status: 'pending',
    requisition_number: 'RQ-2026-0001',
    requester_id: SOLICITANTE,
    ...overrides,
  };
  return {
    record,
    findRequisitionById: jest.fn(async () => record),
    updateRequisition: jest.fn(async (id: number, data: any) => ({ ...record, id, ...data })),
  };
}

/**
 * Repositorio de compras mockado para os caminhos de aprovacao.
 *
 * @param options - `purchase` (campos do pedido), `supplier` (cadastro) e `approvals` (alcadas ja registradas).
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
    order_number: 'PO-2026-0007',
    requester_id: SOLICITANTE,
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

/**
 * Repositorio de comex mockado para o gate de aprovacao.
 *
 * @param overrides - Campos do processo de importacao (`status`, `created_by`, ...).
 */
function buildComexRepository(overrides: Record<string, any> = {}) {
  const record = {
    id: 1,
    status: 'draft',
    process_number: 'IMP-2026-0001',
    supplier_id: 42,
    created_by: SOLICITANTE,
    ...overrides,
  };
  return {
    record,
    findImportProcessByIdForUpdate: jest.fn(async () => record),
    findImportProcessById: jest.fn(async () => record),
    updateImportProcess: jest.fn(async (id: number, data: any) => ({ ...record, id, ...data })),
    findImportProcessItems: jest.fn(async () => []),
    updateImportProcessItem: jest.fn(async () => undefined),
    listImportProcessApprovals: jest.fn(async () => []),
    findImportProcessApprovalByRole: jest.fn(async () => null),
    createImportProcessApproval: jest.fn(async (data: any) => ({ id: 501, ...data })),
  };
}

describe('D-K — regra pura (shared/domain/segregationOfDuties)', () => {
  it('cada ponto de aprovacao tem seu proprio identificador de regra', () => {
    expect(SEGREGATION_RULES).toEqual({
      PURCHASE_REQUISITION: 'D-K-REQUISICAO',
      PURCHASE_ORDER: 'D-K-PEDIDO',
      PURCHASE_ORDER_AUTHORITY: 'D-K-ALCADA',
      IMPORT_PROCESS_AUTHORITY: 'D-K-COMEX',
      // 5o ponto, acrescentado em 2026-08-14 pela remediacao de FIND-ERP-005
      // (Falha 4): a decisao D-K passou a valer tambem para a alcada de
      // contrato juridico (APR-2026-021 Parte B decisao 5). Ate entao o
      // cabecalho deste modulo citava o Juridico nominalmente como o
      // comportamento OPOSTO ao desejado, sem a regra estar aplicada la.
      JUR_CONTRACT_AUTHORITY: 'D-K-JURIDICO',
    });
    // Os 5 valores sao distintos: um cliente consegue diferenciar qual gate reprovou.
    expect(new Set(Object.values(SEGREGATION_RULES)).size).toBe(5);
  });

  it('auto-aprovacao e apenas "mesma pessoa", nao "mesmo papel"', () => {
    expect(isSelfApproval(7, 7)).toBe(true);
    expect(isSelfApproval(7, 8)).toBe(false);
    // Id vindo do banco como string (Sequelize/BIGINT) nao escapa da regra.
    expect(isSelfApproval('7' as any, 7)).toBe(true);
  });

  it('solicitante desconhecido nao bloqueia (a regra nao inventa um culpado)', () => {
    expect(isSelfApproval(null, 7)).toBe(false);
    expect(isSelfApproval(undefined, 7)).toBe(false);
    expect(isSelfApproval(7, null)).toBe(false);
  });

  it('a mensagem diz o que fazer, nao apenas que foi negado', () => {
    const error: any = (() => {
      try {
        assertApproverIsNotRequester({
          rule: SEGREGATION_RULES.PURCHASE_ORDER,
          requesterUserId: 7,
          approverUserId: 7,
          documentLabel: 'o pedido de compra PO-2026-0007',
          approverHint: 'outro usuario com acesso ao modulo de compras',
        });
        return null;
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.statusCode).toBe(422);
    expect(error.message).toMatch(/PO-2026-0007/);
    expect(error.message).toMatch(/Peca a aprovacao a outro usuario com acesso ao modulo de compras/);
    expect(error.details).toMatchObject({
      rule: 'D-K-PEDIDO',
      requester_user_id: 7,
      approver_user_id: 7,
    });
    expect(error.details.what_to_do).toMatch(/Solicitar a aprovacao a/);
  });
});

describe('D-K — requisicao de compra (ChangePurchaseRequisitionStatusUseCase)', () => {
  it('o solicitante NAO aprova a propria requisicao e NADA e gravado', async () => {
    const repository = buildRequisitionRepository();
    const useCase = new ChangePurchaseRequisitionStatusUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, status: 'approved', userId: SOLICITANTE })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({
      rule: 'D-K-REQUISICAO',
      requester_user_id: SOLICITANTE,
      approver_user_id: SOLICITANTE,
    });
    // Nem status, nem approved_by, nem approval_date.
    expect(repository.updateRequisition).not.toHaveBeenCalled();
    expect(repository.record.status).toBe('pending');
  });

  it('um segundo usuario aprova normalmente', async () => {
    const repository = buildRequisitionRepository();
    const useCase = new ChangePurchaseRequisitionStatusUseCase(repository as any);

    const result = await useCase.execute({ id: 1, status: 'approved', userId: OUTRO_APROVADOR });

    expect(repository.updateRequisition).toHaveBeenCalledTimes(1);
    const [, updateData] = repository.updateRequisition.mock.calls[0];
    expect(updateData).toMatchObject({ status: 'approved', approved_by: OUTRO_APROVADOR });
    expect(result).toMatchObject({ status: 'approved' });
  });

  it('a regra so vale para APROVAR — o solicitante continua podendo submeter e cancelar', async () => {
    const draft = buildRequisitionRepository({ status: 'draft' });
    const useCaseDraft = new ChangePurchaseRequisitionStatusUseCase(draft as any);
    await useCaseDraft.execute({ id: 1, status: 'pending', userId: SOLICITANTE });
    expect(draft.updateRequisition).toHaveBeenCalledWith(1, { status: 'pending' });

    const pending = buildRequisitionRepository();
    const useCasePending = new ChangePurchaseRequisitionStatusUseCase(pending as any);
    await useCasePending.execute({ id: 1, status: 'canceled', userId: SOLICITANTE });
    expect(pending.updateRequisition).toHaveBeenCalledWith(1, { status: 'canceled' });
  });
});

describe('D-K — pedido de compra (ChangePurchaseStatusUseCase)', () => {
  it('o solicitante NAO aprova o proprio pedido e NADA e gravado', async () => {
    const repository = buildPurchaseRepository();
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const error: any = await useCase
      .execute({ id: 7, status: 'approved', userId: SOLICITANTE, transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'D-K-PEDIDO', requester_user_id: SOLICITANTE });
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.record.status).toBe('pending');
  });

  it('um segundo usuario aprova normalmente', async () => {
    const repository = buildPurchaseRepository();
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const { purchase } = await useCase.execute({
      id: 7, status: 'approved', userId: OUTRO_APROVADOR, transaction,
    });

    expect(purchase.status).toBe('approved');
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('a segregacao e verificada ANTES da alcada G11 (mensagem util, nao caca ao diretor a toa)', async () => {
    // Pedido de importacao: reprovaria TAMBEM por G11 (sem aprovacao da
    // diretoria). O erro devolvido deve ser o da segregacao, porque buscar um
    // diretor nao destravaria este usuario.
    const repository = buildPurchaseRepository({ purchase: { origin: 'import', total_amount: 1000000 } });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const error: any = await useCase
      .execute({ id: 7, status: 'approved', userId: SOLICITANTE, transaction })
      .catch((caught: any) => caught);

    expect(error.details).toMatchObject({ rule: 'D-K-PEDIDO' });
    expect(repository.listPurchaseApprovals).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('pedido legado sem solicitante registrado continua aprovavel (NULL nao bloqueia)', async () => {
    const repository = buildPurchaseRepository({ purchase: { requester_id: null } });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const { purchase } = await useCase.execute({
      id: 7, status: 'approved', userId: SOLICITANTE, transaction,
    });

    expect(purchase.status).toBe('approved');
  });

  it('a regra nao interfere nas demais transicoes (o comprador segue enviando o proprio pedido)', async () => {
    const repository = buildPurchaseRepository({ purchase: { status: 'approved' } });
    const useCase = new ChangePurchaseStatusUseCase(repository);

    const { purchase } = await useCase.execute({
      id: 7, status: 'sent', userId: SOLICITANTE, transaction,
    });

    expect(purchase.status).toBe('sent');
  });
});

describe('D-K — alcada da diretoria no pedido (ApprovePurchaseUseCase)', () => {
  it('o diretor que montou o pedido NAO assina a propria alcada e NADA e gravado', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 900000 } });
    const useCase = new ApprovePurchaseUseCase(repository);

    const error: any = await useCase
      .execute({ purchaseId: 7, approverUserId: SOLICITANTE, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'D-K-ALCADA', approver_user_id: SOLICITANTE });
    expect(repository.createPurchaseApproval).not.toHaveBeenCalled();
  });

  it('`role = admin` NAO isenta: admin chega aqui com o papel diretor resolvido e ainda assim e barrado', async () => {
    // `resolveAvailableApproverRoles` (controller) devolve ['diretor'] para
    // qualquer `role === 'admin'`. Segregacao e identidade, nao privilegio.
    const repository = buildPurchaseRepository({ purchase: { total_amount: 900000, requester_id: 1 } });
    const useCase = new ApprovePurchaseUseCase(repository);

    const error: any = await useCase
      .execute({ purchaseId: 7, approverUserId: 1, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error.details).toMatchObject({ rule: 'D-K-ALCADA' });
    expect(repository.createPurchaseApproval).not.toHaveBeenCalled();
  });

  it('um segundo diretor registra a alcada normalmente', async () => {
    const repository = buildPurchaseRepository({ purchase: { total_amount: 900000 } });
    const useCase = new ApprovePurchaseUseCase(repository);

    const approval = await useCase.execute({
      purchaseId: 7, approverUserId: OUTRO_APROVADOR, availableRoles: ['diretor'], transaction,
    });

    expect(repository.createPurchaseApproval).toHaveBeenCalledTimes(1);
    const [payload] = repository.createPurchaseApproval.mock.calls[0];
    expect(payload).toMatchObject({ purchase_id: 7, approver_user_id: OUTRO_APROVADOR, approver_role: 'diretor' });
    expect(approval.approver_role).toBe('diretor');
  });
});

describe('D-K — gate da diretoria na importacao (ApproveImportProcessUseCase)', () => {
  it('o analista que registrou o processo NAO o aprova e NADA e gravado', async () => {
    const repository = buildComexRepository();
    const useCase = new ApproveImportProcessUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, approverUserId: SOLICITANTE, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'D-K-COMEX', requester_user_id: SOLICITANTE });
    expect(repository.createImportProcessApproval).not.toHaveBeenCalled();
    // O processo continua em draft: nao embarca nada por conta deste erro.
    expect(repository.updateImportProcess).not.toHaveBeenCalled();
    expect(repository.record.status).toBe('draft');
  });

  it('um segundo diretor aprova o processo normalmente', async () => {
    const repository = buildComexRepository();
    const useCase = new ApproveImportProcessUseCase(repository as any);

    const approval = await useCase.execute({
      id: 1, approverUserId: OUTRO_APROVADOR, availableRoles: ['diretor'], transaction,
    });

    expect(repository.createImportProcessApproval).toHaveBeenCalledTimes(1);
    const [payload] = repository.createImportProcessApproval.mock.calls[0];
    expect(payload).toMatchObject({
      import_process_id: 1, approver_user_id: OUTRO_APROVADOR, approver_role: 'diretor',
    });
    expect(approval.approver_role).toBe('diretor');
  });

  it('a segregacao e verificada ANTES da checagem de papel (o solicitante nao vira "sem papel")', async () => {
    const repository = buildComexRepository();
    const useCase = new ApproveImportProcessUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, approverUserId: SOLICITANTE, availableRoles: [], transaction })
      .catch((caught: any) => caught);

    expect(error.details).toMatchObject({ rule: 'D-K-COMEX' });
  });
});
