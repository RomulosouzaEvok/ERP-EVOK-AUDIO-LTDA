/**
 * Teste de integracao ponta a ponta da CADEIA DO PRODUTO (criterio de
 * aceite do dono, `docs/governance/ESTADO_SESSAO_2026-08-09.md` §1):
 *
 * > "Um insumo e cadastrado e segue seu curso ate virar produto finalizado,
 * > passando pelos departamentos, sem gap."
 *
 * Percorre, contra API + PostgreSQL REAIS (sem mock), as 10 estacoes da
 * corrente:
 *
 * 1. cadastro do insumo (`items` + `products`) e do produto acabado
 * 2. estrutura do produto (BOM) ligando os dois
 * 3. requisicao de compra do insumo -> aprovacao
 * 4. conversao em pedido de compra -> aprovacao -> envio
 * 5. recebimento -> lote nasce em QUARENTENA
 * 6. liberacao do lote pela Qualidade
 * 7. ordem de producao -> liberacao (reserva vinculada a OP)
 * 8. conclusao da OP com consumo por lote (custo real, lote de acabado)
 * 9. venda -> NF-e -> expedicao
 * 10. rastro completo: lote de acabado -> OP -> lote do insumo
 *
 * Alem do caminho feliz, exercita os GATES (o que NAO pode acontecer),
 * correspondentes aos gaps corrigidos em 2026-08-09
 * (`docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`):
 *
 * - **G2** conclusao de OP sem BOM ativa / com quantidade zero deve falhar
 * - **G3** uma OP nao pode liberar/consumir a reserva de outra
 * - **G16** OP criada via MRP valida material igual ao caminho manual
 * - **G8** teste de laboratorio reprovado abre RNC sozinho
 * - **G12** a mesma requisicao nao gera dois pedidos de compra
 * - **G15** a requisicao chega a `received` quando tudo e recebido
 * - **G14** recebimento de importacao (COMEX) cria lote em quarentena
 *
 * Todo dado criado usa o prefixo `E2E-` (ver `SUFFIX`), para permitir
 * limpeza posterior — ver `docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md`.
 *
 * ## Revisao de 2026-08-10 (tarde): DOIS usuarios, nao um
 *
 * A versao original desta suite foi escrita quando **um unico usuario fazia
 * tudo** — pedia e aprovava a propria compra. Os 17 gaps entregues neste dia
 * tornaram esse roteiro impossivel, e corretamente:
 *
 * | Regra | O que mudou | Efeito aqui |
 * |---|---|---|
 * | **D-K** (segregacao de funcao) | aprovador ≠ solicitante, e `admin` NAO isenta | requisicao/pedido/importacao passam a ser aprovados por `approverToken()` |
 * | **G11-COMEX** | importacao exige aprovacao da diretoria antes do embarque | novo passo `POST /:id/approve` antes do `shipped` |
 * | **G7** (ISO 9001 §8.6) | liberar lote exige inspecao registrada e aprovada | nova etapa 5b antes da liberacao da Qualidade |
 * | **G1** | estrutura de produto tem fonte unica (`bill_of_materials`) | o gate G16 monta a arvore por BOM, nao mais por `item_estruturas` |
 *
 * Os contornos BUG-01..BUG-04 que existiam aqui foram **removidos**: as
 * quatro colunas `NOT NULL` indevidas foram corrigidas na migration
 * `20260810-000028`, e os caminhos de API (BOM, cliente, venda, confirmacao)
 * voltaram a funcionar. Manter contornos vivos depois da correcao esconderia
 * a proxima regressao.
 *
 * @module tests/integration/e2e-cadeia-insumo-produto
 */
import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Sufixo unico da execucao — todo registro criado carrega `E2E-...-<SUFFIX>`. */
const SUFFIX = Date.now();
/** Prefixo de identificacao dos dados desta suite (facilita a limpeza). */
const P = 'E2E';

/** Quantidade de insumo comprada/recebida. */
const PURCHASED_QTY = 100;
/** Quantidade de insumo por unidade de produto acabado (BOM). */
const QTY_PER_UNIT = 2;
/** Quantidade planejada/produzida na OP principal. */
const OP_QTY = 10;
/** Preco unitario de compra do insumo. */
const RAW_UNIT_PRICE = 5;
/** Quantidade de produto acabado vendida na estacao 9. */
const SOLD_QTY = 5;

/** Contexto compartilhado entre os passos (Jest roda os `it` em ordem no mesmo arquivo). */
const ctx: Record<string, any> = {};

/**
 * Data futura em `YYYY-MM-DD`.
 *
 * @param days - Dias a somar a partir de hoje.
 * @returns Data ISO curta.
 */
function futureDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Digito verificador de CPF.
 *
 * @param base - Digitos ja conhecidos.
 * @returns Digito calculado.
 */
function cpfCheckDigit(base: number[]): number {
  let sum = 0;
  let weight = base.length + 1;
  for (const digit of base) {
    sum += digit * weight;
    weight -= 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Gera um CPF com checksum valido (o cadastro de cliente valida o digito).
 *
 * @returns CPF de 11 digitos.
 */
function generateValidCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const d1 = cpfCheckDigit(base);
  const d2 = cpfCheckDigit([...base, d1]);
  return [...base, d1, d2].join('');
}

/**
 * Digito verificador de CNPJ (modulo 11 com pesos 2..9 ciclicos).
 *
 * @param base - Digitos ja conhecidos.
 * @returns Digito calculado.
 */
function cnpjCheckDigit(base: number[]): number {
  let weight = 2;
  let sum = 0;
  for (let i = base.length - 1; i >= 0; i -= 1) {
    sum += base[i] * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Gera um CNPJ com checksum valido (o cadastro de fornecedor valida o digito).
 *
 * @returns CNPJ de 14 digitos.
 */
function generateValidCnpj(): string {
  const base = Array.from({ length: 12 }, (_, index) => (index >= 8 ? [0, 0, 0, 1][index - 8] : Math.floor(Math.random() * 10)));
  const d1 = cnpjCheckDigit(base);
  const d2 = cnpjCheckDigit([...base, d1]);
  return [...base, d1, d2].join('');
}

/**
 * Campos fiscais/tecnicos minimos exigidos pelo cadastro legado de produto.
 *
 * @returns Objeto de defaults para `POST /api/products`.
 */
function productDefaults(): Record<string, unknown> {
  return {
    ncm: '85182100',
    cest: '2106400',
    weight: 1,
    unit: 'un',
    lead_time: 1,
    location: 'E2E',
    revision: '00',
  };
}

/**
 * Mensagem de erro legivel de uma resposta Supertest (o envelope de erro do
 * projeto varia entre `error.message` string e objeto).
 *
 * @param response - Resposta HTTP.
 * @returns Texto do erro.
 */
function errorText(response: { body: any }): string {
  const error = response.body?.error;
  if (typeof error === 'string') return error;
  return error?.message ?? JSON.stringify(response.body);
}

/**
 * Afirma o status HTTP mostrando o CORPO da resposta quando falha.
 *
 * Sem isso um 500/422 inesperado vira apenas "Expected 201, Received 500" —
 * inutil para diagnosticar a cadeia. Aqui o motivo real aparece no relatorio.
 *
 * @param response - Resposta Supertest.
 * @param expected - Status esperado.
 * @param label - Descricao curta da chamada.
 * @returns O proprio `response`, para encadear.
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
 * Cria uma BOM ativa de um componente **pela API real**
 * (`POST /api/engineering/bom`).
 *
 * Ate 2026-08-10 este helper escrevia direto no banco, contornando o achado
 * BUG-01 (`bill_of_material_items.parent_item_id`/`.notes`/
 * `.alternative_product_id` estavam `NOT NULL` e o `BomService` gravava
 * `NULL` nos tres, entao QUALQUER BOM respondia 500). A migration
 * `20260810-000028` corrigiu as colunas; o contorno virou divida — e um
 * contorno vivo depois da correcao esconde a proxima regressao. Agora o
 * helper usa o endpoint, e uma quebra do cadastro de BOM derruba o teste em
 * vez de ser mascarada.
 *
 * @param productId - Produto acabado dono da BOM.
 * @param componentId - Produto componente.
 * @param quantityPerUnit - Quantidade do componente por unidade produzida.
 * @param token - JWT do usuario que cadastra a estrutura.
 * @returns Id da BOM criada.
 */
async function createBomViaApi(
  productId: number,
  componentId: number,
  quantityPerUnit: number,
  token: string,
): Promise<number> {
  const bom = await api()
    .post('/api/engineering/bom')
    .set('Authorization', `Bearer ${token}`)
    .send({
      product_id: productId,
      revision: 'E2E',
      notes: 'BOM da validacao E2E da cadeia do produto',
      items: [
        {
          component_product_id: componentId,
          quantity: quantityPerUnit,
          unit: 'un',
          component_type: 'raw_material',
          is_critical: true,
        },
      ],
    });
  expectStatus(bom, 201, 'createBomViaApi');
  return bom.body.data?.id ?? bom.body.data?.bom?.id;
}

describeIntegration('E2E — cadeia completa: insumo cadastrado ate produto acabado expedido', () => {
  /**
   * Token do usuario que **executa** a cadeia (cadastra, requisita, compra,
   * recebe, produz, vende) — emitido pelo runner (`scripts/run-api-suite.cjs`).
   */
  const token = () => authToken();

  /**
   * Token do **segundo** administrador, usado exclusivamente nos pontos de
   * aprovacao (requisicao, pedido de compra, processo de importacao).
   *
   * Existe por causa da segregacao de funcao (D-K): aprovador ≠ solicitante,
   * e `role: 'admin'` deliberadamente nao isenta — permissao e concedivel,
   * identidade nao. Usar o mesmo token dos dois lados nao "testaria menos":
   * testaria um fluxo que a empresa nao pode operar.
   */
  const approver = () => approverToken();

  // ====================================================================
  // ETAPA 1 — Cadastro do insumo e do produto acabado
  // ====================================================================
  it('etapa 1: cadastra insumo (materia-prima) e produto acabado nos dois cadastros (items + products)', async () => {
    const rawCode = `${P}-MP-${SUFFIX}`;
    const finishedCode = `${P}-PA-${SUFFIX}`;

    const rawProduct = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Bobina de Voz ${SUFFIX}`,
        code: rawCode,
        description: 'Insumo da validacao E2E da cadeia do produto',
        price: 9,
        cost_price: RAW_UNIT_PRICE,
        quantity: 0,
        product_type: 'raw_material',
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(rawProduct, 201, 'rawProduct');
    ctx.rawProductId = rawProduct.body.data.id;
    ctx.rawCode = rawCode;

    const finishedProduct = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Alto-falante 12pol ${SUFFIX}`,
        code: finishedCode,
        description: 'Produto acabado da validacao E2E da cadeia do produto',
        price: 500,
        cost_price: 0,
        quantity: 0,
        product_type: 'finished',
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(finishedProduct, 201, 'finishedProduct');
    ctx.finishedProductId = finishedProduct.body.data.id;
    ctx.finishedCode = finishedCode;

    // Cadastro canonico (schema novo) — e o que Requisicao/MRP/COMEX usam.
    const rawItem = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        codigo: rawCode,
        descricao: `${P} Bobina de Voz ${SUFFIX}`,
        tipo: 'MATERIA_PRIMA',
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 0,
        custo_padrao: RAW_UNIT_PRICE,
        lead_time_dias: 1,
      });
    expectStatus(rawItem, 201, 'rawItem');
    ctx.rawItemId = rawItem.body.data.id;

    const finishedItem = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        codigo: finishedCode,
        descricao: `${P} Alto-falante 12pol ${SUFFIX}`,
        tipo: 'PRODUTO_ACABADO',
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 0,
        custo_padrao: 0,
      });
    expectStatus(finishedItem, 201, 'finishedItem');
    ctx.finishedItemId = finishedItem.body.data.id;

    const supplier = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        company_name: `${P} Fornecedor Bobinas ${SUFFIX}`,
        trade_name: `${P} Bobinas`,
        cnpj: generateValidCnpj(),
        ie: 'ISENTO',
        phone: '(11) 4000-0000',
        email: `e2e-fornecedor-${SUFFIX}@evok.local`,
        payment_terms: '30 dias',
        // G11 — declaracao obrigatoria desde 2026-08-11: e ela que decide a
        // alcada (importacao exige a diretoria em qualquer valor).
        is_foreign: false,
      });
    expectStatus(supplier, 201, 'supplier');
    ctx.supplierId = supplier.body.data.id;

    // Catalogo item x fornecedor: e o que faz a requisicao resolver
    // fornecedor sozinha na conversao (sem fallback manual).
    const link = await api()
      .post(`/api/items/${ctx.rawItemId}/suppliers`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ supplier_id: ctx.supplierId, unit_price: RAW_UNIT_PRICE, currency: 'BRL', lead_time_days: 5, preferred: true });
    expectStatus(link, 201, 'link');
  });

  // ====================================================================
  // ETAPA 2 — Estrutura do produto (BOM)
  // ====================================================================
  it('etapa 2: cria a estrutura (BOM) do produto acabado ligando o insumo', async () => {
    const bom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.finishedProductId,
        revision: 'E2E',
        notes: 'BOM da validacao E2E da cadeia do produto',
        items: [
          {
            component_product_id: ctx.rawProductId,
            quantity: QTY_PER_UNIT,
            unit: 'un',
            component_type: 'raw_material',
            is_critical: true,
          },
        ],
      });
    expectStatus(bom, 201, 'bom');
    ctx.bomId = bom.body.data?.id ?? bom.body.data?.bom?.id;
    expect(ctx.bomId).toBeTruthy();

    const active = await api()
      .get(`/api/engineering/bom/product/${ctx.finishedProductId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(active, 200, 'active');
    expect(active.body.data.status).toBe('active');
  });

  // ====================================================================
  // ETAPA 3 — Requisicao de compra
  // ====================================================================
  it('etapa 3: cria a requisicao de compra do insumo e aprova', async () => {
    const created = await api()
      .post('/api/purchase-requisitions')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        origin: 'manual',
        priority: 'normal',
        notes: `${P} requisicao da validacao da cadeia do produto`,
        items: [
          {
            item_id: ctx.rawItemId,
            quantity: PURCHASED_QTY,
            unit: 'un',
            required_date: futureDate(15),
            unit_price_estimated: RAW_UNIT_PRICE,
          },
        ],
      });
    expectStatus(created, 201, 'created');
    ctx.requisitionId = created.body.data.id;
    expect(created.body.data.status).toBe('pending');

    // D-K: quem registrou a requisicao NAO pode aprova-la. Primeiro a prova
    // de que a regra esta viva (auto-aprovacao recusada), depois a aprovacao
    // legitima pelo segundo administrador.
    const selfApproval = await api()
      .patch(`/api/purchase-requisitions/${ctx.requisitionId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'approved' });
    expectStatus(selfApproval, 422, 'selfApproval');
    expect(selfApproval.body.error.details.rule).toBe('D-K-REQUISICAO');

    const approved = await api()
      .patch(`/api/purchase-requisitions/${ctx.requisitionId}/status`)
      .set('Authorization', `Bearer ${approver()}`)
      .send({ status: 'approved' });
    expectStatus(approved, 200, 'approved');
    expect(approved.body.data.status).toBe('approved');
  });

  // ====================================================================
  // ETAPA 4 — Pedido de compra (+ gate G12)
  // ====================================================================
  it('etapa 4: converte a requisicao em pedido de compra, aprova e envia', async () => {
    const converted = await api()
      .post(`/api/purchase-requisitions/${ctx.requisitionId}/convert`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} conversao automatica da validacao da cadeia` });
    expectStatus(converted, 201, 'converted');
    expect(converted.body.data.purchase_orders).toHaveLength(1);

    const purchase = converted.body.data.purchase_orders[0];
    ctx.purchaseId = purchase.id;
    ctx.purchaseItemId = purchase.items[0].id;
    expect(Number(purchase.items[0].unit_price)).toBeCloseTo(RAW_UNIT_PRICE, 4);
    expect(converted.body.data.requisition_status).toBe('ordered');

    // D-K de novo, agora no PEDIDO: a conversao gravou o solicitante a
    // partir do JWT de quem converteu, entao a aprovacao tem que vir do
    // outro administrador. `sent` nao e ponto de aprovacao.
    for (const [status, statusToken] of [['approved', approver()], ['sent', token()]]) {
      const changed = await api()
        .put(`/api/purchases/${ctx.purchaseId}/status`)
        .set('Authorization', `Bearer ${statusToken}`)
        .send({ status });
      expectStatus(changed, 200, `changed:${status}`);
    }
  });

  it('gate G12: a MESMA requisicao nao pode gerar um segundo pedido de compra', async () => {
    const second = await api()
      .post(`/api/purchase-requisitions/${ctx.requisitionId}/convert`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(second, 422, 'second');
    expect(errorText(second)).toMatch(/ja foram pedidos|nao ha saldo|aprovada/i);
  });

  // ====================================================================
  // ETAPA 5 — Recebimento (+ gate G15)
  // ====================================================================
  it('etapa 5: recebe o material e o lote nasce em QUARENTENA', async () => {
    ctx.rawLotNumber = `${P}-LOTE-MP-${SUFFIX}`;

    const received = await api()
      .post(`/api/purchases/${ctx.purchaseId}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        invoice_number: `${P}-NF-${SUFFIX}`,
        items: [{ item_id: ctx.purchaseItemId, quantity: PURCHASED_QTY, lot_number: ctx.rawLotNumber }],
      });
    expectStatus(received, 200, 'received');

    // `status` explicito e obrigatorio aqui: `GET /api/inventory/lots` com
    // `product_id` e SEM `status` assume `status='available'` por
    // compatibilidade retroativa (ver `ListLotsUseCase`) — um lote em
    // quarentena ficaria invisivel nessa consulta.
    const lots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.rawProductId, status: 'quarantine', limit: 200 });
    expectStatus(lots, 200, 'lots');

    const lot = lots.body.data.find((l: any) => l.lot_number === ctx.rawLotNumber);
    expect(lot).toBeDefined();
    expect(lot.status).toBe('quarantine');
    expect(Number(lot.quantity_available)).toBeCloseTo(PURCHASED_QTY, 4);
    ctx.rawLotId = lot.id;

    // Estoque entra fisicamente, mas o lote esta bloqueado para consumo.
    const product = await api()
      .get(`/api/products/${ctx.rawProductId}`)
      .set('Authorization', `Bearer ${token()}`);
    expect(Number(product.body.data.quantity)).toBeCloseTo(PURCHASED_QTY, 4);
  });

  it('gate G15: a requisicao de origem chega a `received` quando tudo foi recebido', async () => {
    const requisition = await api()
      .get(`/api/purchase-requisitions/${ctx.requisitionId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(requisition, 200, 'requisition');
    expect(requisition.body.data.status).toBe('received');
  });

  // ====================================================================
  // ETAPA 6 — Liberacao pela Qualidade
  // ====================================================================
  it('etapa 6: a Qualidade libera o lote da quarentena', async () => {
    // G7 (2026-08-10, ISO 9001 §8.6/§8.7): liberar deixou de ser um clique
    // com observacao livre. Sem inspecao registrada, a liberacao e recusada
    // com `reason: 'no_inspection'` — provado aqui antes do caminho feliz,
    // porque este e o gate que impede material nao verificado de chegar ao
    // chao de fabrica.
    const semInspecao = await api()
      .post(`/api/inventory/lots/${ctx.rawLotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} tentativa de liberar sem inspecao` });
    expectStatus(semInspecao, 422, 'semInspecao');
    expect(semInspecao.body.error.details.rule).toBe('G7');
    expect(semInspecao.body.error.details.reason).toBe('no_inspection');

    const inspection = await api()
      .post('/api/quality/inspections')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        lot_id: ctx.rawLotId,
        stage: 'incoming',
        acceptance_criteria: 'Resistencia DC 6,8 +/- 0,3 ohm e ausencia de deformacao no carretel',
        sampling_plan: 'Amostragem simples, nivel II (validacao E2E)',
        sample_size: 8,
        defects_found: 0,
        verdict: 'approved',
        notes: `${P} inspecao de recebimento`,
      });
    expectStatus(inspection, 201, 'inspection');
    expect(inspection.body.data.verdict).toBe('approved');
    ctx.inspectionId = inspection.body.data.id;

    const release = await api()
      .post(`/api/inventory/lots/${ctx.rawLotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} liberado apos inspecao de recebimento` });
    expectStatus(release, 200, 'release');
    expect(release.body.data.status).toBe('available');
    // A liberacao amarra a evidencia: qual inspecao autorizou.
    expect(Number(release.body.data.release_inspection_id)).toBe(Number(ctx.inspectionId));
  });

  // ====================================================================
  // ETAPA 6b — Roteiro de fabricacao (pre-requisito do G4)
  // ====================================================================
  /**
   * Cadastra centro de trabalho COM custo/hora e um roteiro ATIVO para o
   * produto acabado.
   *
   * Sem isto, a partir do gap G4 (2026-08-10) a OP simplesmente nao conclui:
   * a lei exige apontamento por etapa (Bloco K / Livro modelo 3) e o custeio
   * exige taxa horaria. O `cost_per_hour` do centro e o que evita
   * `G4-LABOR-RATE-MISSING` — o fallback global
   * (`production_cost_settings.default_labor_rate_per_hour`) ainda nao tem API.
   */
  it('etapa 6b: cadastra centro de trabalho com custo/hora e roteiro ATIVO do produto (G5, pre-requisito do G4)', async () => {
    const workCenter = await api()
      .post('/api/work-centers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        code: `${P}-WC-${SUFFIX}`.slice(0, 30),
        name: 'Montagem E2E',
        machines_count: 1,
        capacity_hours_per_day: 8,
        efficiency_factor: 1,
        cost_per_hour: 60,
      });
    expectStatus(workCenter, 201, 'workCenter');
    // Sem custo/hora aqui, a conclusao da OP falharia com G4-LABOR-RATE-MISSING.
    expect(Number(workCenter.body.data.cost_per_hour)).toBeCloseTo(60, 4);
    ctx.workCenterId = workCenter.body.data.id;

    const route = await api()
      .post('/api/production/routes')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.finishedProductId,
        route_code: `${P}-ROT-${SUFFIX}`.slice(0, 50),
        revision: '01',
        description: `${P} roteiro da validacao da cadeia`,
        steps: [{
          sequence: 1,
          step_code: '010',
          name: 'Montagem final',
          work_center_id: ctx.workCenterId,
          standard_time_minutes: 6,
          setup_time_minutes: 15,
        }],
      });
    expectStatus(route, 201, 'route');
    ctx.productionRouteId = route.body.data.id;

    const activated = await api()
      .patch(`/api/production/routes/${ctx.productionRouteId}/activate`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(activated, 200, 'activated');
    expect(activated.body.data.status).toBe('active');
  });

  // ====================================================================
  // ETAPA 7 — Ordem de producao e reserva
  // ====================================================================
  it('etapa 7: cria a ordem de producao e libera (reservando o material da OP)', async () => {
    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.finishedProductId,
        quantity: OP_QTY,
        priority: 'normal',
        due_date: futureDate(10),
        notes: `${P} OP principal da validacao da cadeia`,
      });
    expectStatus(created, 201, 'created');
    ctx.productionOrderId = created.body.data.id;
    ctx.productionOrderNumber = created.body.data.order_number;
    expect(created.body.data.status).toBe('planned');

    const released = await api()
      .put(`/api/production-orders/${ctx.productionOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'released' });
    expectStatus(released, 200, 'released');
    expect(released.body.data.status).toBe('released');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProductionOrderReservation, Product } = require('../../src/models/index');
    const reservations = await ProductionOrderReservation.findAll({
      where: { production_order_id: ctx.productionOrderId, status: 'active' },
    });
    expect(reservations).toHaveLength(1);
    expect(Number(reservations[0].product_id)).toBe(ctx.rawProductId);
    expect(Number(reservations[0].quantity)).toBeCloseTo(OP_QTY * QTY_PER_UNIT, 4);

    const raw = await Product.findByPk(ctx.rawProductId);
    expect(Number(raw.reserved_quantity)).toBeCloseTo(OP_QTY * QTY_PER_UNIT, 4);
  });

  // ====================================================================
  // GATE G3 — reserva por OP, sem canibalizacao
  // ====================================================================
  it('gate G3: uma OP nao libera/consome a reserva de outra', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProductionOrderReservation, Product } = require('../../src/models/index');

    const second = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.finishedProductId,
        quantity: OP_QTY,
        priority: 'low',
        due_date: futureDate(20),
        notes: `${P} OP secundaria (gate G3)`,
      });
    expectStatus(second, 201, 'second');
    const secondOrderId = second.body.data.id;

    const released = await api()
      .put(`/api/production-orders/${secondOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'released' });
    expectStatus(released, 200, 'released');

    const rawAfterTwo = await Product.findByPk(ctx.rawProductId);
    expect(Number(rawAfterTwo.reserved_quantity)).toBeCloseTo(2 * OP_QTY * QTY_PER_UNIT, 4);

    // Cancelar a 2a OP libera EXATAMENTE a reserva dela — a da 1a permanece.
    const canceled = await api()
      .put(`/api/production-orders/${secondOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'canceled' });
    expectStatus(canceled, 200, 'canceled');

    const secondReservations = await ProductionOrderReservation.findAll({
      where: { production_order_id: secondOrderId, status: 'active' },
    });
    expect(secondReservations).toHaveLength(0);

    const firstReservations = await ProductionOrderReservation.findAll({
      where: { production_order_id: ctx.productionOrderId, status: 'active' },
    });
    expect(firstReservations).toHaveLength(1);
    expect(Number(firstReservations[0].quantity)).toBeCloseTo(OP_QTY * QTY_PER_UNIT, 4);

    const rawAfterCancel = await Product.findByPk(ctx.rawProductId);
    expect(Number(rawAfterCancel.reserved_quantity)).toBeCloseTo(OP_QTY * QTY_PER_UNIT, 4);

    ctx.secondOrderId = secondOrderId;
  });

  it('etapa 7b: inicia a producao (released -> in_progress)', async () => {
    // `completed` so e alcancavel a partir de `in_progress`/`paused`
    // (`ProductionOrderEntity.STATUS_TRANSITIONS`) — nao existe atalho
    // released -> completed.
    const started = await api()
      .put(`/api/production-orders/${ctx.productionOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(started, 200, 'started');
    expect(started.body.data.status).toBe('in_progress');
  });

  // ====================================================================
  // GATE G4 — apontamento obrigatorio (Bloco K / Livro modelo 3)
  // ====================================================================
  /**
   * Prova, na ordem em que acontece na fabrica:
   * 1. a liberacao MATERIALIZOU a etapa do roteiro ativo como apontamento
   *    `pending`, ja amarrada ao `production_route_step_id` da revisao 01
   *    (vinculo "como executado");
   * 2. concluir a OP com a etapa em aberto falha (`G4-TRACKING-STEP-OPEN`);
   * 3. apos iniciar e concluir a etapa, o caminho fica livre.
   */
  it('gate G4: a liberacao materializa a etapa do roteiro e a OP nao conclui com etapa em aberto', async () => {
    const tracking = await api()
      .get(`/api/production-orders/${ctx.productionOrderId}/tracking`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(tracking, 200, 'tracking');
    expect(tracking.body.data).toHaveLength(1);

    const step = tracking.body.data[0];
    expect(step.status).toBe('pending');
    expect(step.sequence).toBe(1);
    // O apontamento nasce apontando para a ETAPA DA REVISAO ATIVA na liberacao
    // — e o que permite reconstituir o processo COMO EXECUTADO sem a coluna
    // `production_orders.production_route_id`, que nao existe.
    expect(step.routeStep).toBeTruthy();
    expect(step.routeStep.step_code).toBe('010');
    ctx.trackingId = step.id;

    const blocked = await api()
      .put(`/api/production-orders/${ctx.productionOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        status: 'completed',
        quantity_produced: OP_QTY,
        lot_consumptions: [
          { product_id: ctx.rawProductId, lot_control_id: ctx.rawLotId, quantity: OP_QTY * QTY_PER_UNIT },
        ],
      });
    expectStatus(blocked, 422, 'blocked');
    expect(blocked.body.error.details.rule).toBe('G4-TRACKING-STEP-OPEN');

    const order = await api()
      .get(`/api/production-orders/${ctx.productionOrderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expect(order.body.data.status).toBe('in_progress');
  });

  it('gate G4: apontamento iniciado e concluido libera o caminho da conclusao', async () => {
    const startedStep = await api()
      .post(`/api/production-orders/tracking/${ctx.trackingId}/start`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(startedStep, 200, 'startedStep');
    expect(startedStep.body.data.status).toBe('in_progress');
    expect(startedStep.body.data.started_at).toBeTruthy();

    const finishedStep = await api()
      .post(`/api/production-orders/tracking/${ctx.trackingId}/complete`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ quantity_good: OP_QTY, quantity_scrapped: 0, notes: `${P} etapa concluida` });
    expectStatus(finishedStep, 200, 'finishedStep');
    expect(finishedStep.body.data.status).toBe('completed');
    expect(finishedStep.body.data.finished_at).toBeTruthy();
  });

  // ====================================================================
  // GATE G2 — conclusao sem BOM ativa / com quantidade zero
  // ====================================================================
  it('gate G2: concluir a OP com quantidade produzida ZERO falha', async () => {
    const response = await api()
      .put(`/api/production-orders/${ctx.productionOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'completed', quantity_produced: 0 });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);

    const order = await api()
      .get(`/api/production-orders/${ctx.productionOrderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expect(order.body.data.status).toBe('in_progress');
  });

  it('gate G2: concluir a OP sem BOM ativa falha (e nao entra produto com custo zero)', async () => {
    const deactivate = await api()
      .put(`/api/engineering/bom/${ctx.bomId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'inactive' });
    expectStatus(deactivate, 200, 'deactivate');

    const complete = await api()
      .put(`/api/production-orders/${ctx.productionOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        status: 'completed',
        quantity_produced: OP_QTY,
        lot_consumptions: [
          { product_id: ctx.rawProductId, lot_control_id: ctx.rawLotId, quantity: OP_QTY * QTY_PER_UNIT },
        ],
      });
    expectStatus(complete, 422, 'complete');
    expect(errorText(complete)).toMatch(/estrutura \(BOM\) ativa/i);

    const order = await api()
      .get(`/api/production-orders/${ctx.productionOrderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expect(order.body.data.status).toBe('in_progress');

    // Reativa a BOM para o caminho feliz seguir.
    const reactivate = await api()
      .put(`/api/engineering/bom/${ctx.bomId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'active' });
    expectStatus(reactivate, 200, 'reactivate');
    expect(reactivate.body.data.status).toBe('active');
  });

  // ====================================================================
  // ETAPA 8 — Conclusao da OP
  // ====================================================================
  it('etapa 8: conclui a OP com consumo por lote — insumo baixado, lote de acabado criado, custo real, reserva liberada', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProductionOrderReservation, Product } = require('../../src/models/index');

    ctx.finishedLotNumber = `${P}-LOTE-PA-${SUFFIX}`;
    const consumedQty = OP_QTY * QTY_PER_UNIT;

    const completed = await api()
      .put(`/api/production-orders/${ctx.productionOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        status: 'completed',
        quantity_produced: OP_QTY,
        finished_lot_number: ctx.finishedLotNumber,
        lot_consumptions: [
          { product_id: ctx.rawProductId, lot_control_id: ctx.rawLotId, quantity: consumedQty, notes: `${P} consumo rastreado` },
        ],
      });
    expectStatus(completed, 200, 'completed');
    expect(completed.body.data.status).toBe('completed');

    // 8.1 insumo consumido (estoque e lote)
    const raw = await Product.findByPk(ctx.rawProductId);
    expect(Number(raw.quantity)).toBeCloseTo(PURCHASED_QTY - consumedQty, 4);
    expect(Number(raw.reserved_quantity)).toBeCloseTo(0, 4);

    const rawLots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.rawProductId, limit: 100 });
    const rawLot = rawLots.body.data.find((l: any) => l.id === ctx.rawLotId);
    expect(Number(rawLot.quantity_available)).toBeCloseTo(PURCHASED_QTY - consumedQty, 4);

    // 8.2 reserva liberada (nenhuma reserva viva presa)
    const reservations = await ProductionOrderReservation.findAll({
      where: { production_order_id: ctx.productionOrderId, status: 'active' },
    });
    expect(reservations).toHaveLength(0);

    // 8.3 lote de produto acabado criado
    const finishedLots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.finishedProductId, limit: 100 });
    const finishedLot = finishedLots.body.data.find((l: any) => l.lot_number === ctx.finishedLotNumber);
    expect(finishedLot).toBeDefined();
    expect(Number(finishedLot.quantity_initial)).toBeCloseTo(OP_QTY, 4);
    ctx.finishedLotId = finishedLot.id;

    // 8.4 custo real diferente de zero (nao contamina custo medio com 0)
    const finished = await Product.findByPk(ctx.finishedProductId);
    expect(Number(finished.quantity)).toBeCloseTo(OP_QTY, 4);
    expect(Number(finished.cost_price)).toBeGreaterThan(0);
    expect(Number(finished.cost_price)).toBeCloseTo(QTY_PER_UNIT * RAW_UNIT_PRICE, 2);
  });

  // ====================================================================
  // ETAPA 9 — Venda, NF-e e expedicao
  // ====================================================================
  it('etapa 9a: cadastra o cliente da venda (POST /api/clients)', async () => {
    const client = await api()
      .post('/api/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Cliente ${SUFFIX}`,
        cpf_cnpj: generateValidCpf(),
        state: 'SP',
        city: 'Sao Paulo',
        cep: '01001-000',
        street: 'Praca da Se',
        number: '1',
        complement: 'Sala 1',
        neighborhood: 'Se',
        ie: 'ISENTO',
        im: 'ISENTO',
        tax_regime: 'simples_nacional',
        phone: '(11) 3000-0000',
        email: `e2e-cliente-${SUFFIX}@evok.local`,
      });
    expectStatus(client, 201, 'client');
    ctx.clientId = client.body.data.id;
  });

  it('etapa 9b: cria a venda (orcamento) via API', async () => {
    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        customer_id: ctx.clientId,
        items: [{ product_id: ctx.finishedProductId, quantity: SOLD_QTY, unit_price: 500 }],
        payment_method: 'pix',
        status: 'quote',
        notes: `${P} venda da validacao da cadeia`,
      });
    expectStatus(sale, 201, 'sale');
    ctx.saleId = sale.body.data.id;
    expect(sale.body.data.status).toBe('quote');
  });

  /**
   * Confirmar o orcamento RESERVA o produto acabado (G9, 2026-08-10) — nao
   * baixa mais o estoque, porque a mercadoria ainda esta fisicamente na
   * empresa (Ajuste SINIEF 07/05, clausula 9ª §1º). A baixa acontece na
   * autorizacao da NF-e (etapa 9d), e a conta a receber tambem (G13/CPC 47).
   */
  it('etapa 9c: confirma a venda (reserva o produto acabado)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Product } = require('../../src/models/index');

    const confirmed = await api()
      .put(`/api/sales/${ctx.saleId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'confirmed' });
    expectStatus(confirmed, 200, 'confirmed');
    expect(confirmed.body.data.status).toBe('confirmed');

    const finished = await Product.findByPk(ctx.finishedProductId);
    // Reserva, nao baixa: o saldo continua o produzido na etapa 8.
    expect(Number(finished.quantity)).toBeCloseTo(OP_QTY, 4);
    expect(Number(finished.reserved_quantity)).toBeCloseTo(SOLD_QTY, 4);
  });

  it('etapa 9d: emite a NF-e e expede', async () => {
    const nfe = await api()
      .post(`/api/sales/${ctx.saleId}/nfe`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(nfe, 202, 'nfe');
    expect(nfe.body.data.nfe_status).toBe('authorized');
    expect(nfe.body.data.status).toBe('invoiced');

    const shipped = await api()
      .put(`/api/sales/${ctx.saleId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'shipped' });
    expectStatus(shipped, 200, 'shipped');
    expect(shipped.body.data.status).toBe('shipped');
  });

  // ====================================================================
  // ETAPA 10 — Rastro completo
  // ====================================================================
  it('etapa 10: rastro completo — do lote de produto acabado ate o lote do insumo', async () => {
    const opTrace = await api()
      .get(`/api/traceability/production-orders/${ctx.productionOrderId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(opTrace, 200, 'opTrace');

    const trace = opTrace.body.data;
    expect(trace.op_codigo).toBe(ctx.productionOrderNumber);
    expect(trace.generated_lots.map((l: any) => l.lot_number)).toContain(ctx.finishedLotNumber);
    expect(trace.insumos.map((i: any) => i.codigo_lote)).toContain(ctx.rawLotNumber);
    expect(trace.insumos.map((i: any) => i.codigo_item)).toContain(ctx.rawCode);

    const lotTrace = await api()
      .get(`/api/traceability/lots/${ctx.finishedLotId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(lotTrace, 200, 'lotTrace');
    const generated = lotTrace.body.data.find((e: any) => e.movimento_tipo === 'production_lot_generated');
    expect(generated).toBeDefined();
    expect(generated.metadata.production_order.order_number).toBe(ctx.productionOrderNumber);

    const rawLotTrace = await api()
      .get(`/api/traceability/lots/${ctx.rawLotId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(rawLotTrace, 200, 'rawLotTrace');
    const consumedEvent = rawLotTrace.body.data.find((e: any) => e.movimento_tipo === 'lot_consumed_in_production');
    expect(consumedEvent).toBeDefined();
    expect(consumedEvent.metadata.production_order.order_number).toBe(ctx.productionOrderNumber);
  });

  // ====================================================================
  // GATE G16 — OP via MRP valida material igual ao caminho manual
  // ====================================================================
  it('gate G16: ordem planejada do MRP nao vira OP sem material (mesma regra do caminho manual)', async () => {
    const subCode = `${P}-SUB-${SUFFIX}`;
    const rawCode2 = `${P}-MP2-${SUFFIX}`;

    const raw2 = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Ima Ferrite ${SUFFIX}`,
        code: rawCode2,
        price: 20,
        cost_price: 12,
        quantity: 0,
        product_type: 'raw_material',
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(raw2, 201, 'raw2');

    // `product_type: 'finished'` num SUBCONJUNTO nao e descuido: hoje
    // `BomService.createBOM` recusa BOM para qualquer produto que nao seja
    // `finished` (400), e depois do G1 o MRP so enxerga estrutura que venha
    // de BOM ativa. Logo, um subconjunto com estrutura propria so e
    // representavel tipando-o como `finished`. A restricao e anterior aos
    // gaps desta rodada e esta registrada como achado em
    // `docs/governance/TODO.md` — nao se afrouxa a regra de producao para o
    // teste passar; o teste registra a limitacao real do sistema.
    const subProduct = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Conjunto Magnetico ${SUFFIX}`,
        code: subCode,
        price: 300,
        cost_price: 0,
        quantity: 0,
        product_type: 'finished',
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(subProduct, 201, 'subProduct');

    // BOM do subconjunto (sub <- ima). Sem ela o MRP falharia por "sem BOM
    // ativa" e o gate nao provaria o que interessa (validacao de MATERIAL).
    await createBomViaApi(subProduct.body.data.id, raw2.body.data.id, 1, token());

    // Produto PAI: o motor de MRP (`explodeBomRequirements`) so planeja
    // COMPONENTES da demanda — nunca o proprio item demandado. Para existir
    // uma ordem planejada de FABRICACAO do subconjunto, ele precisa ser
    // componente de um item pai.
    //
    // G1 (2026-08-10): a estrutura que o MRP le passou a ser a MESMA que a
    // producao consome — a BOM ativa (`bill_of_materials`), projetada para
    // UUID de item pelo crosswalk `products.code = items.codigo`. Por isso o
    // pai precisa existir NOS DOIS cadastros com o MESMO codigo, e a ligacao
    // pai->componente e cadastrada por BOM. O caminho antigo
    // (`POST /api/items/:id/estrutura`, que gravava em `item_estruturas`)
    // agora responde 422 `G1-ESTRUTURA-DUPLA` — provado no fim deste teste.
    const parentCode = `${P}-PAI-${SUFFIX}`;
    const parentProduct = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Alto-falante 15pol ${SUFFIX}`,
        code: parentCode,
        price: 900,
        cost_price: 0,
        quantity: 0,
        product_type: 'finished',
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(parentProduct, 201, 'parentProduct');

    await createBomViaApi(parentProduct.body.data.id, subProduct.body.data.id, 1, token());

    const subItem = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        codigo: subCode,
        descricao: `${P} Conjunto Magnetico ${SUFFIX}`,
        tipo: 'SUBCONJUNTO',
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 0,
      });
    expectStatus(subItem, 201, 'subItem');

    const parentItem = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        codigo: parentCode,
        descricao: `${P} Alto-falante 15pol ${SUFFIX}`,
        tipo: 'PRODUTO_ACABADO',
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 0,
      });
    expectStatus(parentItem, 201, 'parentItem');

    // G1: a arvore paralela (`item_estruturas`) esta fechada para escrita.
    // Aceitar aqui devolveria 201 e a producao continuaria sem enxergar a
    // estrutura — o descasamento exato que o G1 corrigiu.
    const estruturaParalela = await api()
      .post(`/api/items/${parentItem.body.data.id}/estrutura`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        item_pai_id: parentItem.body.data.id,
        item_componente_id: subItem.body.data.id,
        quantidade: 1,
        nivel: 1,
        ativo: true,
      });
    expectStatus(estruturaParalela, 422, 'estruturaParalela');
    expect(estruturaParalela.body.error.details.rule).toBe('G1-ESTRUTURA-DUPLA');
    expect(estruturaParalela.body.error.details.origem_unica).toBe('bill_of_materials');

    const plan = await api()
      .post('/api/mrp/plan')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        demands: [
          { item_id: parentItem.body.data.id, quantidade: 4, data_necessidade: futureDate(30), origem: 'MANUAL' },
        ],
      });
    expectStatus(plan, 201, 'plan');
    const plannedOrder = plan.body.data.find((o: any) => String(o.item_id) === String(subItem.body.data.id));
    expect(plannedOrder).toBeDefined();

    const convert = await api()
      .post('/api/mrp/planned-orders/convert-to-production')
      .set('Authorization', `Bearer ${token()}`)
      .send({ planned_order_ids: [plannedOrder.id] });

    expectStatus(convert, 422, 'convert');
    expect(errorText(convert)).toMatch(/material minimo disponivel|estrutura \(BOM\) ativa/i);
  });

  // ====================================================================
  // GATE G8 — teste acustico reprovado abre RNC sozinho
  // ====================================================================
  it('gate G8: teste de laboratorio reprovado abre nao conformidade automaticamente', async () => {
    const test = await api()
      .post('/api/laboratory/tests')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.finishedProductId,
        test_type: 'impedance',
        result: 99,
        unit: 'ohm',
        specification_min: 7,
        specification_max: 9,
        notes: `${P} teste reprovado proposital (gate G8)`,
      });
    expectStatus(test, 201, 'test');
    expect(test.body.data.passed).toBe(false);
    expect(test.body.data.non_conformity_id).toBeTruthy();

    const nc = await api()
      .get('/api/quality/non-conformities')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.finishedProductId, limit: 50 });
    expectStatus(nc, 200, 'nc');
    const found = nc.body.data.find((n: any) => n.id === test.body.data.non_conformity_id);
    expect(found).toBeDefined();
  });

  // ====================================================================
  // GATE G14 — importacao entra em quarentena
  // ====================================================================
  it('gate G14: recebimento de processo de importacao cria lote em QUARENTENA', async () => {
    const created = await api()
      .post('/api/comex/import-processes')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        supplier_id: ctx.supplierId,
        fob_currency: 'USD',
        exchange_rate: 5.2,
        freight_value: 500,
        insurance_value: 100,
        notes: `${P} processo de importacao da validacao da cadeia`,
        items: [
          {
            item_id: ctx.rawItemId,
            quantity: 40,
            fob_unit_price: 3,
            ii_rate: 14,
            ipi_rate: 5,
            pis_rate: 2.1,
            cofins_rate: 9.65,
            icms_rate: 18,
          },
        ],
      });
    expectStatus(created, 201, 'created');
    const processId = created.body.data.id;

    // G11-COMEX (2026-08-10): importacao exige aprovacao da diretoria em
    // QUALQUER valor, e o gate trava exatamente na transicao `draft ->
    // shipped` — ultimo instante em que ainda da para desistir sem custo
    // afundado. Sem aprovacao, o embarque e recusado.
    const semAprovacao = await api()
      .post(`/api/comex/import-processes/${processId}/tracking`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ event: 'shipped', event_date: new Date().toISOString().slice(0, 10) });
    expectStatus(semAprovacao, 422, 'semAprovacao');
    expect(semAprovacao.body.error.details.rule).toBe('G11-COMEX');

    // D-K tambem vale aqui: quem registrou o processo nao o aprova.
    const autoAprovacao = await api()
      .post(`/api/comex/import-processes/${processId}/approve`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(autoAprovacao, 422, 'autoAprovacao');
    expect(autoAprovacao.body.error.details.rule).toBe('D-K-COMEX');

    const aprovacao = await api()
      .post(`/api/comex/import-processes/${processId}/approve`)
      .set('Authorization', `Bearer ${approver()}`)
      .send({});
    expectStatus(aprovacao, 201, 'aprovacao');
    expect(aprovacao.body.data.approver_role).toBe('diretor');

    for (const event of ['shipped', 'arrived', 'customs_cleared']) {
      const tracking = await api()
        .post(`/api/comex/import-processes/${processId}/tracking`)
        .set('Authorization', `Bearer ${token()}`)
        .send({ event, event_date: new Date().toISOString().slice(0, 10) });
      expectStatus(tracking, 201, 'tracking');
    }

    const receive = await api()
      .post(`/api/comex/import-processes/${processId}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(receive, 201, 'receive');
    expect(receive.body.data.status).toBe('received');

    const lots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.rawProductId, status: 'quarantine', limit: 200 });
    expectStatus(lots, 200, 'lots');
    const importLot = lots.body.data.find((l: any) => String(l.lot_number).startsWith('IMP-'));
    expect(importLot).toBeDefined();
    expect(importLot.status).toBe('quarantine');
    expect(Number(importLot.quantity_available)).toBeCloseTo(40, 4);
  });
});
