/**
 * D-L / D-M — O GATE DE QUALIDADE NA SAIDA, contra PostgreSQL real.
 *
 * ## O buraco que esta suite fecha
 *
 * O G7 fechou a qualidade na ENTRADA: lote de compra nasce em quarentena e so
 * a Qualidade libera, com inspecao registrada. A SAIDA continuou aberta — a
 * baixa de estoque do faturamento (`services/saleStockService.ts`) mexia em
 * `products.quantity` e no deposito ACABADOS **sem nunca olhar o status do
 * lote**. Produto reprovado saia pela porta com nota fiscal, e num recall nao
 * havia como responder "para qual cliente foi o lote X".
 *
 * O criterio de pronto do dono
 * (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §5) marca esse
 * item como o unico que estava aberto **pela metade da saida**. As decisoes
 * D-L (gate) e D-M (devolucao ao MESMO lote) implementaram a regra em
 * `services/saleLotService.ts` + `sale_lot_shipments` (migration
 * `20260810-000039`); esta suite e a prova de que ela funciona contra o banco,
 * e nao apenas contra dublê — as 8 suites unitarias que tocam esse caminho
 * **dublam** o servico de proposito, entao sem este arquivo a regra nunca
 * tinha sido executada de verdade.
 *
 * ## O que e provado aqui
 *
 * | # | Pergunta | Onde |
 * |---|---|---|
 * | 1 | lote em quarentena impede faturar? | etapa 4 |
 * | 2 | o bloqueio e ATOMICO (nao queima numero de NF-e, nao grava nada)? | etapa 4 |
 * | 3 | liberacao PARCIAL ainda bloqueia (4 liberadas < 5 pedidas)? | etapa 5 |
 * | 4 | com tudo liberado, sai FEFO (vence antes sai antes)? | etapa 6 |
 * | 5 | a expedicao deixa rastro por lote (`sale_lot_shipments`)? | etapa 6 |
 * | 6 | cancelar a nota devolve ao MESMO lote, na mesma quantidade? | etapa 7 |
 * | 7 | lote que zerou reabre; lote `blocked` continua blocked? | etapas 7 e 8 |
 * | 8 | produto sem lote nenhum (estoque legado) ainda fatura? | etapa 9 |
 *
 * ## Convencoes
 *
 * Cadeia real de ponta a ponta, sem atalho de escrita direta no banco em
 * nenhum caminho de negocio: compra -> aprovacao por um SEGUNDO usuario (D-K)
 * -> recebimento (lote nasce em quarentena) -> inspecao + liberacao pela
 * Qualidade (G7) -> transferencia INSUMOS->ACABADOS -> venda -> NF-e. O banco
 * so e lido diretamente para CONFERIR o que a API gravou, e escrito
 * diretamente num unico ponto (etapa 8), onde o evento simulado — uma RNC
 * aberta DEPOIS do embarque — nao tem endpoint proprio.
 *
 * Todo registro leva o sufixo `DL-<timestamp>`, para permitir limpeza.
 *
 * @module tests/integration/sale-lot-quality-gate
 */
import { randomUUID } from 'crypto';
import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'DL';
const SUFFIX = String(Date.now()).slice(-8);

/** Lote que vence ANTES — pelo FEFO, tem de sair primeiro. */
const LOTE_CURTO_QTY = 4;
/** Lote que vence depois — so e tocado quando o curto acaba. */
const LOTE_LONGO_QTY = 6;
/** Quantidade vendida: 5 = esgota o lote curto (4) e entra 1 no longo. */
const VENDA_QTY = 5;

describeIntegration('D-L/D-M — gate de qualidade na SAIDA e devolucao ao mesmo lote', () => {
  const ctx: Record<string, any> = {};

  /** @returns Token do dono da suite (quem solicita e opera). */
  function token(): string {
    return authToken();
  }

  /** @returns Token do SEGUNDO administrador (quem aprova — D-K). */
  function approver(): string {
    return approverToken();
  }

  /**
   * Afirma o status HTTP mostrando o CORPO quando falha (um 422 mudo custa
   * uma rodada inteira de investigacao).
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
   * Data futura em `YYYY-MM-DD`.
   *
   * @param days - Dias a somar a hoje.
   * @returns Data ISO curta.
   */
  function futureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  /**
   * Le os lotes do produto direto do banco, ordenados por id.
   *
   * @param productId - Produto alvo.
   * @returns Linhas cruas de `lot_controls`.
   */
  async function lotsOf(productId: number): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LotControl } = require('../../src/models/index');
    return LotControl.findAll({ where: { product_id: productId }, order: [['id', 'ASC']] });
  }

  /**
   * Le as saidas por lote de uma venda.
   *
   * @param saleId - Venda alvo.
   * @returns Linhas cruas de `sale_lot_shipments`.
   */
  async function shipmentsOf(saleId: number): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SaleLotShipment } = require('../../src/models/index');
    return SaleLotShipment.findAll({ where: { sale_id: saleId }, order: [['id', 'ASC']] });
  }

  /**
   * Saldo global do produto (`products.quantity`).
   *
   * @param productId - Produto alvo.
   * @returns Saldo atual.
   */
  async function stockOf(productId: number): Promise<number> {
    const response = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${token()}`);
    expectStatus(response, 200, `stockOf:${productId}`);
    return Number(response.body.data.quantity);
  }

  /**
   * Compra + recebimento de UM lote, pelo caminho real (com D-K na aprovacao).
   *
   * @param lotNumber - Numero do lote a criar no recebimento.
   * @param quantity - Quantidade recebida.
   * @param expiresInDays - Validade, em dias a partir de hoje.
   * @returns Id do lote criado (que nasce em `quarantine`).
   */
  async function receiveLot(lotNumber: string, quantity: number, expiresInDays: number): Promise<number> {
    const purchase = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        supplier_id: ctx.supplierId,
        items: [{ product_id: ctx.productId, quantity, unit_price: 10 }],
        notes: `${P} compra do lote ${lotNumber}`,
      });
    expectStatus(purchase, 201, `purchase:${lotNumber}`);
    const purchaseId = purchase.body.data.id;
    const itemId = purchase.body.data.items[0].id;

    // D-K: quem solicita nao aprova — a aprovacao sai do segundo usuario.
    for (const [status, statusToken] of [['approved', approver()], ['sent', token()]] as [string, string][]) {
      const changed = await api()
        .put(`/api/purchases/${purchaseId}/status`)
        .set('Authorization', `Bearer ${statusToken}`)
        .send({ status });
      expectStatus(changed, 200, `purchase:${lotNumber}:${status}`);
    }

    const received = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        invoice_number: `${P}-NF-${lotNumber}`,
        items: [{ item_id: itemId, quantity, lot_number: lotNumber, expires_at: futureDate(expiresInDays) }],
      });
    expectStatus(received, 200, `receive:${lotNumber}`);

    const lots = await lotsOf(ctx.productId);
    const lot = lots.find((row: any) => row.lot_number === lotNumber);
    expect(lot).toBeDefined();
    // G7: lote de compra NASCE bloqueado para consumo. Se este expect cair, o
    // gate da saida esta sendo testado contra uma premissa falsa.
    expect(lot.status).toBe('quarantine');
    return Number(lot.id);
  }

  /**
   * Inspeciona e libera um lote pelo caminho da Qualidade (G7).
   *
   * @param lotId - Lote em quarentena.
   * @param label - Rotulo para mensagens de erro.
   * @returns void
   */
  async function releaseLot(lotId: number, label: string): Promise<void> {
    const inspection = await api()
      .post('/api/quality/inspections')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        lot_id: lotId,
        stage: 'incoming',
        acceptance_criteria: 'Conformidade visual e dimensional (validacao D-L)',
        sampling_plan: 'Amostragem simples, nivel II',
        sample_size: 3,
        defects_found: 0,
        verdict: 'approved',
        notes: `${P} inspecao ${label}`,
      });
    expectStatus(inspection, 201, `inspection:${label}`);

    const release = await api()
      .post(`/api/inventory/lots/${lotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} liberado apos inspecao (${label})` });
    expectStatus(release, 200, `release:${label}`);
    expect(release.body.data.status).toBe('available');
  }

  /**
   * Transfere saldo de INSUMOS para ACABADOS pelo caminho real (com
   * aprovacao por um segundo usuario).
   *
   * Existe porque tanto o recebimento de compra quanto a entrada avulsa de
   * estoque caem em INSUMOS, e a baixa do faturamento le exclusivamente
   * ACABADOS (`saleStockService`). Nao ha roteamento automatico entre
   * depositos — a transferencia e um ato explicito (BUSINESS_RULES §12).
   *
   * @param productId - Produto a transferir.
   * @param quantity - Quantidade.
   * @param reason - Motivo registrado na transferencia.
   * @returns void
   */
  async function moveToAcabados(productId: number, quantity: number, reason: string): Promise<void> {
    const transfer = await api()
      .post('/api/inventory/transfers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: productId,
        from_warehouse_code: 'INSUMOS',
        to_warehouse_code: 'ACABADOS',
        quantity,
        reason,
      });
    expectStatus(transfer, 201, `transfer:${productId}`);

    const approved = await api()
      .put(`/api/inventory/transfers/${transfer.body.data.id}/approve`)
      .set('Authorization', `Bearer ${approver()}`)
      .send({});
    expectStatus(approved, 200, `transfer:${productId}:approved`);
  }

  /** Gera um CNPJ com digitos verificadores validos, unico por chamada. */
  function generateValidCnpj(): string {
    const base = Array.from({ length: 12 }, (_, index) => (index < 8 ? Math.floor(Math.random() * 10) : 0));
    base[8] = 0;
    base[9] = 0;
    base[10] = 0;
    base[11] = 1;

    const digit = (numbers: number[]): number => {
      const weights = numbers.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const sum = numbers.reduce((acc, value, index) => acc + value * weights[index], 0);
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    };

    const d1 = digit(base);
    const d2 = digit([...base, d1]);
    return [...base, d1, d2].join('');
  }

  // ====================================================================
  // ETAPA 1 — Cadastro
  // ====================================================================
  it('etapa 1: cadastra o produto de revenda e o fornecedor', async () => {
    const code = `${P}-PROD-${SUFFIX}`;

    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Alto-falante de revenda ${SUFFIX}`,
        code,
        description: 'Produto governado por lote — validacao do gate D-L na saida',
        price: 250,
        cost_price: 100,
        quantity: 0,
        product_type: 'finished',
        status: 'active',
        ncm: '85182100',
        cest: '2106400',
        weight: 1,
        unit: 'un',
        lead_time: 1,
        location: 'DL',
        revision: '00',
      });
    expectStatus(product, 201, 'product');
    ctx.productId = product.body.data.id;
    ctx.productCode = code;

    const supplier = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        company_name: `${P} Fornecedor ${SUFFIX}`,
        trade_name: `${P} Revenda`,
        cnpj: generateValidCnpj(),
        ie: 'ISENTO',
        phone: '(11) 4000-0000',
        email: `dl-fornecedor-${SUFFIX}@evok.local`,
        payment_terms: '30 dias',
        // G11 — declaracao obrigatoria desde 2026-08-11: e ela que decide a
        // alcada (importacao exige a diretoria em qualquer valor).
        is_foreign: false,
      });
    expectStatus(supplier, 201, 'supplier');
    ctx.supplierId = supplier.body.data.id;
  });

  // ====================================================================
  // ETAPA 2 — Dois lotes, ambos em quarentena
  // ====================================================================
  it('etapa 2: recebe DOIS lotes de validades diferentes — os dois nascem em quarentena (G7)', async () => {
    ctx.loteCurto = `${P}-CURTO-${SUFFIX}`;
    ctx.loteLongo = `${P}-LONGO-${SUFFIX}`;

    // Recebido primeiro o de validade LONGA, de proposito: assim o FEFO da
    // etapa 6 nao pode ser confundido com ordem de id/chegada.
    ctx.loteLongoId = await receiveLot(ctx.loteLongo, LOTE_LONGO_QTY, 180);
    ctx.loteCurtoId = await receiveLot(ctx.loteCurto, LOTE_CURTO_QTY, 20);

    expect(await stockOf(ctx.productId)).toBeCloseTo(LOTE_CURTO_QTY + LOTE_LONGO_QTY, 4);
  });

  // ====================================================================
  // ETAPA 3 — O material vai para o deposito de onde a venda baixa
  // ====================================================================
  it('etapa 3: transfere o material de INSUMOS para ACABADOS e cria a venda confirmada', async () => {
    await moveToAcabados(
      ctx.productId,
      LOTE_CURTO_QTY + LOTE_LONGO_QTY,
      'Produto de revenda disponibilizado para expedicao (validacao D-L)',
    );

    const client = await api()
      .post('/api/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: `${P} Cliente ${SUFFIX}`, cpf_cnpj: generateValidCnpj(), state: 'SP' });
    expectStatus(client, 201, 'client');

    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        customer_id: client.body.data.id,
        items: [{ product_id: ctx.productId, quantity: VENDA_QTY, unit_price: 250 }],
        payment_method: 'pix',
        status: 'confirmed',
      });
    expectStatus(sale, 201, 'sale');
    ctx.saleId = sale.body.data.id;

    // G9: confirmar RESERVA, nao baixa. O saldo global segue intacto.
    expect(await stockOf(ctx.productId)).toBeCloseTo(LOTE_CURTO_QTY + LOTE_LONGO_QTY, 4);
  });

  // ====================================================================
  // ETAPA 4 — A prova principal: quarentena impede faturar, e sem sequela
  // ====================================================================
  it('etapa 4: com TODO o saldo em quarentena, faturar e bloqueado por D-L — e nada e gravado', async () => {
    const estoqueAntes = await stockOf(ctx.productId);

    const blocked = await api()
      .post(`/api/sales/${ctx.saleId}/nfe`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(blocked, 422, 'nfe:bloqueada');
    expect(blocked.body.error.details.rule).toBe('D-L');
    expect(blocked.body.error.details.product_id).toBe(ctx.productId);
    expect(Number(blocked.body.error.details.released_quantity)).toBe(0);
    expect(Number(blocked.body.error.details.missing_quantity)).toBeCloseTo(VENDA_QTY, 4);

    // A mensagem tem de citar OS DOIS lotes retidos, com o motivo — e um
    // vendedor com o cliente na frente que le isso.
    const bloqueantes = blocked.body.error.details.blocking_lots.map((lot: any) => lot.lot_number);
    expect(bloqueantes).toEqual(expect.arrayContaining([ctx.loteCurto, ctx.loteLongo]));
    expect(blocked.body.error.details.blocking_lots.every((lot: any) => lot.lot_status === 'quarantine')).toBe(true);

    // ATOMICIDADE — o motivo de o gate rodar ANTES na transacao de abertura:
    // numero de NF-e nao pode ser queimado, e o pedido nao pode ficar preso
    // em 'processing'.
    const sale = await api().get(`/api/sales/${ctx.saleId}`).set('Authorization', `Bearer ${token()}`);
    expectStatus(sale, 200, 'sale:apos-bloqueio');
    expect(sale.body.data.status).toBe('confirmed');
    expect(sale.body.data.nfe_status === null || sale.body.data.nfe_status === 'pending').toBe(true);
    expect(sale.body.data.nfe_key ?? null).toBeNull();

    expect(await shipmentsOf(ctx.saleId)).toHaveLength(0);
    expect(await stockOf(ctx.productId)).toBeCloseTo(estoqueAntes, 4);
  });

  // ====================================================================
  // ETAPA 5 — Liberacao parcial nao destrava
  // ====================================================================
  it('etapa 5: liberar SO o lote curto (4) ainda bloqueia uma emissao de 5', async () => {
    await releaseLot(ctx.loteCurtoId, 'lote curto');

    const stillBlocked = await api()
      .post(`/api/sales/${ctx.saleId}/nfe`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(stillBlocked, 422, 'nfe:parcial');
    expect(stillBlocked.body.error.details.rule).toBe('D-L');
    expect(Number(stillBlocked.body.error.details.released_quantity)).toBeCloseTo(LOTE_CURTO_QTY, 4);
    expect(Number(stillBlocked.body.error.details.missing_quantity)).toBeCloseTo(VENDA_QTY - LOTE_CURTO_QTY, 4);

    // Agora so o lote LONGO aparece como bloqueante — o curto ja saiu da lista.
    const bloqueantes = stillBlocked.body.error.details.blocking_lots.map((lot: any) => lot.lot_number);
    expect(bloqueantes).toEqual([ctx.loteLongo]);

    expect(await shipmentsOf(ctx.saleId)).toHaveLength(0);
  });

  // ====================================================================
  // ETAPA 6 — Liberado tudo: sai FEFO e deixa rastro
  // ====================================================================
  it('etapa 6: com os dois lotes liberados a NF-e autoriza, consumindo FEFO e gravando o rastro', async () => {
    await releaseLot(ctx.loteLongoId, 'lote longo');

    const issued = await api()
      .post(`/api/sales/${ctx.saleId}/nfe`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(issued, 202, 'nfe:autorizada');
    expect(issued.body.data.nfe_status).toBe('authorized');
    expect(issued.body.data.status).toBe('invoiced');

    // FEFO: o lote que vence ANTES (curto) sai INTEIRO, e so o resto (1) vem
    // do lote longo. Se a ordem fosse por id/chegada, o longo teria saido
    // primeiro — foi por isso que ele foi recebido antes.
    const shipments = await shipmentsOf(ctx.saleId);
    expect(shipments).toHaveLength(2);
    expect(Number(shipments[0].lot_control_id)).toBe(ctx.loteCurtoId);
    expect(Number(shipments[0].quantity)).toBeCloseTo(LOTE_CURTO_QTY, 4);
    expect(Number(shipments[1].lot_control_id)).toBe(ctx.loteLongoId);
    expect(Number(shipments[1].quantity)).toBeCloseTo(VENDA_QTY - LOTE_CURTO_QTY, 4);
    expect(shipments.every((row: any) => row.status === 'shipped')).toBe(true);
    // O dono da linha e a EMISSAO, nao o pedido — e o que permite cancelar
    // uma nota de um faturamento parcial sem devolver o pedido inteiro.
    expect(shipments.every((row: any) => row.sale_invoice_id !== null)).toBe(true);
    ctx.saleInvoiceId = Number(shipments[0].sale_invoice_id);

    // O saldo do lote acompanhou a saida, e o lote zerado virou 'consumed'.
    const lots = await lotsOf(ctx.productId);
    const curto = lots.find((row: any) => Number(row.id) === ctx.loteCurtoId);
    const longo = lots.find((row: any) => Number(row.id) === ctx.loteLongoId);
    expect(Number(curto.quantity_available)).toBeCloseTo(0, 4);
    expect(curto.status).toBe('consumed');
    expect(Number(longo.quantity_available)).toBeCloseTo(LOTE_LONGO_QTY - (VENDA_QTY - LOTE_CURTO_QTY), 4);
    expect(longo.status).toBe('available');

    expect(await stockOf(ctx.productId)).toBeCloseTo(LOTE_CURTO_QTY + LOTE_LONGO_QTY - VENDA_QTY, 4);
  });

  // ====================================================================
  // ETAPA 7 — D-M: a devolucao volta ao MESMO lote
  // ====================================================================
  it('etapa 7: cancelar a NF-e devolve exatamente ao lote de origem e reabre o que tinha zerado', async () => {
    const cancel = await api()
      .post(`/api/sales/${ctx.saleId}/nfe/cancel`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ reason: 'Cancelamento para validar a devolucao ao mesmo lote (D-M)' });
    expectStatus(cancel, 200, 'nfe:cancelada');
    expect(cancel.body.data.nfe_status).toBe('cancelled');

    const lots = await lotsOf(ctx.productId);
    const curto = lots.find((row: any) => Number(row.id) === ctx.loteCurtoId);
    const longo = lots.find((row: any) => Number(row.id) === ctx.loteLongoId);

    // Cada lote recebeu de volta EXATAMENTE o que dele saiu — nao "o primeiro
    // lote disponivel", que zeraria a rastreabilidade do recall.
    expect(Number(curto.quantity_available)).toBeCloseTo(LOTE_CURTO_QTY, 4);
    expect(Number(longo.quantity_available)).toBeCloseTo(LOTE_LONGO_QTY, 4);
    // O lote que tinha zerado POR CAUSA da expedicao volta a ser vendavel.
    expect(curto.status).toBe('available');

    // Nada e apagado: o par saida/retorno continua visivel para a auditoria.
    const shipments = await shipmentsOf(ctx.saleId);
    expect(shipments).toHaveLength(2);
    expect(shipments.every((row: any) => row.status === 'returned')).toBe(true);
    expect(shipments.every((row: any) => row.returned_at !== null)).toBe(true);
    expect(Number(shipments[0].quantity_returned)).toBeCloseTo(LOTE_CURTO_QTY, 4);

    expect(await stockOf(ctx.productId)).toBeCloseTo(LOTE_CURTO_QTY + LOTE_LONGO_QTY, 4);
  });

  // ====================================================================
  // ETAPA 8 — Devolver mercadoria nao e liberar qualidade
  // ====================================================================
  it('etapa 8: lote BLOQUEADO depois do embarque continua bloqueado quando a mercadoria volta', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LotControl } = require('../../src/models/index');

    // Cancelar a NF-e da etapa 7 devolveu o material AO PEDIDO — ele voltou a
    // ficar reservado para a venda 1. Encerrar essa venda e o que libera a
    // reserva; sem isso as emissoes abaixo esbarrariam em saldo, e nao na
    // regra que esta suite mede.
    const encerraVenda1 = await api()
      .put(`/api/sales/${ctx.saleId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'canceled' });
    expectStatus(encerraVenda1, 200, 'sale:1:cancelada');

    // Segunda emissao, agora so do lote curto (4 un), para ter uma saida viva.
    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        customer_id: (await api()
          .post('/api/clients')
          .set('Authorization', `Bearer ${token()}`)
          .send({ name: `${P} Cliente RNC ${SUFFIX}`, cpf_cnpj: generateValidCnpj(), state: 'SP' })).body.data.id,
        items: [{ product_id: ctx.productId, quantity: LOTE_CURTO_QTY, unit_price: 250 }],
        payment_method: 'pix',
        status: 'confirmed',
      });
    expectStatus(sale, 201, 'sale:rnc');
    const saleId = sale.body.data.id;

    const issued = await api().post(`/api/sales/${saleId}/nfe`).set('Authorization', `Bearer ${token()}`).send({});
    expectStatus(issued, 202, 'nfe:rnc');

    const shipments = await shipmentsOf(saleId);
    expect(shipments).toHaveLength(1);
    expect(Number(shipments[0].lot_control_id)).toBe(ctx.loteCurtoId);

    // Evento sem endpoint proprio: a Qualidade abre uma RNC sobre o lote
    // DEPOIS de ele ja ter embarcado. Unico ponto desta suite com escrita
    // direta, e de proposito — nao ha caminho de API que bloqueie um lote
    // cujo saldo ja saiu.
    await LotControl.update({ status: 'blocked' }, { where: { id: ctx.loteCurtoId } });

    const cancel = await api()
      .post(`/api/sales/${saleId}/nfe/cancel`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ reason: 'Devolucao de mercadoria de lote sob nao conformidade (validacao D-M)' });
    expectStatus(cancel, 200, 'nfe:rnc:cancelada');

    const curto = (await lotsOf(ctx.productId)).find((row: any) => Number(row.id) === ctx.loteCurtoId);
    // O saldo volta (a mercadoria existe fisicamente)...
    expect(Number(curto.quantity_available)).toBeCloseTo(LOTE_CURTO_QTY, 4);
    // ...mas o lote CONTINUA bloqueado: devolver mercadoria nao e liberar
    // qualidade. Se isto virar 'available', o material reprovado volta a ser
    // vendavel sozinho.
    expect(curto.status).toBe('blocked');

    // Cancelar a NF-e devolve o material AO PEDIDO (volta a ficar reservado
    // para ele). Cancelar a venda e o que libera a reserva — sem isso a nova
    // emissao abaixo falharia por saldo, e nao pelo motivo que se quer medir.
    const canceledSale = await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'canceled' });
    expectStatus(canceledSale, 200, 'sale:rnc:cancelada');

    // E, coerentemente, o lote bloqueado agora barra uma nova emissao: ha 10
    // no saldo, mas so LOTE_LONGO_QTY liberados.
    const novaVenda = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        customer_id: sale.body.data.customer_id,
        items: [{ product_id: ctx.productId, quantity: LOTE_LONGO_QTY + 1, unit_price: 250 }],
        payment_method: 'pix',
        status: 'confirmed',
      });
    expectStatus(novaVenda, 201, 'sale:pos-rnc');
    const bloqueada = await api()
      .post(`/api/sales/${novaVenda.body.data.id}/nfe`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(bloqueada, 422, 'nfe:pos-rnc');
    expect(bloqueada.body.error.details.rule).toBe('D-L');
    expect(bloqueada.body.error.details.blocking_lots[0].lot_status).toBe('blocked');
  });

  // ====================================================================
  // ETAPA 9 — Estoque legado nao pode ficar travado
  // ====================================================================
  it('etapa 9: produto SEM lote nenhum (estoque legado) continua faturando normalmente', async () => {
    // A regra degrada, nao trava: o ERP tem produto anterior ao controle de
    // lote, e exigir lote de todo mundo pararia o faturamento da empresa.
    const legado = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Produto legado sem lote ${SUFFIX}`,
        code: `${P}-LEGADO-${SUFFIX}`,
        description: 'Produto sem governanca de lote — prova que o gate degrada em vez de travar',
        price: 90,
        cost_price: 40,
        quantity: 0,
        product_type: 'finished',
        status: 'active',
        ncm: '85182100',
        cest: '2106400',
        weight: 1,
        unit: 'un',
        lead_time: 1,
        location: 'DL',
        revision: '00',
      });
    expectStatus(legado, 201, 'product:legado');
    const legadoId = legado.body.data.id;

    const entrada = await api()
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: legadoId,
        operation_id: randomUUID(),
        type: 'in',
        quantity: 3,
        description: 'Saldo inicial de produto legado (validacao D-L)',
      });
    expectStatus(entrada, 201, 'movimento:legado');

    // A entrada avulsa cai no deposito de insumos; a venda baixa de ACABADOS.
    // Mesma transferencia explicita da etapa 3 — nao ha roteamento automatico
    // entre depositos (BUSINESS_RULES §12).
    await moveToAcabados(legadoId, 3, 'Produto legado disponibilizado para expedicao');

    // A entrada avulsa NAO cria lote: e exatamente o produto sem governanca
    // de lote que o gate precisa deixar passar.
    expect(await lotsOf(legadoId)).toHaveLength(0);

    const venda = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        customer_id: (await api()
          .post('/api/clients')
          .set('Authorization', `Bearer ${token()}`)
          .send({ name: `${P} Cliente legado ${SUFFIX}`, cpf_cnpj: generateValidCnpj(), state: 'SP' })).body.data.id,
        items: [{ product_id: legadoId, quantity: 2, unit_price: 90 }],
        payment_method: 'pix',
        status: 'confirmed',
      });
    expectStatus(venda, 201, 'sale:legado');

    const issued = await api()
      .post(`/api/sales/${venda.body.data.id}/nfe`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(issued, 202, 'nfe:legado');
    expect(issued.body.data.nfe_status).toBe('authorized');

    // Sem lote nao ha rastro por lote a gravar — e isso e o correto, nao uma
    // falha: `governed: false`.
    expect(await shipmentsOf(venda.body.data.id)).toHaveLength(0);
    expect(await stockOf(legadoId)).toBeCloseTo(1, 4);
  });
});
