/**
 * Ordem de manutenção — primeira escrita real do módulo `maintenance`.
 *
 * ## O defeito (achado de UAT de 2026-08-12)
 *
 * `POST /api/maintenance` morria em 500 em TODA chamada:
 * `CreateMaintenanceOrderUseCase` gravava `description` (coluna inexistente),
 * não gerava `order_number` (NOT NULL UNIQUE) e usava default
 * `priority: 'medium'` — valor que nem existe no enum. E o UPDATE tinha a
 * versão silenciosa do mesmo problema: `diagnosis`/`solution`/`cost` iam com
 * o nome da API, o Sequelize ignorava as chaves desconhecidas e a tela
 * "salvava" diagnóstico e custo **sem gravar nada**. Typecheck e o teste de
 * dublê passavam — a classe de defeito de
 * `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`;
 * o próprio teste unitário afirmava o `'medium'` quebrado.
 *
 * ## O que esta suíte prova (contra PostgreSQL real)
 *
 * | # | Pergunta | Etapa |
 * |---|---|---|
 * | 1 | a OM nasce com `OM-<ano>-NNNN`, `problem_description` e defaults válidos? | 2 |
 * | 2 | duas OMs seguidas recebem números distintos e sequenciais? | 2 |
 * | 3 | diagnóstico/serviço/custo do UPDATE ficam GRAVADOS de verdade? | 3 |
 * | 4 | iniciar a OM põe o ativo `in_maintenance`; concluir devolve `active`? | 3-4 |
 *
 * @module tests/integration/maintenance-order-lifecycle
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'OMLIF';
const SUFFIX = String(Date.now()).slice(-8);

describeIntegration('Manutenção — ciclo de vida real da ordem', () => {
  const ctx: Record<string, any> = {};

  /** @returns Token do administrador da suite. */
  function token(): string {
    return authToken();
  }

  /**
   * Afirma o status HTTP mostrando o CORPO quando falha.
   *
   * @param response - Resposta Supertest.
   * @param expected - Status esperado.
   * @param label - Descricao curta da chamada.
   * @returns A propria resposta, para encadear.
   */
  function expectStatus<T extends { status: number; body: any }>(response: T, expected: number, label: string): T {
    if (response.status !== expected) {
      throw new Error(
        `[${label}] esperado HTTP ${expected}, recebido ${response.status}. Corpo: ${JSON.stringify(response.body)}`,
      );
    }
    return response;
  }

  /** @returns Estado atual do ativo da suite, lido do banco via API. */
  async function fetchAsset(): Promise<any> {
    const response = await api()
      .get(`/api/assets/${ctx.assetId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(response, 200, 'asset:get');
    return response.body.data;
  }

  // ====================================================================
  // ETAPA 1 — O ativo do Patrimônio (pré-condição da OM)
  // ====================================================================
  it('etapa 1: cadastra o ativo em Patrimônio', async () => {
    const response = await api()
      .post('/api/assets')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        tag: `${P}-${SUFFIX}`,
        name: `${P} Furadeira de bancada`,
        asset_type: 'machine',
        location: 'Oficina',
      });
    expectStatus(response, 201, 'asset:create');
    ctx.assetId = response.body.data.id;
    expect(response.body.data.status).toBe('active');
  });

  // ====================================================================
  // ETAPA 2 — A criação que estourava 500 em toda chamada
  // ====================================================================
  it('etapa 2: abre a OM com número gerado e problema gravado; a segunda OM recebe o número seguinte', async () => {
    const primeira = await api()
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        asset_id: ctx.assetId,
        description: `${P} Mandril travado`,
        maintenance_type: 'corrective',
        priority: 'high',
      });
    expectStatus(primeira, 201, 'om:create:1');
    ctx.orderId = primeira.body.data.id;
    ctx.orderNumber = primeira.body.data.order_number;

    expect(ctx.orderNumber).toMatch(/^OM-\d{4}-\d{4}$/);
    expect(primeira.body.data.problem_description).toBe(`${P} Mandril travado`);
    expect(primeira.body.data.priority).toBe('high');
    expect(primeira.body.data.status).toBe('open');
    expect(primeira.body.data.report_date).toBeTruthy();

    // Sem priority no payload, o default precisa ser um valor VÁLIDO do enum.
    const segunda = await api()
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${token()}`)
      .send({ asset_id: ctx.assetId, description: `${P} Ruído no motor` });
    expectStatus(segunda, 201, 'om:create:2');
    expect(segunda.body.data.priority).toBe('normal');
    ctx.secondOrderId = segunda.body.data.id;

    const seq = (n: string) => Number(n.split('-').pop());
    expect(seq(segunda.body.data.order_number)).toBe(seq(ctx.orderNumber) + 1);
  });

  // ====================================================================
  // ETAPA 3 — O UPDATE que "salvava" sem gravar
  // ====================================================================
  it('etapa 3: iniciar a OM grava diagnóstico/custo de verdade e põe o ativo em manutenção', async () => {
    const update = await api()
      .put(`/api/maintenance/${ctx.orderId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        status: 'in_progress',
        diagnosis: 'Rolamento do mandril gasto',
        solution: 'Substituído o rolamento 6202',
        cost: 185.9,
        notes: 'Peça retirada do estoque MRO',
      });
    expectStatus(update, 200, 'om:update');

    // A prova é a LEITURA de volta do banco, não o eco do payload.
    const lida = await api()
      .get(`/api/maintenance/${ctx.orderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(lida, 200, 'om:get');
    expect(lida.body.data.diagnosed_problem).toBe('Rolamento do mandril gasto');
    expect(lida.body.data.service_performed).toBe('Substituído o rolamento 6202');
    expect(Number(lida.body.data.total_cost)).toBeCloseTo(185.9);
    expect(lida.body.data.notes).toBe('Peça retirada do estoque MRO');
    expect(lida.body.data.start_date).toBeTruthy();

    expect((await fetchAsset()).status).toBe('in_maintenance');
  });

  // ====================================================================
  // ETAPA 4 — Conclusão devolve o ativo (a 2ª OM ainda está aberta)
  // ====================================================================
  it('etapa 4: concluir com outra OM aberta NÃO libera o ativo; cancelar a última libera', async () => {
    const conclui = await api()
      .put(`/api/maintenance/${ctx.orderId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'completed' });
    expectStatus(conclui, 200, 'om:complete');

    // A 2ª OM do mesmo ativo continua aberta → o ativo permanece retido.
    expect((await fetchAsset()).status).toBe('in_maintenance');

    const cancela = await api()
      .delete(`/api/maintenance/${ctx.secondOrderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(cancela, 200, 'om:cancel');

    expect((await fetchAsset()).status).toBe('active');
  });
});
