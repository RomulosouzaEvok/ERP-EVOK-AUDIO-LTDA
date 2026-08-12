/**
 * G1 — a BOM deixa de aceitar ciclo multinível.
 *
 * ## A brecha (auditoria de 2026-08-11)
 *
 * `BomService.createBOM` só barrava **auto-referência direta** (o produto
 * como componente de si mesmo, `G1-BOM-AUTO-REF`). Um ciclo de dois níveis
 * — A tem B na estrutura, e depois B recebe A na estrutura dele — entrava no
 * banco sem nenhum aviso.
 *
 * O preço só aparecia depois, e longe daqui: `explodeBOM` percorre a árvore
 * com um caminho de ancestrais e **lança 422 na explosão**. Ou seja, o
 * cadastro era aceito e o produto ficava com uma estrutura vigente
 * inexplodível — e, depois do G2 (BOM ativa obrigatória), **produto que não
 * conclui OP**. A fábrica descobriria isso ao liberar/concluir a ordem, com
 * material já reservado.
 *
 * A detecção de caminho já existia (`bomStructureProjection.hasPathBetween`,
 * usada na estrutura canônica em UUID). O que faltava era chamá-la na escrita
 * da BOM — e fazê-lo no espaço de `products.id`, que é onde a BOM vive: a
 * projeção em UUID depende do crosswalk `products.code = items.codigo`, e um
 * produto sem item correspondente sumiria do grafo, deixando o ciclo passar
 * exatamente no caso em que o cadastro está mais incompleto.
 *
 * ## O que esta suíte prova
 *
 * | # | Pergunta | Etapa |
 * |---|---|---|
 * | 1 | A→B grava normalmente? | 2 |
 * | 2 | B→A (ciclo de 2 níveis) é recusado com 422 e código próprio? | 3 |
 * | 3 | a recusa mostra o caminho do ciclo? | 3 |
 * | 4 | o ciclo de 3 níveis (A→B→C, depois C→A) também é recusado? | 4 |
 * | 5 | a BOM de B permanece intacta (nada foi gravado pela metade)? | 5 |
 *
 * @module tests/integration/bom-cycle-multilevel
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'G1CIC';
const SUFFIX = String(Date.now()).slice(-8);

describeIntegration('G1 — BOM recusa ciclo multinivel', () => {
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
   * Cadastra um produto acabado (unico tipo que pode ter BOM propria).
   *
   * @param key - Sufixo curto que identifica o produto na arvore do teste.
   * @returns Id do produto criado.
   */
  async function createFinishedProduct(key: string): Promise<number> {
    const response = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Produto ${key} ${SUFFIX}`,
        code: `${P}-${key}-${SUFFIX}`,
        description: `Produto ${key} da validacao de ciclo de BOM`,
        price: 100,
        cost_price: 40,
        quantity: 0,
        product_type: 'finished',
        status: 'active',
        ncm: '85182100',
        unit: 'un',
        lead_time: 1,
        revision: '00',
      });
    expectStatus(response, 201, `produto:${key}`);
    return response.body.data.id;
  }

  /**
   * Tenta criar uma BOM com um unico componente.
   *
   * @param productId - Produto pai.
   * @param componentId - Componente.
   * @param revision - Revisao da estrutura.
   * @returns Resposta Supertest crua (o teste decide o que esperar dela).
   */
  async function createBom(productId: number, componentId: number, revision: string) {
    return api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: productId,
        revision,
        notes: 'Estrutura da validacao de ciclo de BOM',
        items: [{ component_product_id: componentId, quantity: 1, unit: 'un', component_type: 'semi_finished' }],
      });
  }

  // ====================================================================
  // ETAPA 1 e 2 — A arvore legitima: A -> B
  // ====================================================================
  it('etapa 1: cadastra tres produtos acabados e a estrutura A -> B', async () => {
    ctx.a = await createFinishedProduct('A');
    ctx.b = await createFinishedProduct('B');
    ctx.c = await createFinishedProduct('C');

    const aParaB = await createBom(ctx.a, ctx.b, `${P}A`);
    expectStatus(aParaB, 201, 'bom:A->B');
    ctx.bomA = aParaB.body.data.bom.id;
  });

  // ====================================================================
  // ETAPA 3 — A prova principal: B -> A fecha o ciclo e e recusado
  // ====================================================================
  it('etapa 2: B -> A (ciclo de dois niveis) e recusado com 422', async () => {
    const bParaA = await createBom(ctx.b, ctx.a, `${P}B`);
    expectStatus(bParaA, 422, 'bom:B->A');
    expect(bParaA.body.error.details.rule).toBe('G1-BOM-CICLO');
    expect(bParaA.body.error.details.product_id).toBe(ctx.b);
    expect(bParaA.body.error.details.component_product_id).toBe(ctx.a);
  });

  // ====================================================================
  // ETAPA 4 — O ciclo de tres niveis (A -> B -> C, depois C -> A)
  // ====================================================================
  it('etapa 3: ciclo de tres niveis tambem e recusado', async () => {
    const bParaC = await createBom(ctx.b, ctx.c, `${P}BC`);
    expectStatus(bParaC, 201, 'bom:B->C');

    const cParaA = await createBom(ctx.c, ctx.a, `${P}CA`);
    expectStatus(cParaA, 422, 'bom:C->A');
    expect(cParaA.body.error.details.rule).toBe('G1-BOM-CICLO');
  });

  // ====================================================================
  // ETAPA 5 — Nada foi gravado pela metade
  // ====================================================================
  it('etapa 4: a estrutura vigente de B continua sendo a legitima (B -> C)', async () => {
    const boms = await api()
      .get('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.b, limit: 100 });
    expectStatus(boms, 200, 'bom:listaB');

    const ativas = (boms.body.data ?? []).filter((bom: any) => bom.status === 'active');
    expect(ativas).toHaveLength(1);
    expect(ativas[0].revision).toBe(`${P}BC`);

    // E a explosao da estrutura de A continua funcionando — o ciclo recusado
    // nao deixou aresta nenhuma para tras. (Se tivesse deixado, `explodeBOM`
    // devolveria 422 de ciclo detectado ao percorrer A -> B -> A.)
    const explosao = await api()
      .get(`/api/engineering/bom/${ctx.bomA}/explode`)
      .set('Authorization', `Bearer ${token()}`)
      .query({ qty: 1 });
    expectStatus(explosao, 200, 'bom:explode:A');
  });
});
