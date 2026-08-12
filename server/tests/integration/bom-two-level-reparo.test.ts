/**
 * G18 — ESTRUTURA DE PRODUTO DE DOIS NIVEIS, contra PostgreSQL real.
 *
 * ## O caso real da empresa (informado pelo dono em 2026-08-10)
 *
 * A Evok fabrica alto-falantes e **vende REPARO** — o conjunto movel (cone,
 * bobina movel, aranha, suspensao) que o cliente compra para consertar um
 * alto-falante queimado. O reparo e **duas coisas ao mesmo tempo**:
 *
 *   - **produto vendido** no balcao, com preco, estoque e NF-e proprios;
 *   - **componente** consumido na linha de montagem do alto-falante.
 *
 *     Alto-falante 12" (finished, vendido)
 *     ├── REPARO 12"   (finished, vendido E componente)  ← BOM PROPRIA
 *     │   ├── cone
 *     │   ├── bobina movel
 *     │   ├── aranha
 *     │   └── suspensao
 *     ├── ima
 *     ├── carcaca
 *     └── terminais
 *
 * ## O que esta suite prova (e o que ela achou)
 *
 * | # | Pergunta | Resposta provada aqui |
 * |---|---|---|
 * | 1 | o reparo tem BOM propria E e componente do alto-falante? | sim |
 * | 2 | a explosao alcanca o 2o nivel (cone/bobina/aranha/suspensao)? | sim, na visao de ENGENHARIA (`?through_subassemblies=true`) |
 * | 3 | o custo do alto-falante incorpora o reparo sem contar duas vezes nem zerar? | sim |
 * | 4 | o MRP enxerga a necessidade dos componentes de 2o nivel? | sim — a projecao do G1 devolve TODAS as arestas de BOM ativa e o motor recursa |
 * | 5 | vender o reparo avulso funciona? | sim |
 * | 6 | produzir o alto-falante consome o REPARO (nao os componentes dele)? | **so depois do G18** — ver abaixo |
 *
 * O item 6 estava **quebrado** antes desta rodada: `BomService.explodeBOM`
 * descia incondicionalmente em qualquer componente com BOM ativa, e como
 * essa explosao governa reserva, consumo, baixa de lote e custeio da OP, a
 * ordem do alto-falante reservava e consumia **cone, bobina, aranha e
 * suspensao** diretamente. O **estoque de reparo nunca era baixado** e o
 * custo do alto-falante ignorava o valor agregado da OP do reparo. O G18
 * introduziu `bill_of_material_items.is_phantom` (padrao `false` = peca
 * estocavel) e separou as duas visoes:
 *
 *   - **producao** (padrao): para no subconjunto estocavel — a OP consome a
 *     peca pronta;
 *   - **engenharia** (`?through_subassemblies=true`): desce ate a
 *     materia-prima — e a lista indentada classica, so para ver e custear.
 *
 * ## Convencoes
 *
 * Todo registro criado leva o prefixo `REP-...-<SUFFIX>`, para permitir
 * limpeza posterior. A suite roda contra API + PostgreSQL REAIS, sem mock,
 * e reusa as regras vivas do ERP (D-K de segregacao de funcao, G7 de
 * inspecao antes da liberacao de lote, G4 de apontamento obrigatorio) — nao
 * ha atalho por escrita direta no banco em nenhum caminho de negocio.
 *
 * @module tests/integration/bom-two-level-reparo
 */
import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Sufixo unico da execucao. */
const SUFFIX = Date.now();
/** Prefixo de identificacao dos dados desta suite. */
const P = 'REP';

/** Custo unitario de cada insumo do REPARO. */
const COST = { cone: 8, bobina: 6.5, aranha: 2.5, suspensao: 1.5, ima: 12, carcaca: 25, terminal: 1.5 };
/** Custo de material de 1 REPARO = 8 + 6,5 + 2,5 + 1,5. */
const REPARO_MATERIAL_COST = COST.cone + COST.bobina + COST.aranha + COST.suspensao;
/** Terminais por alto-falante (unico componente com quantidade > 1). */
const TERMINAIS_POR_AF = 2;
/** Custo do alto-falante ALEM do reparo: ima + carcaca + 2 terminais. */
const AF_EXTRA_COST = COST.ima + COST.carcaca + COST.terminal * TERMINAIS_POR_AF;

/** Quantidade comprada de cada insumo. */
const PURCHASED_QTY = 50;
/** Reparos produzidos na OP propria do reparo. */
const REPARO_OP_QTY = 10;
/** Reparos vendidos avulsos no balcao. */
const REPARO_SOLD_QTY = 2;
/** Reparos transferidos de ACABADOS para INSUMOS (para irem para a linha). */
const REPARO_TO_LINE_QTY = 5;
/** Alto-falantes produzidos na OP que consome o reparo. */
const AF_OP_QTY = 3;
/** Demanda usada para exercitar o MRP (antes de existir qualquer estoque). */
const MRP_DEMAND_QTY = 4;

/** Contexto compartilhado entre os passos (Jest roda os `it` em ordem no arquivo). */
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
 * Digito verificador de CNPJ.
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
    location: 'REP',
    revision: '00',
  };
}

/**
 * Afirma o status HTTP mostrando o CORPO da resposta quando falha.
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

/** Peca da arvore: par produto legado (`products`) x item canonico (`items`). */
interface TreeNode {
  /** Chave logica usada no `ctx` (ex.: `cone`, `reparo`). */
  key: string;
  /** Codigo compartilhado pelos dois cadastros (e o crosswalk do MRP). */
  code: string;
  /** `products.id` (INTEGER) — chave da cadeia fisica. */
  productId: number;
  /** `items.id` (UUID) — chave do MRP/requisicao. */
  itemId: string;
}

describeIntegration('G18 — estrutura de dois niveis: o REPARO e produto vendido E componente', () => {
  /** Token de quem EXECUTA a cadeia (cadastra, compra, produz, vende). */
  const token = () => authToken();
  /** Token do SEGUNDO administrador — usado so nos pontos de aprovacao (D-K). */
  const approver = () => approverToken();

  /** Nodes da arvore, por chave logica. */
  const tree: Record<string, TreeNode> = {};

  /**
   * Cadastra a peca nos DOIS cadastros com o MESMO codigo.
   *
   * O codigo identico nao e detalhe: depois do G1 a estrutura que o MRP le e
   * a BOM ativa (mestre `products`, INTEGER) projetada para UUID pelo
   * crosswalk `products.code = items.codigo`. Sem o par, a aresta some do
   * planejamento e vira `unmapped` em `MrpRepository.listStructureGaps`.
   *
   * @param key - Chave logica (`cone`, `reparo`, ...).
   * @param name - Descricao legivel.
   * @param productType - `products.product_type`.
   * @param itemType - `items.tipo`.
   * @param costPrice - Custo padrao.
   * @param price - Preco de venda.
   * @returns O node cadastrado.
   */
  async function createNode(
    key: string,
    name: string,
    productType: 'raw_material' | 'finished',
    itemType: 'MATERIA_PRIMA' | 'PRODUTO_ACABADO',
    costPrice: number,
    price: number,
  ): Promise<TreeNode> {
    const code = `${P}-${key.toUpperCase()}-${SUFFIX}`;

    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} ${name} ${SUFFIX}`,
        code,
        description: `${name} — validacao G18 da arvore de dois niveis`,
        price,
        cost_price: costPrice,
        quantity: 0,
        product_type: productType,
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(product, 201, `product:${key}`);

    const item = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        codigo: code,
        descricao: `${P} ${name} ${SUFFIX}`,
        tipo: itemType,
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 0,
        estoque_seguranca: 0,
        lote_minimo: 1,
        lead_time_dias: 1,
        custo_padrao: costPrice,
      });
    expectStatus(item, 201, `item:${key}`);

    const node: TreeNode = { key, code, productId: product.body.data.id, itemId: item.body.data.id };
    tree[key] = node;
    return node;
  }

  /**
   * Le o saldo global de um produto (`products.quantity`).
   *
   * @param productId - Produto legado.
   * @returns Saldo atual.
   */
  async function stockOf(productId: number): Promise<number> {
    const response = await api()
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(response, 200, `stockOf:${productId}`);
    return Number(response.body.data.quantity);
  }

  /**
   * Materializa, inicia e conclui as etapas de apontamento da OP (G4).
   *
   * @param productionOrderId - OP liberada.
   * @param quantity - Quantidade boa produzida na etapa.
   * @returns void
   */
  async function completeTrackingSteps(productionOrderId: number, quantity: number): Promise<void> {
    const tracking = await api()
      .get(`/api/production-orders/${productionOrderId}/tracking`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(tracking, 200, 'tracking');
    expect(tracking.body.data.length).toBeGreaterThan(0);

    for (const step of tracking.body.data) {
      const started = await api()
        .post(`/api/production-orders/tracking/${step.id}/start`)
        .set('Authorization', `Bearer ${token()}`)
        .send({});
      expectStatus(started, 200, 'tracking:start');

      const finished = await api()
        .post(`/api/production-orders/tracking/${step.id}/complete`)
        .set('Authorization', `Bearer ${token()}`)
        .send({ quantity_good: quantity, quantity_scrapped: 0, notes: `${P} etapa concluida` });
      expectStatus(finished, 200, 'tracking:complete');
    }
  }

  /**
   * Cria e ativa um roteiro de fabricacao de 1 etapa para o produto.
   *
   * Pre-requisito do G4: sem roteiro ativo a OP nao materializa apontamento,
   * e sem apontamento concluido a OP nao fecha.
   *
   * @param productId - Produto fabricado.
   * @param label - Sufixo do codigo do roteiro.
   * @returns void
   */
  async function createActiveRoute(productId: number, label: string): Promise<void> {
    const route = await api()
      .post('/api/production/routes')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: productId,
        route_code: `${P}-ROT-${label}-${SUFFIX}`.slice(0, 50),
        revision: '01',
        description: `${P} roteiro ${label} (G18)`,
        steps: [{
          sequence: 1,
          step_code: '010',
          name: 'Montagem',
          work_center_id: ctx.workCenterId,
          standard_time_minutes: 5,
          setup_time_minutes: 10,
        }],
      });
    expectStatus(route, 201, `route:${label}`);

    const activated = await api()
      .patch(`/api/production/routes/${route.body.data.id}/activate`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(activated, 200, `route:activate:${label}`);
  }

  // ====================================================================
  // ETAPA 1 — Cadastro das 9 pecas da arvore
  // ====================================================================
  it('etapa 1: cadastra as 9 pecas da arvore nos dois cadastros (products + items)', async () => {
    await createNode('cone', 'Cone de celulose 12pol', 'raw_material', 'MATERIA_PRIMA', COST.cone, 14);
    await createNode('bobina', 'Bobina movel 8ohm', 'raw_material', 'MATERIA_PRIMA', COST.bobina, 12);
    await createNode('aranha', 'Aranha Nomex', 'raw_material', 'MATERIA_PRIMA', COST.aranha, 5);
    await createNode('suspensao', 'Suspensao de borracha', 'raw_material', 'MATERIA_PRIMA', COST.suspensao, 4);
    await createNode('ima', 'Ima de ferrite Y35', 'raw_material', 'MATERIA_PRIMA', COST.ima, 22);
    await createNode('carcaca', 'Carcaca de aluminio', 'raw_material', 'MATERIA_PRIMA', COST.carcaca, 40);
    await createNode('terminal', 'Terminal PCB', 'raw_material', 'MATERIA_PRIMA', COST.terminal, 3);

    // O REPARO nasce `finished` porque ele E vendido: tem preco de balcao,
    // estoque e NF-e propria. `cost_price` recebe o custo padrao de
    // engenharia (soma do conjunto movel) — e ele que o alto-falante vai
    // absorver enquanto a OP do reparo nao apurar o custo real.
    await createNode('reparo', 'REPARO 12pol (conjunto movel)', 'finished', 'PRODUTO_ACABADO', REPARO_MATERIAL_COST, 120);
    await createNode('alto_falante', 'Alto-falante 12pol', 'finished', 'PRODUTO_ACABADO', 0, 500);

    expect(Object.keys(tree)).toHaveLength(9);
  });

  // ====================================================================
  // ETAPA 2 — As duas BOMs (o reparo e dono de uma e componente da outra)
  // ====================================================================
  it('etapa 2: o REPARO tem BOM propria E e componente da BOM do alto-falante', async () => {
    const reparoBom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: tree.reparo.productId,
        revision: 'G18',
        notes: 'Conjunto movel do reparo 12pol',
        items: [
          { component_product_id: tree.cone.productId, quantity: 1, unit: 'un', component_type: 'raw_material', is_critical: true },
          { component_product_id: tree.bobina.productId, quantity: 1, unit: 'un', component_type: 'raw_material', is_critical: true },
          { component_product_id: tree.aranha.productId, quantity: 1, unit: 'un', component_type: 'raw_material' },
          { component_product_id: tree.suspensao.productId, quantity: 1, unit: 'un', component_type: 'raw_material' },
        ],
      });
    expectStatus(reparoBom, 201, 'reparoBom');
    ctx.reparoBomId = reparoBom.body.data?.id ?? reparoBom.body.data?.bom?.id;
    expect(ctx.reparoBomId).toBeTruthy();

    // BOM do alto-falante: o REPARO entra como COMPONENTE. Nenhum
    // `is_phantom` e informado de proposito — o padrao (`false`) e
    // justamente o que faz a producao consumir a peca pronta.
    const afBom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: tree.alto_falante.productId,
        revision: 'G18',
        notes: 'Alto-falante 12pol montado sobre o reparo',
        items: [
          { component_product_id: tree.reparo.productId, quantity: 1, unit: 'un', component_type: 'semi_finished', is_critical: true },
          { component_product_id: tree.ima.productId, quantity: 1, unit: 'un', component_type: 'raw_material' },
          { component_product_id: tree.carcaca.productId, quantity: 1, unit: 'un', component_type: 'raw_material' },
          { component_product_id: tree.terminal.productId, quantity: TERMINAIS_POR_AF, unit: 'un', component_type: 'raw_material' },
        ],
      });
    expectStatus(afBom, 201, 'afBom');
    ctx.afBomId = afBom.body.data?.id ?? afBom.body.data?.bom?.id;

    // As duas estruturas estao ATIVAS ao mesmo tempo — e isso que faz a
    // arvore ter dois niveis de verdade.
    for (const [label, productId] of [['reparo', tree.reparo.productId], ['alto_falante', tree.alto_falante.productId]] as [string, number][]) {
      const active = await api()
        .get(`/api/engineering/bom/product/${productId}`)
        .set('Authorization', `Bearer ${token()}`);
      expectStatus(active, 200, `activeBom:${label}`);
      expect(active.body.data.status).toBe('active');
    }

    // A linha do reparo na BOM do alto-falante gravou `is_phantom = false`
    // (peca estocavel). Se a coluna nao existisse ou o service nao a
    // gravasse, o Sequelize descartaria a chave em silencio — variante 3 da
    // classe de defeito catalogada em 2026-08-10.
    const afItems = await api()
      .get(`/api/engineering/bom/${ctx.afBomId}/items`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(afItems, 200, 'afItems');
    const reparoLine = afItems.body.data.find((i: any) => Number(i.component_product_id) === tree.reparo.productId);
    expect(reparoLine).toBeDefined();
    expect(reparoLine.is_phantom).toBe(false);
  });

  // ====================================================================
  // ETAPA 3 — MRP enxerga os DOIS niveis (ainda sem nenhum estoque)
  // ====================================================================
  it('etapa 3: o MRP enxerga a necessidade dos componentes de SEGUNDO nivel', async () => {
    // Rodado ANTES de qualquer compra: com estoque zero, necessidade bruta
    // e quantidade planejada coincidem, e o numero fica conferivel na mao.
    const plan = await api()
      .post('/api/mrp/plan')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        demands: [
          { item_id: tree.alto_falante.itemId, quantidade: MRP_DEMAND_QTY, data_necessidade: futureDate(30), origem: 'MANUAL' },
        ],
      });
    expectStatus(plan, 201, 'plan');

    /**
     * Ordem planejada de um item da arvore.
     *
     * @param key - Chave logica da peca.
     * @returns A ordem planejada correspondente, se houver.
     */
    const orderFor = (key: string) => plan.body.data.find((o: any) => String(o.item_id) === String(tree[key].itemId));

    // A assercao e sobre `necessidade_bruta` (o que a arvore explodida diz
    // que e preciso), nao sobre `quantidade_planejada`. A quantidade
    // planejada passa por estoque de seguranca e arredondamento de lote
    // minimo — e ambos saem de `products.min_quantity`, cujo default e 5
    // (ver `SequelizeItemRepository.listMrpInventoryPositions`). Misturar as
    // duas coisas transformaria este teste de estrutura num teste de politica
    // de lote.
    //
    // 1o nivel — o reparo e planejado como item proprio.
    expect(orderFor('reparo')).toBeDefined();
    expect(Number(orderFor('reparo').necessidade_bruta)).toBeCloseTo(MRP_DEMAND_QTY, 4);
    expect(Number(orderFor('ima').necessidade_bruta)).toBeCloseTo(MRP_DEMAND_QTY, 4);
    expect(Number(orderFor('terminal').necessidade_bruta)).toBeCloseTo(MRP_DEMAND_QTY * TERMINAIS_POR_AF, 4);

    // 2o NIVEL — a pergunta que originou esta suite. Se a projecao do G1
    // devolvesse so o primeiro nivel, cone/bobina/aranha/suspensao nao
    // apareceriam aqui e a fabrica compraria reparo em vez dos insumos dele.
    for (const key of ['cone', 'bobina', 'aranha', 'suspensao']) {
      const order = orderFor(key);
      expect(order).toBeDefined();
      expect(Number(order.necessidade_bruta)).toBeCloseTo(MRP_DEMAND_QTY, 4);
      // E a necessidade vira ordem de fato (nao fica so no calculo).
      expect(Number(order.quantidade_planejada)).toBeGreaterThanOrEqual(MRP_DEMAND_QTY);
    }
  });

  // ====================================================================
  // ETAPA 4 — As duas visoes da explosao, e o custo
  // ====================================================================
  it('etapa 4: producao para no REPARO; engenharia desce ate cone/bobina/aranha/suspensao', async () => {
    // --- visao de PRODUCAO (padrao) — e a que reserva, consome e custeia.
    const producao = await api()
      .get(`/api/engineering/bom/${ctx.afBomId}/explode`)
      .set('Authorization', `Bearer ${token()}`)
      .query({ qty: AF_OP_QTY });
    expectStatus(producao, 200, 'explode:producao');
    expect(producao.body.data.exploded_through_subassemblies).toBe(false);

    const producaoIds = producao.body.data.components.map((c: any) => Number(c.component_id));
    expect(producaoIds).toContain(tree.reparo.productId);
    for (const key of ['cone', 'bobina', 'aranha', 'suspensao']) {
      expect(producaoIds).not.toContain(tree[key].productId);
    }
    expect(producaoIds).toHaveLength(4);

    const reparoLine = producao.body.data.components.find((c: any) => Number(c.component_id) === tree.reparo.productId);
    expect(Number(reparoLine.quantity)).toBeCloseTo(AF_OP_QTY, 4);
    // O reparo aparece marcado como subconjunto: tem estrutura propria, mas
    // foi consumido como peca. Sem esse sinal, reparo e parafuso ficam
    // indistinguiveis na resposta.
    expect(reparoLine.is_subassembly).toBe(true);
    expect(Number(reparoLine.sub_bom_id)).toBe(Number(ctx.reparoBomId));
    expect(Number(reparoLine.unit_cost)).toBeCloseTo(REPARO_MATERIAL_COST, 2);

    // --- visao de ENGENHARIA — a arvore inteira, ate a materia-prima.
    const engenharia = await api()
      .get(`/api/engineering/bom/${ctx.afBomId}/explode`)
      .set('Authorization', `Bearer ${token()}`)
      .query({ qty: AF_OP_QTY, through_subassemblies: 'true' });
    expectStatus(engenharia, 200, 'explode:engenharia');
    expect(engenharia.body.data.exploded_through_subassemblies).toBe(true);

    const engenhariaIds = engenharia.body.data.components.map((c: any) => Number(c.component_id));
    for (const key of ['cone', 'bobina', 'aranha', 'suspensao', 'ima', 'carcaca', 'terminal']) {
      expect(engenhariaIds).toContain(tree[key].productId);
    }
    // O reparo NAO aparece: nesta visao ele foi atravessado.
    expect(engenhariaIds).not.toContain(tree.reparo.productId);
    const coneLine = engenharia.body.data.components.find((c: any) => Number(c.component_id) === tree.cone.productId);
    expect(Number(coneLine.quantity)).toBeCloseTo(AF_OP_QTY, 4);
    expect(Number(coneLine.bom_level)).toBe(2);

    // --- CUSTO: sem contar duas vezes, sem zerar.
    //
    // Producao: custo do reparo (peca) + ima + carcaca + 2 terminais.
    // Engenharia: as 7 materias-primas.
    // Aqui os dois numeros COINCIDEM porque o custo padrao do reparo e
    // exatamente a soma do conjunto movel — o que prova que nao ha dupla
    // contagem (seria 58,50 + 18,50) nem perda do reparo (seria 40,00).
    const esperadoUnitario = REPARO_MATERIAL_COST + AF_EXTRA_COST;
    expect(Number(producao.body.data.total_cost)).toBeCloseTo(esperadoUnitario * AF_OP_QTY, 2);
    expect(Number(engenharia.body.data.total_cost)).toBeCloseTo(esperadoUnitario * AF_OP_QTY, 2);

    const custo = await api()
      .get(`/api/engineering/bom/${ctx.afBomId}/cost`)
      .set('Authorization', `Bearer ${token()}`)
      .query({ qty: 1 });
    expectStatus(custo, 200, 'cost');
    expect(Number(custo.body.data.unit_cost)).toBeCloseTo(esperadoUnitario, 2);
    expect(Number(custo.body.data.unit_cost)).toBeGreaterThan(AF_EXTRA_COST);
  });

  // ====================================================================
  // ETAPA 5 — Compra e recebimento dos 7 insumos (caminho real)
  // ====================================================================
  it('etapa 5: compra, recebe, inspeciona e libera os 7 insumos', async () => {
    const supplier = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        company_name: `${P} Fornecedor Conjunto Movel ${SUFFIX}`,
        trade_name: `${P} Conjunto Movel`,
        cnpj: generateValidCnpj(),
        ie: 'ISENTO',
        phone: '(11) 4000-0000',
        email: `g18-fornecedor-${SUFFIX}@evok.local`,
        payment_terms: '30 dias',
        // G11 — declaracao obrigatoria desde 2026-08-11: e ela que decide a
        // alcada (importacao exige a diretoria em qualquer valor).
        is_foreign: false,
      });
    expectStatus(supplier, 201, 'supplier');
    ctx.supplierId = supplier.body.data.id;

    const insumos = ['cone', 'bobina', 'aranha', 'suspensao', 'ima', 'carcaca', 'terminal'];

    for (const key of insumos) {
      const link = await api()
        .post(`/api/items/${tree[key].itemId}/suppliers`)
        .set('Authorization', `Bearer ${token()}`)
        .send({ supplier_id: ctx.supplierId, unit_price: (COST as any)[key], currency: 'BRL', lead_time_days: 5, preferred: true });
      expectStatus(link, 201, `itemSupplier:${key}`);
    }

    const requisition = await api()
      .post('/api/purchase-requisitions')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        origin: 'manual',
        priority: 'normal',
        notes: `${P} compra dos insumos do reparo e do alto-falante (G18)`,
        items: insumos.map((key) => ({
          item_id: tree[key].itemId,
          quantity: PURCHASED_QTY,
          unit: 'un',
          required_date: futureDate(15),
          unit_price_estimated: (COST as any)[key],
        })),
      });
    expectStatus(requisition, 201, 'requisition');

    // D-K: quem registra nao aprova.
    const approved = await api()
      .patch(`/api/purchase-requisitions/${requisition.body.data.id}/status`)
      .set('Authorization', `Bearer ${approver()}`)
      .send({ status: 'approved' });
    expectStatus(approved, 200, 'requisition:approved');

    const converted = await api()
      .post(`/api/purchase-requisitions/${requisition.body.data.id}/convert`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} conversao G18` });
    expectStatus(converted, 201, 'converted');
    expect(converted.body.data.purchase_orders).toHaveLength(1);

    const purchase = converted.body.data.purchase_orders[0];
    for (const [status, statusToken] of [['approved', approver()], ['sent', token()]] as [string, string][]) {
      const changed = await api()
        .put(`/api/purchases/${purchase.id}/status`)
        .set('Authorization', `Bearer ${statusToken}`)
        .send({ status });
      expectStatus(changed, 200, `purchase:${status}`);
    }

    const received = await api()
      .post(`/api/purchases/${purchase.id}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        invoice_number: `${P}-NF-${SUFFIX}`,
        items: purchase.items.map((item: any) => ({
          item_id: item.id,
          quantity: PURCHASED_QTY,
          lot_number: `${P}-LOTE-${item.product_id}-${SUFFIX}`,
        })),
      });
    expectStatus(received, 200, 'received');

    // G7 (ISO 9001 §8.6): o lote nasce em quarentena e so a Qualidade
    // libera, com inspecao registrada. Sem isso o material existe no saldo
    // mas o FEFO da producao nunca consegue consumi-lo.
    ctx.lotIdByProduct = {} as Record<number, number>;
    for (const key of insumos) {
      const lots = await api()
        .get('/api/inventory/lots')
        .set('Authorization', `Bearer ${token()}`)
        .query({ product_id: tree[key].productId, status: 'quarantine', limit: 50 });
      expectStatus(lots, 200, `lots:${key}`);
      const lot = lots.body.data.find((l: any) => l.lot_number === `${P}-LOTE-${tree[key].productId}-${SUFFIX}`);
      expect(lot).toBeDefined();

      const inspection = await api()
        .post('/api/quality/inspections')
        .set('Authorization', `Bearer ${token()}`)
        .send({
          lot_id: lot.id,
          stage: 'incoming',
          acceptance_criteria: 'Conformidade dimensional e visual do insumo do conjunto movel',
          sampling_plan: 'Amostragem simples, nivel II (validacao G18)',
          sample_size: 5,
          defects_found: 0,
          verdict: 'approved',
          notes: `${P} inspecao de recebimento (${key})`,
        });
      expectStatus(inspection, 201, `inspection:${key}`);

      const release = await api()
        .post(`/api/inventory/lots/${lot.id}/release`)
        .set('Authorization', `Bearer ${token()}`)
        .send({ notes: `${P} liberado apos inspecao` });
      expectStatus(release, 200, `release:${key}`);
      expect(release.body.data.status).toBe('available');

      ctx.lotIdByProduct[tree[key].productId] = lot.id;
      expect(await stockOf(tree[key].productId)).toBeCloseTo(PURCHASED_QTY, 4);
    }
  });

  // ====================================================================
  // ETAPA 6 — Centro de trabalho e roteiros (pre-requisito do G4)
  // ====================================================================
  it('etapa 6: cadastra centro de trabalho e roteiro ATIVO dos dois produtos fabricados', async () => {
    const workCenter = await api()
      .post('/api/work-centers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        code: `${P}-WC-${SUFFIX}`.slice(0, 30),
        name: 'Montagem G18',
        machines_count: 1,
        capacity_hours_per_day: 8,
        efficiency_factor: 1,
        cost_per_hour: 60,
      });
    expectStatus(workCenter, 201, 'workCenter');
    ctx.workCenterId = workCenter.body.data.id;

    await createActiveRoute(tree.reparo.productId, 'REP');
    await createActiveRoute(tree.alto_falante.productId, 'AF');
  });

  // ====================================================================
  // ETAPA 7 — OP do REPARO (ele e fabricado por OP propria)
  // ====================================================================
  it('etapa 7: a OP do REPARO consome cone, bobina, aranha e suspensao e gera lote de reparo', async () => {
    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: tree.reparo.productId,
        quantity: REPARO_OP_QTY,
        priority: 'normal',
        due_date: futureDate(10),
        notes: `${P} OP do reparo (G18)`,
      });
    expectStatus(created, 201, 'reparoOp');
    ctx.reparoOrderId = created.body.data.id;

    const released = await api()
      .put(`/api/production-orders/${ctx.reparoOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'released' });
    expectStatus(released, 200, 'reparoOp:released');

    const started = await api()
      .put(`/api/production-orders/${ctx.reparoOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(started, 200, 'reparoOp:in_progress');

    await completeTrackingSteps(ctx.reparoOrderId, REPARO_OP_QTY);

    ctx.reparoLotNumber = `${P}-LOTE-REPARO-${SUFFIX}`;
    const completed = await api()
      .put(`/api/production-orders/${ctx.reparoOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        status: 'completed',
        quantity_produced: REPARO_OP_QTY,
        finished_lot_number: ctx.reparoLotNumber,
        lot_consumptions: ['cone', 'bobina', 'aranha', 'suspensao'].map((key) => ({
          product_id: tree[key].productId,
          lot_control_id: ctx.lotIdByProduct[tree[key].productId],
          quantity: REPARO_OP_QTY,
        })),
      });
    expectStatus(completed, 200, 'reparoOp:completed');

    for (const key of ['cone', 'bobina', 'aranha', 'suspensao']) {
      expect(await stockOf(tree[key].productId)).toBeCloseTo(PURCHASED_QTY - REPARO_OP_QTY, 4);
    }
    expect(await stockOf(tree.reparo.productId)).toBeCloseTo(REPARO_OP_QTY, 4);

    // Custo real apurado pela OP do reparo — e ele que o alto-falante vai
    // absorver como peca (nao a soma das materias-primas dele).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Product } = require('../../src/models/index');
    const reparo = await Product.findByPk(tree.reparo.productId);
    expect(Number(reparo.cost_price)).toBeGreaterThan(0);
    expect(Number(reparo.cost_price)).toBeCloseTo(REPARO_MATERIAL_COST, 2);

    const lots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: tree.reparo.productId, limit: 50 });
    expectStatus(lots, 200, 'reparoLots');
    const reparoLot = lots.body.data.find((l: any) => l.lot_number === ctx.reparoLotNumber);
    expect(reparoLot).toBeDefined();
    expect(Number(reparoLot.quantity_available)).toBeCloseTo(REPARO_OP_QTY, 4);
    ctx.reparoLotId = reparoLot.id;
  });

  // ====================================================================
  // ETAPA 8 — Venda avulsa do reparo (ele E produto acabado)
  // ====================================================================
  it('etapa 8: vende o REPARO avulso no balcao (pedido -> NF-e), como qualquer produto acabado', async () => {
    const client = await api()
      .post('/api/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Cliente Balcao ${SUFFIX}`,
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
        email: `g18-cliente-${SUFFIX}@evok.local`,
      });
    expectStatus(client, 201, 'client');

    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        customer_id: client.body.data.id,
        items: [{ product_id: tree.reparo.productId, quantity: REPARO_SOLD_QTY, unit_price: 120 }],
        payment_method: 'pix',
        status: 'quote',
        notes: `${P} venda de reparo avulso (G18)`,
      });
    expectStatus(sale, 201, 'sale');
    ctx.saleId = sale.body.data.id;

    const confirmed = await api()
      .put(`/api/sales/${ctx.saleId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'confirmed' });
    expectStatus(confirmed, 200, 'sale:confirmed');

    const nfe = await api()
      .post(`/api/sales/${ctx.saleId}/nfe`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(nfe, 202, 'sale:nfe');
    expect(nfe.body.data.nfe_status).toBe('authorized');
    expect(nfe.body.data.status).toBe('invoiced');

    expect(await stockOf(tree.reparo.productId)).toBeCloseTo(REPARO_OP_QTY - REPARO_SOLD_QTY, 4);
  });

  // ====================================================================
  // ETAPA 9 — O reparo vai do estoque de acabados para a linha
  // ====================================================================
  it('etapa 9: transfere reparos de ACABADOS para INSUMOS (a peca vai para a linha)', async () => {
    // Achado operacional real (documentado em docs/producao/06-BOM.md):
    // o reparo produzido entra em ACABADOS (e de la que ele e vendido), mas
    // o consumo de componente de OP sai SEMPRE de INSUMOS. Um item de dupla
    // natureza exige, portanto, uma transferencia explicita entre depositos
    // antes de virar componente — nao ha roteamento automatico.
    const transfer = await api()
      .post('/api/inventory/transfers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: tree.reparo.productId,
        from_warehouse_code: 'ACABADOS',
        to_warehouse_code: 'INSUMOS',
        quantity: REPARO_TO_LINE_QTY,
        reason: 'Reparo destinado a montagem do alto-falante (G18)',
      });
    expectStatus(transfer, 201, 'transfer');

    const approved = await api()
      .put(`/api/inventory/transfers/${transfer.body.data.id}/approve`)
      .set('Authorization', `Bearer ${approver()}`)
      .send({});
    expectStatus(approved, 200, 'transfer:approved');

    // Transferencia NUNCA muda o saldo total do produto (BUSINESS_RULES §12).
    expect(await stockOf(tree.reparo.productId)).toBeCloseTo(REPARO_OP_QTY - REPARO_SOLD_QTY, 4);
  });

  // ====================================================================
  // ETAPA 10 — A prova principal: a OP do alto-falante consome o REPARO
  // ====================================================================
  it('etapa 10: a OP do alto-falante RESERVA e CONSOME o REPARO — nao cone/bobina/aranha/suspensao', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ProductionOrderReservation, Product, ProductionLotConsumption } = require('../../src/models/index');

    const estoqueConjuntoMovelAntes: Record<string, number> = {};
    for (const key of ['cone', 'bobina', 'aranha', 'suspensao']) {
      estoqueConjuntoMovelAntes[key] = await stockOf(tree[key].productId);
    }

    const created = await api()
      .post('/api/production-orders')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: tree.alto_falante.productId,
        quantity: AF_OP_QTY,
        priority: 'normal',
        due_date: futureDate(10),
        notes: `${P} OP do alto-falante (G18)`,
      });
    expectStatus(created, 201, 'afOp');
    ctx.afOrderId = created.body.data.id;

    const released = await api()
      .put(`/api/production-orders/${ctx.afOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'released' });
    expectStatus(released, 200, 'afOp:released');

    // 10.1 — a RESERVA e do reparo, nao dos insumos dele.
    const reservations = await ProductionOrderReservation.findAll({
      where: { production_order_id: ctx.afOrderId, status: 'active' },
    });
    const reservedProductIds = reservations.map((r: any) => Number(r.product_id));
    expect(reservedProductIds).toContain(tree.reparo.productId);
    for (const key of ['cone', 'bobina', 'aranha', 'suspensao']) {
      expect(reservedProductIds).not.toContain(tree[key].productId);
    }
    const reparoReservation = reservations.find((r: any) => Number(r.product_id) === tree.reparo.productId);
    expect(Number(reparoReservation.quantity)).toBeCloseTo(AF_OP_QTY, 4);

    const started = await api()
      .put(`/api/production-orders/${ctx.afOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'in_progress' });
    expectStatus(started, 200, 'afOp:in_progress');

    await completeTrackingSteps(ctx.afOrderId, AF_OP_QTY);

    ctx.afLotNumber = `${P}-LOTE-AF-${SUFFIX}`;
    const completed = await api()
      .put(`/api/production-orders/${ctx.afOrderId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        status: 'completed',
        quantity_produced: AF_OP_QTY,
        finished_lot_number: ctx.afLotNumber,
        lot_consumptions: [
          { product_id: tree.reparo.productId, lot_control_id: ctx.reparoLotId, quantity: AF_OP_QTY },
          { product_id: tree.ima.productId, lot_control_id: ctx.lotIdByProduct[tree.ima.productId], quantity: AF_OP_QTY },
          { product_id: tree.carcaca.productId, lot_control_id: ctx.lotIdByProduct[tree.carcaca.productId], quantity: AF_OP_QTY },
          { product_id: tree.terminal.productId, lot_control_id: ctx.lotIdByProduct[tree.terminal.productId], quantity: AF_OP_QTY * TERMINAIS_POR_AF },
        ],
      });
    expectStatus(completed, 200, 'afOp:completed');

    // 10.2 — o estoque de REPARO caiu...
    expect(await stockOf(tree.reparo.productId)).toBeCloseTo(REPARO_OP_QTY - REPARO_SOLD_QTY - AF_OP_QTY, 4);

    // 10.3 — ...e o do conjunto movel NAO se moveu. Esta e a assercao que
    // reprova o comportamento anterior ao G18: antes, produzir alto-falante
    // baixava cone/bobina/aranha/suspensao e deixava o reparo intacto.
    for (const key of ['cone', 'bobina', 'aranha', 'suspensao']) {
      expect(await stockOf(tree[key].productId)).toBeCloseTo(estoqueConjuntoMovelAntes[key], 4);
    }

    // 10.4 — insumos de 1o nivel do alto-falante foram consumidos.
    expect(await stockOf(tree.ima.productId)).toBeCloseTo(PURCHASED_QTY - AF_OP_QTY, 4);
    expect(await stockOf(tree.carcaca.productId)).toBeCloseTo(PURCHASED_QTY - AF_OP_QTY, 4);
    expect(await stockOf(tree.terminal.productId)).toBeCloseTo(PURCHASED_QTY - AF_OP_QTY * TERMINAIS_POR_AF, 4);

    // 10.5 — rastreabilidade: o consumo aponta para o LOTE DE REPARO, ou
    // seja, da para dizer qual reparo entrou em qual alto-falante.
    const consumptions = await ProductionLotConsumption.findAll({ where: { production_order_id: ctx.afOrderId } });
    const consumedLotIds = consumptions.map((c: any) => Number(c.lot_control_id));
    expect(consumedLotIds).toContain(Number(ctx.reparoLotId));

    // 10.6 — custo do alto-falante = custo do reparo + ima + carcaca + 2 terminais.
    const reparo = await Product.findByPk(tree.reparo.productId);
    const altoFalante = await Product.findByPk(tree.alto_falante.productId);
    expect(Number(altoFalante.quantity)).toBeCloseTo(AF_OP_QTY, 4);
    expect(Number(altoFalante.cost_price)).toBeGreaterThan(0);
    expect(Number(altoFalante.cost_price)).toBeCloseTo(Number(reparo.cost_price) + AF_EXTRA_COST, 2);

    // 10.7 — nenhuma reserva ficou presa.
    const abertas = await ProductionOrderReservation.findAll({
      where: { production_order_id: ctx.afOrderId, status: 'active' },
    });
    expect(abertas).toHaveLength(0);
  });
});
