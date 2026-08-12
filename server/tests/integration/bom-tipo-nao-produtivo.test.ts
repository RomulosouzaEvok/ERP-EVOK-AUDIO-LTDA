/**
 * BOM × catálogo de suprimentos/patrimônio — `G1-BOM-TIPO-NAO-PRODUTIVO`.
 *
 * ## A brecha (achado de UAT de 2026-08-12)
 *
 * O item mestre (`items.tipo`) tem dois tipos que existem só para o ciclo de
 * compra/estoque: `USO_E_CONSUMO` (MRO) e `ATIVO_IMOBILIZADO` (bem
 * patrimonial — o registro de manutenção/depreciação vive em `assets`).
 * `products.product_type` não tem esses tipos, então a BOM parecia protegida
 * por construção — MAS o crosswalk `products.code = items.codigo` (o mesmo
 * que a projeção de estrutura usa) permite existir um produto cujo item
 * mestre é de suprimento/patrimônio. Sem guarda, esse produto entrava numa
 * estrutura e o MRP passava a planejar COMPRA DE IMOBILIZADO por demanda de
 * produção, e a OP tentava consumir/custear um bem que não é insumo.
 *
 * ## O que esta suíte prova (contra PostgreSQL real)
 *
 * | # | Pergunta | Etapa |
 * |---|---|---|
 * | 1 | componente cujo item mestre é `ATIVO_IMOBILIZADO` é recusado com 422 e código próprio? | 2 |
 * | 2 | componente cujo item mestre é `USO_E_CONSUMO` idem? | 3 |
 * | 3 | componente legítimo (item mestre `MATERIA_PRIMA`) continua entrando? | 4 |
 * | 4 | a recusa não gravou nada pela metade (produto segue sem BOM ativa)? | 5 |
 *
 * @module tests/integration/bom-tipo-nao-produtivo
 */
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo de todo registro criado por esta suite. */
const P = 'G1TNP';
const SUFFIX = String(Date.now()).slice(-8);

describeIntegration('G1 — BOM recusa item de suprimento/patrimonio', () => {
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
   * Cadastra um item mestre com o tipo pedido.
   *
   * @param key - Sufixo curto do codigo.
   * @param tipo - Tipo do item mestre.
   * @returns Codigo do item criado (que sera o `code` do produto gemeo).
   */
  async function createItemMestre(key: string, tipo: string): Promise<string> {
    const codigo = `${P}-${key}-${SUFFIX}`;
    const response = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({ codigo, descricao: `${P} item ${key}`, tipo, unidade: 'UN' });
    expectStatus(response, 201, `item:${key}`);
    return codigo;
  }

  /**
   * Cadastra um produto com o codigo e tipo pedidos.
   *
   * @param code - Codigo do produto (crosswalk com `items.codigo`).
   * @param productType - `product_type` do produto.
   * @returns Id do produto criado.
   */
  async function createProduct(code: string, productType: string): Promise<number> {
    const response = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Produto ${code}`,
        code,
        description: 'Produto da validacao de tipo nao-produtivo na BOM',
        price: 100,
        cost_price: 40,
        quantity: 0,
        product_type: productType,
        status: 'active',
        ncm: '85182100',
        unit: 'un',
        lead_time: 1,
        revision: '00',
      });
    expectStatus(response, 201, `produto:${code}`);
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
        notes: 'Estrutura da validacao de tipo nao-produtivo',
        items: [{ component_product_id: componentId, quantity: 1, unit: 'un', component_type: 'raw_material' }],
      });
  }

  // ====================================================================
  // ETAPA 1 — Cadastros: pai acabado + 3 gemeos item/produto
  // ====================================================================
  it('etapa 1: cadastra o pai e os pares item mestre x produto', async () => {
    ctx.paiId = await createProduct(`${P}-PAI-${SUFFIX}`, 'finished');

    const codigoAtivo = await createItemMestre('ATV', 'ATIVO_IMOBILIZADO');
    ctx.ativoProductId = await createProduct(codigoAtivo, 'raw_material');

    const codigoMro = await createItemMestre('MRO', 'USO_E_CONSUMO');
    ctx.mroProductId = await createProduct(codigoMro, 'raw_material');

    const codigoMp = await createItemMestre('MP', 'MATERIA_PRIMA');
    ctx.mpProductId = await createProduct(codigoMp, 'raw_material');
  });

  // ====================================================================
  // ETAPA 2 — Ativo imobilizado nao entra em estrutura
  // ====================================================================
  it('etapa 2: componente com item mestre ATIVO_IMOBILIZADO e recusado com 422', async () => {
    const response = await createBom(ctx.paiId, ctx.ativoProductId, `${P}A`);
    expectStatus(response, 422, 'bom:pai->ativo');
    expect(response.body.error.details.rule).toBe('G1-BOM-TIPO-NAO-PRODUTIVO');
    expect(response.body.error.details.item_tipo).toBe('ATIVO_IMOBILIZADO');
    expect(response.body.error.details.papel_na_estrutura).toBe('componente');
  });

  // ====================================================================
  // ETAPA 3 — MRO nao entra em estrutura
  // ====================================================================
  it('etapa 3: componente com item mestre USO_E_CONSUMO e recusado com 422', async () => {
    const response = await createBom(ctx.paiId, ctx.mroProductId, `${P}B`);
    expectStatus(response, 422, 'bom:pai->mro');
    expect(response.body.error.details.rule).toBe('G1-BOM-TIPO-NAO-PRODUTIVO');
    expect(response.body.error.details.item_tipo).toBe('USO_E_CONSUMO');
  });

  // ====================================================================
  // ETAPA 4 — O caminho legitimo continua aberto
  // ====================================================================
  it('etapa 4: componente com item mestre MATERIA_PRIMA entra normalmente', async () => {
    const response = await createBom(ctx.paiId, ctx.mpProductId, `${P}C`);
    expectStatus(response, 201, 'bom:pai->mp');
    ctx.bomId = response.body.data.bom.id;
  });

  // ====================================================================
  // ETAPA 5 — As recusas nao deixaram rastro
  // ====================================================================
  it('etapa 5: a unica BOM ativa do pai e a legitima', async () => {
    const boms = await api()
      .get('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.paiId, limit: 100 });
    expectStatus(boms, 200, 'bom:lista');

    const ativas = (boms.body.data ?? []).filter((bom: any) => bom.status === 'active');
    expect(ativas).toHaveLength(1);
    expect(ativas[0].revision).toBe(`${P}C`);
  });
});
