/**
 * G11-COMEX — gate de aprovacao da diretoria no processo de importacao
 * (decisao D-G do dono do produto em 2026-08-10).
 *
 * O G11 (`purchase-approval-authority.test.ts`) cobre a alcada do PEDIDO DE
 * COMPRA. Este arquivo cobre o furo que aquela regra nao alcanca:
 * `import_processes` e um fluxo paralelo, nunca vira `purchase_orders` e,
 * ate esta rodada, nao tinha etapa de aprovacao nenhuma — uma importacao de
 * R$ 1 milhao embarcava com um simples `comex:operate`.
 *
 * | Dimensao       | Regra                                                  |
 * |----------------|--------------------------------------------------------|
 * | Quem aprova    | papel `diretor`                                         |
 * | Faixa de valor | nao ha — importacao e sempre da diretoria               |
 * | Onde trava     | transicao `draft -> shipped` (antes de cambio/embarque)  |
 *
 * Os mocks de repositorio aqui sao propositalmente COMPLETOS (todos os
 * metodos que o caminho testado usa): mock incompleto derrubaria o use case
 * com `TypeError` e o teste passaria "por erro", nao pela regra alvo. Por
 * isso todo teste de erro afirma tambem `details.rule === 'G11-COMEX'`.
 *
 * @module tests/unit/comex-directorate-approval
 */

import RegisterImportTrackingUseCase = require('../../src/modules/comex/application/use-cases/RegisterImportTrackingUseCase');
import ApproveImportProcessUseCase = require('../../src/modules/comex/application/use-cases/ApproveImportProcessUseCase');
import ListImportProcessApprovalsUseCase = require('../../src/modules/comex/application/use-cases/ListImportProcessApprovalsUseCase');
import { BusinessRuleError, NotFoundError } from '../../src/errors';
import {
  IMPORT_APPROVAL_GATE_EVENT,
  IMPORT_APPROVAL_RULE,
  IMPORT_APPROVAL_STATUS,
  MONETARY_FIELDS_FROZEN_ON_SHIPMENT,
  requiredImportApproverRoles,
} from '../../src/modules/comex/domain/constants';

const transaction: any = { id: 'tx-g11-comex' };

/**
 * Repositorio de comex mockado para os caminhos de aprovacao/embarque.
 *
 * @param options - `process` (campos do processo), `approvals` (aprovacoes ja registradas).
 */
function buildComexRepository({
  process = {},
  approvals = [] as any[],
}: { process?: Record<string, any>; approvals?: any[] } = {}) {
  const record = {
    id: 1,
    status: 'draft',
    process_number: 'IMP-2026-0001',
    supplier_id: 42,
    exchange_rate: 5,
    freight_value: 0,
    insurance_value: 0,
    other_expenses_value: 0,
    ...process,
  };

  return {
    record,
    findImportProcessByIdForUpdate: jest.fn(async () => record),
    findImportProcessById: jest.fn(async () => record),
    updateImportProcess: jest.fn(async (id: number, data: any) => ({ ...record, id, ...data })),
    findImportProcessItems: jest.fn(async () => []),
    updateImportProcessItem: jest.fn(async () => undefined),
    listImportProcessApprovals: jest.fn(async () => approvals),
    findImportProcessApprovalByRole: jest.fn(async (_id: any, role: string) =>
      approvals.find((approval: any) => approval.approver_role === role) ?? null),
    createImportProcessApproval: jest.fn(async (data: any) => ({ id: 501, ...data })),
  };
}

/** Aprovacao de diretoria ja registrada. */
const directorApproval = { id: 501, approver_role: 'diretor', approver_user_id: 4, approved_at: new Date() };

describe('G11-COMEX — constantes da regra', () => {
  it('importacao exige a diretoria em qualquer valor (sem faixa de valor)', () => {
    expect(requiredImportApproverRoles()).toEqual(['diretor']);
  });

  it('o gate esta no embarque, o ponto sem custo afundado do ciclo', () => {
    expect(IMPORT_APPROVAL_STATUS).toBe('draft');
    expect(IMPORT_APPROVAL_GATE_EVENT).toBe('shipped');
    expect(IMPORT_APPROVAL_RULE).toBe('G11-COMEX');
  });

  it('os campos monetarios congelados no embarque sao os que definem o valor aprovado', () => {
    expect([...MONETARY_FIELDS_FROZEN_ON_SHIPMENT]).toEqual([
      'exchange_rate', 'freight_value', 'insurance_value', 'other_expenses_value',
    ]);
  });
});

describe('G11-COMEX — gate no embarque (RegisterImportTrackingUseCase)', () => {
  it('embarque SEM aprovacao da diretoria e bloqueado e NADA e gravado', async () => {
    const repository = buildComexRepository();
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, event: 'shipped', transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11-COMEX', missing_roles: ['diretor'] });
    // Nenhum efeito colateral: nem o status, nem o recalculo de tributos.
    expect(repository.updateImportProcess).not.toHaveBeenCalled();
    expect(repository.updateImportProcessItem).not.toHaveBeenCalled();
    expect(repository.record.status).toBe('draft');
  });

  it('embarque de importacao milionaria tambem e bloqueado sem a diretoria (nao ha faixa de valor)', async () => {
    const repository = buildComexRepository({
      process: { exchange_rate: 5, freight_value: 200000 },
    });
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, event: 'shipped', transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11-COMEX' });
    expect(repository.updateImportProcess).not.toHaveBeenCalled();
  });

  it('embarque passa quando a diretoria ja aprovou', async () => {
    const repository = buildComexRepository({ approvals: [directorApproval] });
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    await useCase.execute({ id: 1, event: 'shipped', event_date: '2026-08-20', transaction });

    const [id, payload] = repository.updateImportProcess.mock.calls[0];
    expect(id).toBe(1);
    expect(payload).toMatchObject({ status: 'shipped', shipped_at: '2026-08-20' });
  });

  it('a leitura das aprovacoes acontece DENTRO da transacao do embarque (mesmo snapshot do lock)', async () => {
    const repository = buildComexRepository({ approvals: [directorApproval] });
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    await useCase.execute({ id: 1, event: 'shipped', transaction });

    expect(repository.listImportProcessApprovals).toHaveBeenCalledWith(1, transaction);
  });

  it('o gate nao interfere nos eventos posteriores (arrived/customs_cleared nao consultam alcada)', async () => {
    const repository = buildComexRepository({ process: { status: 'shipped' } });
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    await useCase.execute({ id: 1, event: 'arrived', transaction });

    expect(repository.listImportProcessApprovals).not.toHaveBeenCalled();
    const [, payload] = repository.updateImportProcess.mock.calls[0];
    expect(payload.status).toBe('arrived');
  });

  it('evento fora de sequencia continua caindo na regra de sequencia, nao na alcada', async () => {
    const repository = buildComexRepository();
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, event: 'arrived', transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ current_status: 'draft', expected_event: 'shipped' });
    expect(error.details.rule).toBeUndefined();
  });

  it('processo inexistente devolve 404, nao 422 de alcada', async () => {
    const repository = buildComexRepository();
    repository.findImportProcessByIdForUpdate = jest.fn(async () => null) as any;
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    await expect(
      useCase.execute({ id: 404, event: 'shipped', transaction }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('G11-COMEX — valores aprovados congelam no embarque (gate nao pode ser decorativo)', () => {
  it.each([...MONETARY_FIELDS_FROZEN_ON_SHIPMENT])(
    'nao aceita alterar "%s" na mesma chamada que consome a aprovacao',
    async (field) => {
      const repository = buildComexRepository({ approvals: [directorApproval] });
      const useCase = new RegisterImportTrackingUseCase(repository as any);

      const error: any = await useCase
        .execute({ id: 1, event: 'shipped', [field]: 999999, transaction } as any)
        .catch((caught: any) => caught);

      expect(error).toBeInstanceOf(BusinessRuleError);
      expect(error.details).toMatchObject({ rule: 'G11-COMEX', frozen_fields: [field] });
      // Nada gravado: nem status, nem recalculo de tributos com o valor inflado.
      expect(repository.updateImportProcess).not.toHaveBeenCalled();
      expect(repository.updateImportProcessItem).not.toHaveBeenCalled();
    },
  );

  it('o embarque aceita normalmente os campos sem efeito de valor (data e observacao)', async () => {
    const repository = buildComexRepository({ approvals: [directorApproval] });
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    await useCase.execute({ id: 1, event: 'shipped', event_date: '2026-08-20', notes: 'BL 123', transaction });

    const [, payload] = repository.updateImportProcess.mock.calls[0];
    expect(payload).toMatchObject({ status: 'shipped', shipped_at: '2026-08-20', notes: 'BL 123' });
  });

  it('depois do embarque os valores voltam a ser editaveis (despesas aduaneiras reais)', async () => {
    const repository = buildComexRepository({
      process: { status: 'shipped' },
      approvals: [directorApproval],
    });
    const useCase = new RegisterImportTrackingUseCase(repository as any);

    await useCase.execute({ id: 1, event: 'arrived', other_expenses_value: 3500, transaction });

    const [, payload] = repository.updateImportProcess.mock.calls[0];
    expect(payload).toMatchObject({ status: 'arrived', other_expenses_value: 3500 });
  });
});

describe('G11-COMEX — registro da aprovacao (ApproveImportProcessUseCase)', () => {
  it('grava a aprovacao com o usuario do JWT e o papel resolvido por RBAC', async () => {
    const repository = buildComexRepository();
    const useCase = new ApproveImportProcessUseCase(repository as any);

    const approval = await useCase.execute({
      id: 1, approverUserId: 42, availableRoles: ['diretor'], transaction,
    });

    expect(repository.createImportProcessApproval).toHaveBeenCalledTimes(1);
    const [payload, usedTransaction] = repository.createImportProcessApproval.mock.calls[0];
    expect(payload).toMatchObject({ import_process_id: 1, approver_user_id: 42, approver_role: 'diretor' });
    expect(payload.approved_at).toBeInstanceOf(Date);
    expect(usedTransaction).toBe(transaction);
    expect(approval.approver_role).toBe('diretor');
  });

  it('usuario sem o papel diretor nao registra aprovacao', async () => {
    const repository = buildComexRepository();
    const useCase = new ApproveImportProcessUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, approverUserId: 42, availableRoles: [], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11-COMEX', required_roles: ['diretor'] });
    expect(repository.createImportProcessApproval).not.toHaveBeenCalled();
  });

  it('papel que ja aprovou nao aprova de novo', async () => {
    const repository = buildComexRepository({ approvals: [directorApproval] });
    const useCase = new ApproveImportProcessUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, approverUserId: 42, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11-COMEX' });
    expect(error.message).toMatch(/ja aprovou/i);
    expect(repository.createImportProcessApproval).not.toHaveBeenCalled();
  });

  it('processo ja embarcado nao aceita aprovacao retroativa', async () => {
    const repository = buildComexRepository({ process: { status: 'shipped' } });
    const useCase = new ApproveImportProcessUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, approverUserId: 42, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11-COMEX', current_status: 'shipped' });
    expect(repository.createImportProcessApproval).not.toHaveBeenCalled();
  });

  it('processo cancelado nao aceita aprovacao', async () => {
    const repository = buildComexRepository({ process: { status: 'cancelled' } });
    const useCase = new ApproveImportProcessUseCase(repository as any);

    const error: any = await useCase
      .execute({ id: 1, approverUserId: 42, availableRoles: ['diretor'], transaction })
      .catch((caught: any) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error.details).toMatchObject({ rule: 'G11-COMEX', current_status: 'cancelled' });
    expect(repository.createImportProcessApproval).not.toHaveBeenCalled();
  });

  it('le o processo COM LOCK dentro da transacao (duas aprovacoes simultaneas do mesmo papel)', async () => {
    const repository = buildComexRepository();
    const useCase = new ApproveImportProcessUseCase(repository as any);

    await useCase.execute({ id: 1, approverUserId: 42, availableRoles: ['diretor'], transaction });

    expect(repository.findImportProcessByIdForUpdate).toHaveBeenCalledWith(1, transaction);
    expect(repository.findImportProcessApprovalByRole).toHaveBeenCalledWith(1, 'diretor', transaction);
  });

  it('processo inexistente devolve 404, nao 422', async () => {
    const repository = buildComexRepository();
    repository.findImportProcessByIdForUpdate = jest.fn(async () => null) as any;
    const useCase = new ApproveImportProcessUseCase(repository as any);

    await expect(
      useCase.execute({ id: 404, approverUserId: 42, availableRoles: ['diretor'], transaction }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('G11-COMEX — situacao da alcada (ListImportProcessApprovalsUseCase)', () => {
  it('descreve o que falta sem efeito colateral', async () => {
    const repository = buildComexRepository();
    const useCase = new ListImportProcessApprovalsUseCase(repository as any);

    const data = await useCase.execute({ id: 1 });

    expect(data).toMatchObject({
      rule: 'G11-COMEX',
      process_status: 'draft',
      gate_event: 'shipped',
      can_register_approval: true,
      required_roles: ['diretor'],
      missing_roles: ['diretor'],
      approval_complete: false,
    });
    expect(repository.createImportProcessApproval).not.toHaveBeenCalled();
    expect(repository.updateImportProcess).not.toHaveBeenCalled();
  });

  it('marca a alcada como completa depois da aprovacao da diretoria', async () => {
    const repository = buildComexRepository({ approvals: [directorApproval] });
    const useCase = new ListImportProcessApprovalsUseCase(repository as any);

    const data = await useCase.execute({ id: 1 });

    expect(data).toMatchObject({ missing_roles: [], approval_complete: true, can_register_approval: false });
    expect(data.approvals).toHaveLength(1);
  });

  it('processo ja embarcado nao aceita mais registro de aprovacao', async () => {
    const repository = buildComexRepository({ process: { status: 'shipped' } });
    const useCase = new ListImportProcessApprovalsUseCase(repository as any);

    const data = await useCase.execute({ id: 1 });

    expect(data).toMatchObject({ process_status: 'shipped', can_register_approval: false, approval_complete: false });
  });

  it('processo inexistente devolve 404', async () => {
    const repository = buildComexRepository();
    repository.findImportProcessById = jest.fn(async () => null) as any;
    const useCase = new ListImportProcessApprovalsUseCase(repository as any);

    await expect(useCase.execute({ id: 404 })).rejects.toBeInstanceOf(NotFoundError);
  });
});
