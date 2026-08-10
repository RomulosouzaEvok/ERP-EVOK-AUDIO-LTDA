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
 * @module tests/integration/e2e-cadeia-insumo-produto
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

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
 * CONTORNO do achado **BUG-01**: cria uma BOM ativa com um componente
 * escrevendo direto no banco.
 *
 * `POST /api/engineering/bom` responde 500 porque
 * `bill_of_material_items.parent_item_id`, `.notes` e
 * `.alternative_product_id` estao `NOT NULL` no banco real (dev e teste) e
 * o `BomService` grava `NULL` nas tres. Aqui `parent_item_id` recebe o
 * PROPRIO id da linha (auto-referencia satisfaz a FK no mesmo INSERT) e
 * `alternative_product_id` recebe o proprio componente — valores sem
 * significado de negocio, escolhidos apenas para satisfazer as restricoes
 * indevidas e destravar as estacoes seguintes da cadeia.
 *
 * @param productId - Produto acabado dono da BOM.
 * @param componentId - Produto componente.
 * @param quantityPerUnit - Quantidade do componente por unidade produzida.
 * @returns Id da BOM criada.
 */
async function createBomDirectly(productId: number, componentId: number, quantityPerUnit: number): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { BillOfMaterial, Product, sequelize } = require('../../src/models/index');

  const component = await Product.findByPk(componentId);
  const unitCost = Number(component.cost_price ?? 0);

  const bom = await BillOfMaterial.create({
    product_id: productId,
    revision: 'E2E',
    revision_date: new Date().toISOString().slice(0, 10),
    revision_notes: 'Contorno BUG-01 (validacao E2E da cadeia do produto)',
    notes: 'Contorno BUG-01 (validacao E2E da cadeia do produto)',
    status: 'active',
    total_components: 1,
    total_cost: quantityPerUnit * unitCost,
    manufacturing_time_minutes: 1,
  });

  const [[{ nextval }]] = await sequelize.query("SELECT nextval('bill_of_material_items_id_seq') AS nextval");
  const itemId = Number(nextval);

  await sequelize.query(
    `INSERT INTO bill_of_material_items
       (id, bom_id, component_product_id, quantity, unit, bom_level, parent_item_id, sequence_order,
        component_type, scrap_percentage, unit_cost, total_cost, notes, alternative_product_id,
        is_critical, created_at, updated_at)
     VALUES (:id, :bomId, :componentId, :quantity, 'un', 1, :id, 1,
             'raw_material', 0, :unitCost, :totalCost, 'Contorno BUG-01', :componentId,
             true, NOW(), NOW())`,
    {
      replacements: {
        id: itemId,
        bomId: bom.id,
        componentId,
        quantity: quantityPerUnit,
        unitCost,
        totalCost: quantityPerUnit * unitCost,
      },
    },
  );

  return bom.id;
}

describeIntegration('E2E — cadeia completa: insumo cadastrado ate produto acabado expedido', () => {
  /** Token admin emitido pelo runner (`scripts/run-api-suite.cjs`). */
  const token = () => authToken();

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

  /**
   * CONTORNO documentado do achado **BUG-01** (ver
   * `docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md`): as colunas
   * `parent_item_id`, `notes` e `alternative_product_id` de
   * `bill_of_material_items` estao `NOT NULL` no banco real (dev e teste)
   * enquanto o model as declara nulaveis — `POST /api/engineering/bom`
   * responde 500 para QUALQUER BOM. Sem BOM ativa nao existe OP, entao a
   * corrente pararia na etapa 2 e as 8 estacoes seguintes ficariam sem
   * evidencia. Este passo cria a mesma BOM direto pelos models (mesmos
   * valores que o `BomService` gravaria, mais os tres campos que o banco
   * exige) SOMENTE para destravar o restante da validacao. Nao corrige o
   * bug e nao substitui a etapa 2, que continua vermelha de proposito.
   */
  it('etapa 2 (contorno de BUG-01): provisiona a BOM direto no banco para destravar as etapas seguintes', async () => {
    if (ctx.bomId) return; // etapa 2 passou: contorno desnecessario.

    ctx.bomId = await createBomDirectly(ctx.finishedProductId, ctx.rawProductId, QTY_PER_UNIT);
    ctx.bomViaWorkaround = true;

    const active = await api()
      .get(`/api/engineering/bom/product/${ctx.finishedProductId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(active, 200, 'activeAfterWorkaround');
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

    const approved = await api()
      .patch(`/api/purchase-requisitions/${ctx.requisitionId}/status`)
      .set('Authorization', `Bearer ${token()}`)
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

    for (const status of ['approved', 'sent']) {
      const changed = await api()
        .put(`/api/purchases/${ctx.purchaseId}/status`)
        .set('Authorization', `Bearer ${token()}`)
        .send({ status });
      expectStatus(changed, 200, 'changed');
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
    const release = await api()
      .post(`/api/inventory/lots/${ctx.rawLotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} liberado apos inspecao de recebimento` });
    expectStatus(release, 200, 'release');
    expect(release.body.data.status).toBe('available');
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

  /**
   * CONTORNO documentado do achado **BUG-02**: `clients.cnae` (e, no banco
   * de teste, tambem `clients.city_ibge_code`) esta `NOT NULL` sem default,
   * mas nenhum dos dois e aceito por `createClientSchema` (`.strict()`) —
   * nao existe payload capaz de criar cliente pela API. Sem cliente nao ha
   * venda, entao a estacao 9 pararia aqui. Cria o cliente direto pelos
   * models apenas para destravar venda -> NF-e -> expedicao.
   */
  it('etapa 9a (contorno de BUG-02): provisiona o cliente direto no banco', async () => {
    if (ctx.clientId) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('../../src/models/index');
    const client = await Client.create({
      name: `${P} Cliente ${SUFFIX}`,
      cpf_cnpj: generateValidCpf(),
      phone: '(11) 3000-0000',
      email: `e2e-cliente-${SUFFIX}@evok.local`,
      cep: '01001-000',
      street: 'Praca da Se',
      number: '1',
      complement: 'Sala 1',
      neighborhood: 'Se',
      city: 'Sao Paulo',
      state: 'SP',
      status: 'active',
      notes: 'Contorno BUG-02 (validacao E2E da cadeia do produto)',
      tax_regime: 'simples_nacional',
      ie: 'ISENTO',
      im: 'ISENTO',
      cnae: '2790201',
      city_ibge_code: '3550308',
    });
    ctx.clientId = client.id;
    ctx.clientViaWorkaround = true;
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
   * CONTORNO documentado do achado **BUG-03**: `sales.nfe_number` (e
   * `sales.nfe_key`) estao `NOT NULL` sem default no banco real, mas
   * `CreateSaleUseCase` nunca os preenche na criacao (so a emissao da NF-e
   * preenche) — `POST /api/sales` responde 500 para QUALQUER venda. Cria a
   * venda como `quote` direto pelos models, com os campos de NF-e vazios,
   * para que o restante da estacao 9 (confirmacao com debito de estoque,
   * emissao de NF-e e expedicao) ainda possa ser exercitado pela API real.
   */
  it('etapa 9b (contorno de BUG-03): provisiona a venda (orcamento) direto no banco', async () => {
    if (ctx.saleId) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Sale, SaleItem } = require('../../src/models/index');
    const unitPrice = 500;
    const sale = await Sale.create({
      customer_id: ctx.clientId,
      user_id: 1,
      total_amount: SOLD_QTY * unitPrice,
      discount: 0,
      status: 'quote',
      payment_method: 'pix',
      installments: 1,
      notes: `${P} venda da validacao da cadeia (contorno BUG-03)`,
      nfe_number: '',
      nfe_key: '',
    });
    await SaleItem.create({
      sale_id: sale.id,
      product_id: ctx.finishedProductId,
      quantity: SOLD_QTY,
      unit_price: unitPrice,
      total_price: SOLD_QTY * unitPrice,
    });
    ctx.saleId = sale.id;
    ctx.saleViaWorkaround = true;
  });

  it('etapa 9c: confirma a venda (debita estoque + gera conta a receber)', async () => {
    const confirmed = await api()
      .put(`/api/sales/${ctx.saleId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'confirmed' });
    expectStatus(confirmed, 200, 'confirmed');
    expect(confirmed.body.data.status).toBe('confirmed');
    ctx.saleConfirmedViaApi = true;
  });

  /**
   * CONTORNO documentado do achado **BUG-04**: confirmar a venda gera a
   * `AccountReceivable` das parcelas, e `accounts_receivable` tem 8 colunas
   * (`payment_date`, `payment_method`, `invoice_number`, `barcode`,
   * `pix_key`, `protest_date`, `negativation_date`, `notes`) `NOT NULL` sem
   * default que o use case nunca preenche — a confirmacao sempre responde
   * 500. Aqui a venda e apenas promovida a `confirmed` no banco, para que a
   * emissao de NF-e e a expedicao ainda possam ser exercitadas pela API.
   *
   * ATENCAO ao ler o resultado: com este contorno, **o debito de estoque do
   * produto acabado e a geracao da conta a receber NAO foram exercitados** —
   * a estacao 9 nao pode ser considerada validada, apenas as sub-etapas de
   * NF-e e expedicao.
   */
  it('etapa 9c (contorno de BUG-04): promove a venda para `confirmed` direto no banco', async () => {
    if (ctx.saleConfirmedViaApi) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Sale } = require('../../src/models/index');
    await Sale.update({ status: 'confirmed' }, { where: { id: ctx.saleId } });
    ctx.saleConfirmedViaWorkaround = true;
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

    const subProduct = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Conjunto Magnetico ${SUFFIX}`,
        code: subCode,
        price: 300,
        cost_price: 0,
        quantity: 0,
        product_type: 'semi_finished',
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(subProduct, 201, 'subProduct');

    // Contorno de BUG-01 (ver `createBomDirectly`): a BOM deste gate tambem
    // nao pode ser criada pela API. Sem ela o MRP falharia por "sem BOM
    // ativa" e o gate nao provaria o que interessa (validacao de MATERIAL).
    await createBomDirectly(subProduct.body.data.id, raw2.body.data.id, 1);

    // O motor de MRP (`explodeBomRequirements`) so planeja COMPONENTES da
    // demanda — nunca o proprio item demandado. Para existir uma ordem
    // planejada de FABRICACAO e preciso que o subconjunto apareca como
    // componente de um item pai, via a estrutura do schema novo
    // (`item_estruturas`), que e a BOM que o MRP le (gap G1: sao duas BOMs
    // paralelas — o MRP le `item_estruturas`, a producao le
    // `bill_of_materials`).
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
        codigo: `${P}-PAI-${SUFFIX}`,
        descricao: `${P} Alto-falante 15pol ${SUFFIX}`,
        tipo: 'PRODUTO_ACABADO',
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 0,
      });
    expectStatus(parentItem, 201, 'parentItem');

    const structure = await api()
      .post(`/api/items/${parentItem.body.data.id}/estrutura`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        item_pai_id: parentItem.body.data.id,
        item_componente_id: subItem.body.data.id,
        quantidade: 1,
        nivel: 1,
        ativo: true,
      });
    expectStatus(structure, 201, 'structure');

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
