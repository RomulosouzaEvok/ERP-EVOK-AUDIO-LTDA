/**
 * Encerramento de RNC: data e autor gravados nas COLUNAS REAIS.
 *
 * ## O defeito
 *
 * `UpdateNonConformityUseCase` gravava `closed_at`; a coluna de
 * `non_conformities` é `closed_date` (`DATE`). O Sequelize **descarta em
 * silêncio** uma chave que não é atributo do model: o `UPDATE` saía sem ela,
 * a API respondia `200`, e toda RNC fechada ficava sem data de fechamento.
 * ISO 9001:2015 §8.7 e §10.2 exigem essa data — sem ela não há como medir
 * tempo de tratativa nem provar tempestividade em auditoria.
 *
 * A varredura de 2026-08-10 apontou **uma** ocorrência. Ao varrer o módulo,
 * apareceu uma **segunda**, no outro caminho de encerramento
 * (`DELETE /api/quality/non-conformities/:id` →
 * `CloseNonConformityUseCase`), que gravava apenas `status = 'closed'`, sem
 * data e sem autor. Sintoma idêntico, rota diferente.
 *
 * Como o banco tem hoje 6 RNCs, **todas `open`**, nenhuma perda já ocorreu —
 * é exatamente por isso que a correção vale antes do Go-Live: depois exigiria
 * reconstituir uma data que ninguém tem.
 *
 * @module tests/unit/non-conformity-closure-date
 */

import CloseNonConformityUseCase = require('../../src/modules/nonConformities/application/use-cases/CloseNonConformityUseCase');
import UpdateNonConformityUseCase = require('../../src/modules/nonConformities/application/use-cases/UpdateNonConformityUseCase');
import { NotFoundError } from '../../src/errors';
import { buildClosedDate, buildClosureFields } from '../../src/modules/nonConformities/domain/closure';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Repositório dublê mínimo dos dois caminhos de encerramento.
 *
 * @param current - Registro devolvido por `findById`.
 * @returns Dublê com `update`/`findById` espionáveis.
 */
function makeRepository(current: any = { id: 1, status: 'open' }) {
  return {
    update: jest.fn(async () => 1),
    findById: jest.fn(async () => current),
  };
}

describe('domain/closure: formato exigido por non_conformities.closed_date', () => {
  /** A coluna é `DATE` — um `Date` cru viraria timestamp e não é o contrato. */
  it('produz YYYY-MM-DD, o formato de uma coluna DATE', () => {
    expect(buildClosedDate(new Date('2026-08-10T13:45:00.000Z'))).toBe('2026-08-10');
    expect(buildClosedDate()).toMatch(ISO_DATE);
  });

  it('monta autor e data juntos, para que nenhum caminho grave só metade', () => {
    expect(buildClosureFields(42, new Date('2026-08-10T13:45:00.000Z'))).toEqual({
      closed_by: 42,
      closed_date: '2026-08-10',
    });
  });
});

describe('PUT /api/quality/non-conformities/:id — encerramento por atualização', () => {
  it('grava closed_date (não closed_at) e closed_by ao fechar', async () => {
    const repository = makeRepository();
    const useCase = new UpdateNonConformityUseCase(repository as any);

    await useCase.execute({ id: 1, body: { status: 'closed' }, closedBy: 42 });

    const [id, payload] = repository.update.mock.calls[0] as any;
    expect(id).toBe(1);
    expect(payload.status).toBe('closed');
    expect(payload.closed_by).toBe(42);
    expect(payload.closed_date).toMatch(ISO_DATE);
    // A chave que o Sequelize engolia — se voltar, este teste cai.
    expect(payload).not.toHaveProperty('closed_at');
  });

  it('não grava data de encerramento quando o status não é closed', async () => {
    const repository = makeRepository();
    const useCase = new UpdateNonConformityUseCase(repository as any);

    await useCase.execute({ id: 1, body: { status: 'analysis' }, closedBy: 42 });

    const [, payload] = repository.update.mock.calls[0] as any;
    expect(payload).not.toHaveProperty('closed_date');
    expect(payload).not.toHaveProperty('closed_by');
  });

  /**
   * Anti-spoofing de identidade (mesma regra P0 da remediação 3.1): quem
   * encerrou vem do JWT, nunca do corpo da requisição. `closed_by` estava em
   * `ALLOWED_FIELDS`, então bastava mandá-lo no payload para atribuir o
   * encerramento a outra pessoa.
   */
  it('ignora closed_by vindo do body e usa o do usuário autenticado', async () => {
    const repository = makeRepository();
    const useCase = new UpdateNonConformityUseCase(repository as any);

    await useCase.execute({
      id: 1,
      body: { status: 'closed', closed_by: 999 },
      closedBy: 42,
    });

    const [, payload] = repository.update.mock.calls[0] as any;
    expect(payload.closed_by).toBe(42);
  });

  it('ignora closed_by do body mesmo sem encerrar a RNC', async () => {
    const repository = makeRepository();
    const useCase = new UpdateNonConformityUseCase(repository as any);

    await useCase.execute({ id: 1, body: { status: 'analysis', closed_by: 999 }, closedBy: 42 });

    const [, payload] = repository.update.mock.calls[0] as any;
    expect(payload).not.toHaveProperty('closed_by');
  });
});

describe('DELETE /api/quality/non-conformities/:id — segunda ocorrência do mesmo defeito', () => {
  it('grava status, closed_date e closed_by (antes gravava só o status)', async () => {
    const repository = makeRepository();
    const useCase = new CloseNonConformityUseCase(repository as any);

    const result = await useCase.execute({ id: 7, closedBy: 42 });

    expect(result).toEqual({ message: 'Não conformidade fechada' });
    const [id, payload] = repository.update.mock.calls[0] as any;
    expect(id).toBe(7);
    expect(payload.status).toBe('closed');
    expect(payload.closed_by).toBe(42);
    expect(payload.closed_date).toMatch(ISO_DATE);
  });

  it('lança NotFoundError quando a RNC não existe', async () => {
    const repository = { update: jest.fn(async () => 0), findById: jest.fn() };
    const useCase = new CloseNonConformityUseCase(repository as any);

    await expect(useCase.execute({ id: 999, closedBy: 42 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('os dois caminhos de encerramento não podem divergir', () => {
  /**
   * O defeito nasceu de dois caminhos escrevendo o encerramento por conta
   * própria. Este teste é o que impede a divergência de voltar: ambos têm que
   * produzir exatamente o mesmo conjunto de campos de encerramento.
   *
   * @returns Promise resolvida após comparar os dois payloads.
   */
  it('PUT e DELETE gravam o mesmo conjunto de campos de encerramento', async () => {
    const viaUpdate = makeRepository();
    const viaClose = makeRepository();

    await new UpdateNonConformityUseCase(viaUpdate as any).execute({
      id: 1, body: { status: 'closed' }, closedBy: 42,
    });
    await new CloseNonConformityUseCase(viaClose as any).execute({ id: 1, closedBy: 42 });

    const [, updatePayload] = viaUpdate.update.mock.calls[0] as any;
    const [, closePayload] = viaClose.update.mock.calls[0] as any;

    const closureOf = (p: any) => ({
      status: p.status, closed_by: p.closed_by, closed_date: p.closed_date,
    });
    expect(closureOf(updatePayload)).toEqual(closureOf(closePayload));
  });
});
