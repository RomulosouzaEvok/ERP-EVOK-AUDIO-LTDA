import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import type { Response } from 'supertest';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Teste de integracao contra PostgreSQL real do indice unico parcial
 * `uq_production_downtimes_open_per_work_center` (migration
 * `20260806-000060-create-production-downtimes.cjs`) —
 * `docs/governance/TODO.md`, "Teste de integracao real das 3 features de
 * maior risco da terceira rodada de 2026-08-06".
 *
 * `OpenProductionDowntimeUseCase` ja checa em aplicacao (`SELECT ... FOR
 * UPDATE`, dentro da transacao) se ha parada aberta no centro — mas esse
 * SELECT so trava linhas EXISTENTES; nao impede que duas transacoes
 * concorrentes, nenhuma vendo ainda a linha da outra, insiram as duas ao
 * mesmo tempo (classico "phantom read" de `SELECT FOR UPDATE`). O indice
 * parcial unico e a rede de seguranca real contra essa corrida — este
 * teste dispara 2 requests HTTP verdadeiramente concorrentes (`Promise.all`)
 * contra o mesmo centro de trabalho para provar que o banco (nao so a
 * checagem de aplicacao) impede a segunda parada aberta, e que o erro
 * resultante e tratado (409/422), nunca 500.
 */
describeIntegration('Paradas de producao — indice unico parcial (integracao real)', () => {
  const DOWNTIMES_BASE = '/api/production/downtimes';

  /**
   * Cria um centro de trabalho novo e isolado (codigo unico por timestamp)
   * para que cada teste tenha seu proprio "mundo" sem interferencia entre
   * casos.
   *
   * @returns Id do centro de trabalho criado.
   */
  async function createWorkCenter(): Promise<number> {
    const token = authToken();
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const response = await api()
      .post('/api/work-centers')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: `CI-WC-${suffix}`, name: `Centro CI ${suffix}` });

    if (response.status !== 201) {
      throw new Error(`Falha ao criar centro de trabalho fixture: ${JSON.stringify(response.body)}`);
    }
    return response.body.data.id;
  }

  it('impede abrir uma segunda parada no MESMO centro em requisicoes concorrentes (Promise.all)', async () => {
    const token = authToken();
    const workCenterId = await createWorkCenter();

    const [first, second] = await Promise.allSettled([
      api().post(DOWNTIMES_BASE).set('Authorization', `Bearer ${token}`).send({ work_center_id: workCenterId, reason: 'setup' }),
      api().post(DOWNTIMES_BASE).set('Authorization', `Bearer ${token}`).send({ work_center_id: workCenterId, reason: 'falta_material' }),
    ]);

    const responses = [first, second]
      .filter((result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled')
      .map((result) => result.value);

    expect(responses).toHaveLength(2);

    const successCount = responses.filter((response) => response.status === 201).length;
    const failureResponses = responses.filter((response) => response.status !== 201);

    expect(successCount).toBe(1);
    expect(failureResponses).toHaveLength(1);
    // Nunca 500: tanto a checagem de aplicacao (BusinessRuleError, 422)
    // quanto o indice unico do banco (UniqueConstraintError, mapeado para
    // 409 pelo errorHandler global) sao tratados no envelope padrao.
    expect([400, 409, 422]).toContain(failureResponses[0].status);
    expect(failureResponses[0].body.success).toBe(false);

    // Confirma no banco que so existe 1 parada aberta para este centro.
    const listResponse = await api()
      .get(DOWNTIMES_BASE)
      .set('Authorization', `Bearer ${token}`)
      .query({ work_center_id: workCenterId, open: 'true' });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
  });

  it('permite abrir uma nova parada apos encerrar a anterior no mesmo centro', async () => {
    const token = authToken();
    const workCenterId = await createWorkCenter();

    const openResponse = await api()
      .post(DOWNTIMES_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ work_center_id: workCenterId, reason: 'setup' });
    expect(openResponse.status).toBe(201);
    const downtimeId = openResponse.body.data.id;

    // Enquanto aberta, uma segunda parada no mesmo centro deve falhar.
    const blockedResponse = await api()
      .post(DOWNTIMES_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ work_center_id: workCenterId, reason: 'qualidade' });
    expect([400, 409, 422]).toContain(blockedResponse.status);

    // Encerra a parada.
    const finishResponse = await api()
      .put(`${DOWNTIMES_BASE}/${downtimeId}/finish`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(finishResponse.status).toBe(200);
    expect(finishResponse.body.data.finished_at).toBeTruthy();

    // Agora uma nova parada no mesmo centro deve ser aceita normalmente.
    const secondOpenResponse = await api()
      .post(DOWNTIMES_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ work_center_id: workCenterId, reason: 'qualidade' });
    expect(secondOpenResponse.status).toBe(201);
    expect(secondOpenResponse.body.data.id).not.toBe(downtimeId);
  });

  it('paradas abertas em centros de trabalho DIFERENTES coexistem sem conflito', async () => {
    const token = authToken();
    const [workCenterA, workCenterB] = await Promise.all([createWorkCenter(), createWorkCenter()]);

    const [responseA, responseB] = await Promise.all([
      api().post(DOWNTIMES_BASE).set('Authorization', `Bearer ${token}`).send({ work_center_id: workCenterA, reason: 'setup' }),
      api().post(DOWNTIMES_BASE).set('Authorization', `Bearer ${token}`).send({ work_center_id: workCenterB, reason: 'setup' }),
    ]);

    expect(responseA.status).toBe(201);
    expect(responseB.status).toBe(201);
    expect(responseA.body.data.id).not.toBe(responseB.body.data.id);
  });
});
