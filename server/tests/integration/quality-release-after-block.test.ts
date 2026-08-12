/**
 * G7 — re-liberar um lote BLOQUEADO exige inspeção posterior ao bloqueio.
 *
 * ## A brecha (auditoria de 2026-08-11)
 *
 * `decideLotRelease` olhava apenas a inspeção **mais recente** do lote. A
 * regra foi escrita para o caminho "reprovou depois → não libera mais", e
 * nesse caminho ela funciona. O que ela não previu foi o bloqueio **sem
 * inspeção nova**:
 *
 * ```
 * inspeção APROVADA → lote liberado → defeito aparece em processo
 *   → RNC / bloqueio manual → lote 'blocked'
 *   → POST /lots/:id/release  ← concedido, com a MESMA inspeção antiga
 * ```
 *
 * A inspeção mais recente continuava sendo a aprovada de antes do bloqueio, o
 * gate dizia "aprovado" e o material bloqueado voltava para consumo sem que
 * ninguém tivesse olhado para ele de novo. É o oposto da ISO 9001:2015 §8.7
 * (impedir uso não pretendido de saída não conforme) — e, na prática, torna o
 * bloqueio decorativo, porque desfazê-lo não custa nada.
 *
 * ## O que esta suíte prova
 *
 * | # | Pergunta | Etapa |
 * |---|---|---|
 * | 1 | o bloqueio grava QUANDO ocorreu (`blocked_at`)? | 3 |
 * | 2 | re-liberar com a inspeção antiga é recusado (422 G7)? | 3 |
 * | 3 | inspeção aprovada POSTERIOR ao bloqueio libera de novo? | 4 |
 * | 4 | a liberação registra a inspeção NOVA como evidência? | 4 |
 * | 5 | o bloqueio vindo de RNC (não do endpoint) fecha igual? | 5 |
 *
 * O item 5 importa porque o bloqueio por RNC (`CreateNonConformityUseCase`) é
 * o caminho **mais comum** do cenário descrito — é ele que a Qualidade usa
 * quando o defeito aparece em processo, e ele escreve em `lot_controls` por
 * fora do `BlockLotUseCase`.
 *
 * @module tests/integration/quality-release-after-block
 */
import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'G7BLK';
const SUFFIX = String(Date.now()).slice(-8);

describeIntegration('G7 — re-liberacao de lote bloqueado exige inspecao posterior', () => {
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

  /**
   * Recebe um pedido de compra e devolve o lote em quarentena criado.
   *
   * O lote nasce em `quarantine` desde o G7 (todo recebimento de compra), que
   * e o estado real de onde a inspecao de recebimento parte.
   *
   * @param lotNumber - Numero do lote a criar.
   * @returns Lote recem-criado (`lot_controls`).
   */
  async function receiveLot(lotNumber: string): Promise<any> {
    const supplierId = Number(process.env.TEST_SUPPLIER_ID);
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const created = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token()}`)
      .send({ supplier_id: supplierId, items: [{ product_id: productId, quantity: 5, unit_price: 10 }] });
    expectStatus(created, 201, 'compra:create');
    const purchaseId = created.body.data.id;
    const itemId = created.body.data.items[0].id;

    // D-K (segregacao de funcao): quem solicita nao aprova.
    const approved = await api()
      .put(`/api/purchases/${purchaseId}/status`)
      .set('Authorization', `Bearer ${approverToken()}`)
      .send({ status: 'approved' });
    expectStatus(approved, 200, 'compra:approve');

    const sent = await api()
      .put(`/api/purchases/${purchaseId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'sent' });
    expectStatus(sent, 200, 'compra:sent');

    const received = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        items: [{ item_id: itemId, quantity: 5, lot_number: lotNumber }],
        invoice_number: `NF-${P}-${Date.now()}`,
      });
    expectStatus(received, 200, 'compra:receive');

    const lots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: productId, status: 'quarantine', limit: 5000 });
    expectStatus(lots, 200, 'lotes:quarentena');

    const lot = lots.body.data.find((item: any) => item.lot_number === lotNumber);
    expect(lot).toBeDefined();
    return lot;
  }

  /**
   * Registra uma inspecao de qualidade sobre o lote.
   *
   * @param lotId - Lote inspecionado.
   * @param verdict - Veredito do inspetor.
   * @param criteria - Criterio de aceitacao aplicado (evidencia ISO 9001 8.6).
   * @returns Inspecao criada.
   */
  async function inspect(lotId: number, verdict: string, criteria: string): Promise<any> {
    const inspection = await api()
      .post('/api/quality/inspections')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        lot_id: lotId,
        stage: 'incoming',
        acceptance_criteria: criteria,
        sample_size: 5,
        defects_found: 0,
        verdict,
      });
    expectStatus(inspection, 201, `inspecao:${verdict}`);
    return inspection.body.data;
  }

  // ====================================================================
  // ETAPA 1 e 2 — o caminho feliz que existia antes (e continua valendo)
  // ====================================================================
  it('etapa 1: recebe lote em quarentena, inspeciona e libera', async () => {
    ctx.lotNumber = `${P}-LOTE-${SUFFIX}`;
    const lot = await receiveLot(ctx.lotNumber);
    ctx.lotId = lot.id;
    expect(lot.status).toBe('quarantine');

    const primeira = await inspect(ctx.lotId, 'approved', 'Inspecao de recebimento: dimensional conforme desenho');
    ctx.primeiraInspecaoId = primeira.id;

    const release = await api()
      .post(`/api/inventory/lots/${ctx.lotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: 'Liberado apos inspecao de recebimento' });
    expectStatus(release, 200, 'lote:release:1');
    expect(release.body.data.status).toBe('available');
    expect(release.body.data.release_inspection_id).toBe(ctx.primeiraInspecaoId);
  });

  // ====================================================================
  // ETAPA 3 — A prova principal: bloqueio + inspecao ANTIGA nao libera
  // ====================================================================
  it('etapa 2: lote bloqueado nao volta a ser liberado com a inspecao anterior ao bloqueio', async () => {
    const block = await api()
      .post(`/api/inventory/lots/${ctx.lotId}/block`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ reason: 'Defeito de colagem identificado em processo' });
    expectStatus(block, 200, 'lote:block');
    expect(block.body.data.status).toBe('blocked');
    // O bloqueio passa a registrar QUANDO aconteceu — sem isso nao existe
    // "inspecao posterior ao bloqueio" que se possa exigir.
    expect(block.body.data.blocked_at).toBeTruthy();
    ctx.blockedAt = block.body.data.blocked_at;

    const release = await api()
      .post(`/api/inventory/lots/${ctx.lotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: 'Tentativa de desfazer o bloqueio sem reinspecionar' });
    expectStatus(release, 422, 'lote:release:aposBloqueio');
    expect(release.body.error.details.rule).toBe('G7');
    expect(release.body.error.details.reason).toBe('inspection_before_block');
    expect(release.body.error.details.inspection_id).toBe(ctx.primeiraInspecaoId);

    // Nada foi gravado: o lote continua bloqueado.
    const consulta = await api()
      .get(`/api/inventory/lots/by-code/${ctx.lotNumber}`)
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: Number(process.env.TEST_PRODUCT_ID) });
    expectStatus(consulta, 200, 'lote:consulta');
    expect(consulta.body.data.status).toBe('blocked');
    expect(consulta.body.data.blocked_at).toBeTruthy();
    // A evidencia da liberacao ANTERIOR continua registrada (historico), e e
    // justamente por isso que o gate nao pode depender dela: quem manda e
    // `blocked_at` x `inspected_at`.
    expect(consulta.body.data.release_inspection_id).toBe(ctx.primeiraInspecaoId);
  });

  // ====================================================================
  // ETAPA 4 — Reinspecionar depois do bloqueio reabre o caminho
  // ====================================================================
  it('etapa 3: inspecao aprovada POSTERIOR ao bloqueio libera o lote de novo', async () => {
    const segunda = await inspect(
      ctx.lotId,
      'approved',
      'Reinspecao apos retrabalho da colagem: 5 pecas verificadas, sem defeito',
    );
    ctx.segundaInspecaoId = segunda.id;

    const release = await api()
      .post(`/api/inventory/lots/${ctx.lotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: 'Liberado apos reinspecao' });
    expectStatus(release, 200, 'lote:release:2');
    expect(release.body.data.status).toBe('available');
    // A evidencia registrada e a inspecao NOVA, nao a antiga.
    expect(release.body.data.release_inspection_id).toBe(ctx.segundaInspecaoId);
    // E o marcador de bloqueio some junto com o bloqueio.
    expect(release.body.data.blocked_at ?? null).toBeNull();
  });

  // ====================================================================
  // ETAPA 5 — O mesmo vale para o bloqueio vindo de RNC
  // ====================================================================
  it('etapa 4: bloqueio por RNC tambem exige reinspecao para liberar', async () => {
    const lotNumber = `${P}-RNC-${SUFFIX}`;
    const lot = await receiveLot(lotNumber);
    const inspecao = await inspect(lot.id, 'approved', 'Inspecao de recebimento aprovada antes da RNC');

    const release = await api()
      .post(`/api/inventory/lots/${lot.id}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: 'Liberado apos inspecao de recebimento' });
    expectStatus(release, 200, 'lote:rnc:release:1');

    const rnc = await api()
      .post('/api/quality/non-conformities')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: Number(process.env.TEST_PRODUCT_ID),
        lot_number: lotNumber,
        description: 'Falha funcional detectada na linha de montagem apos a liberacao do lote',
        severity: 'major',
        origin: 'in_process',
        defect_type: 'other',
        quantity_affected: 2,
      });
    expectStatus(rnc, 201, 'rnc:create');

    const bloqueado = await api()
      .get(`/api/inventory/lots/by-code/${lotNumber}`)
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: Number(process.env.TEST_PRODUCT_ID) });
    expectStatus(bloqueado, 200, 'lote:rnc:consulta');
    expect(bloqueado.body.data.status).toBe('blocked');
    expect(bloqueado.body.data.blocked_at).toBeTruthy();

    const reRelease = await api()
      .post(`/api/inventory/lots/${lot.id}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: 'Tentativa de liberar com a inspecao anterior a RNC' });
    expectStatus(reRelease, 422, 'lote:rnc:release:2');
    expect(reRelease.body.error.details.rule).toBe('G7');
    expect(reRelease.body.error.details.reason).toBe('inspection_before_block');
    expect(reRelease.body.error.details.inspection_id).toBe(inspecao.id);
  });
});
