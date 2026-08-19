/**
 * G7 (achado colateral) — o MRP NAO pode contar material em quarentena como
 * estoque disponivel. Provado contra PostgreSQL real.
 *
 * ## O buraco que esta suite fecha
 *
 * O recebimento de compra cria o lote em `quarantine` **e ja incrementa
 * `products.quantity`** no mesmo passo (`services/materialReceiptService.ts`).
 * Enquanto o MRP lia esse numero cru, material que a producao nao pode
 * consumir contava como disponivel — e o plano **comprava de menos**. O erro
 * so aparece semanas depois, na conclusao da OP, quando o FEFO nao acha lote
 * liberado.
 *
 * A correcao (2026-08-10) ficou no LADO DA LEITURA:
 * `services/quarantineBalanceService.ts` soma o saldo retido
 * (`quarantine` + `blocked`) e
 * `SequelizeItemRepository.listMrpInventoryPositions` devolve
 * `max(0, fisico − retido)` como `estoque_atual` do MRP.
 *
 * O CLAUDE.md afirma desde entao que "a quarentena deixou de ser decorativa
 * (MRP e disponibilidade de OP descontam o saldo retido)" — **sem nenhuma
 * prova de integracao**. As suites unitarias que tocam esse caminho usam
 * repositorio dublê, que nao tem `lot_controls` nem `products.quantity`; a
 * unica maneira de exercitar a regra e com lote de verdade, criado pelo
 * caminho de verdade (recebimento -> quarentena, G14).
 *
 * ## O cenario (numeros escolhidos para o defeito nao ter onde se esconder)
 *
 * | Grandeza | Valor |
 * |---|---|
 * | saldo livre (entrada avulsa, sem lote) | 45 |
 * | saldo em QUARENTENA (recebimento de compra) | 60 |
 * | saldo fisico (`products.quantity`) | 105 |
 * | estoque de seguranca (`min_quantity`) | 5 |
 * | **disponivel para o MRP** | **40** (45 − 5) |
 * | disponivel se a quarentena fosse ignorada | 100 (105 − 5) |
 *
 * Com esses numeros, uma demanda de **100** cabe folgadamente no estoque
 * fisico e **nao** cabe no livre. Se o desconto sumir, a necessidade liquida
 * vira zero, o motor filtra `plannedQuantity > 0` e o plano volta **vazio**:
 * nenhuma ordem, nenhuma requisicao, e uma falta de 60 pecas que so aparece
 * no chao de fabrica.
 *
 * ## O que e provado aqui
 *
 * | # | Pergunta | Etapa |
 * |---|---|---|
 * | 1 | demanda que cabe no fisico mas nao no livre gera necessidade? | 3 |
 * | 2 | o saldo retido continua no banco (o desconto e de LEITURA)? | 4 |
 * | 3 | numa demanda maior, a liquida sobe exatamente o retido? | 5 |
 * | 4 | liberado o lote, a liquida cai exatamente o retido? | 7 |
 * | 5 | e a demanda do item 1 deixa de gerar necessidade? | 7 |
 *
 * ## Semantica do MRP apos a correcao de 2026-08-11 (netagem multi-demanda)
 *
 * O plano e netado **em conjunto** e depois rateado por origem
 * (`allocatePlanByOrigin.ts`), entao `estoque_disponivel` de uma linha e a
 * PARCELA alocada aquela origem, nao o saldo inteiro. Esta suite usa **uma
 * demanda por rodada**, com origens e datas distintas: com uma unica origem
 * o rateio devolve a linha integral (`shares.length === 1`), e cada asserto
 * fala do numero agregado sem ambiguidade. A prova do rateio em si e
 * `mrp-multi-demand-netting.test.ts` — aqui o alvo e a quarentena.
 *
 * @module tests/integration/mrp-quarantine-discount
 */
import { randomUUID } from 'crypto';

import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

// Etapas que encadeiam compra + recebimento + inspecao contra a API real nao
// cabem no default de 5s do Jest, dimensionado para teste unitario.
jest.setTimeout(60_000);

/** Prefixo de todo registro criado por esta suite. */
const P = 'MRPQUAR';
const SUFFIX = String(Date.now()).slice(-8);

/**
 * Estoque de seguranca do componente. NAO e escolha livre do teste:
 * `CreateProductUseCase` faz `input.min_quantity || 5` (nem enviar 0 zera) e
 * `SequelizeItemRepository.listMrpInventoryPositions` usa `min_quantity`
 * TANTO como `estoque_seguranca` QUANTO como `lote_minimo`.
 */
const ESTOQUE_SEGURANCA = 5;
/** Saldo livre, entrado sem lote (produto legado/ajuste) — o MRP pode contar. */
const SALDO_LIVRE = 45;
/** Saldo que entra por recebimento de compra e nasce em QUARENTENA (G14). */
const SALDO_QUARENTENA = 60;
/** Saldo fisico total em `products.quantity` (a quarentena tambem soma aqui). */
const SALDO_FISICO = SALDO_LIVRE + SALDO_QUARENTENA;
/** O que o MRP deve enxergar enquanto o lote esta retido. */
const DISPONIVEL_COM_QUARENTENA = SALDO_LIVRE - ESTOQUE_SEGURANCA;
/** O que o MRP passa a enxergar depois da liberacao pela Qualidade. */
const DISPONIVEL_APOS_LIBERACAO = SALDO_FISICO - ESTOQUE_SEGURANCA;

/** Consumo do componente por unidade do produto acabado (BOM 1:1). */
const QTD_POR_UNIDADE = 1;
/** Demanda que CABE no estoque fisico (100 <= 100) e nao cabe no livre (40). */
const DEMANDA_CABE_NO_FISICO = 100;
/** Demanda maior, que gera linha positiva nos dois cenarios (antes e depois). */
const DEMANDA_GRANDE = 160;
/** Preco unitario da compra que gera o lote em quarentena. */
const CUSTO_UNITARIO = 4;

describeIntegration('MRP — saldo em quarentena nao abate a demanda (G7)', () => {
  const ctx: Record<string, any> = {};

  /** @returns Token do usuario que opera a cadeia. */
  function token(): string {
    return authToken();
  }

  /** @returns Token do SEGUNDO administrador, que aprova (segregacao D-K). */
  function approver(): string {
    return approverToken();
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
   * Executa SQL cru contra o mesmo PostgreSQL que a API usa.
   *
   * @param sql - Consulta com parametros nomeados (`:nome`).
   * @param replacements - Valores dos parametros.
   * @returns Linhas cruas.
   */
  async function query(sql: string, replacements: Record<string, unknown>): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sequelize } = require('../../src/models/index');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { QueryTypes } = require('sequelize');
    return sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
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
   * Gera um CNPJ com digitos verificadores validos (o cadastro de fornecedor
   * valida o documento antes de qualquer regra de negocio).
   *
   * @param seed - Sufixo curto que diferencia os fornecedores da suite.
   * @returns CNPJ de 14 digitos.
   */
  function syntheticCnpj(seed: string): string {
    const base = `${SUFFIX}${seed}`.padEnd(12, '0').slice(0, 12);

    /**
     * Calcula um digito verificador de CNPJ.
     *
     * @param digits - Digitos ja conhecidos (12 ou 13).
     * @param weights - Pesos do DV correspondente.
     * @returns Digito verificador.
     */
    const checkDigit = (digits: string, weights: number[]): number => {
      const sum = weights.reduce((acc, weight, index) => acc + Number(digits[index]) * weight, 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const d1 = checkDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = checkDigit(`${base}${d1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return `${base}${d1}${d2}`;
  }

  /**
   * Cadastra o par produto + item com o MESMO codigo — o crosswalk
   * `products.code = items.codigo` que o G1 exige para o MRP enxergar a BOM.
   *
   * @param key - Chave logica (entra no codigo).
   * @param productType - Tipo em `products`.
   * @param itemTipo - Tipo em `items`.
   * @returns Ids do produto (INTEGER) e do item (UUID).
   */
  async function createPair(
    key: string,
    productType: 'finished' | 'raw_material',
    itemTipo: 'PRODUTO_ACABADO' | 'MATERIA_PRIMA',
  ): Promise<{ productId: number; itemId: string }> {
    const code = `${P}-${key}-${SUFFIX}`;

    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} ${key} ${SUFFIX}`,
        code,
        description: `Validacao do desconto de quarentena no MRP (${key})`,
        price: 100,
        cost_price: CUSTO_UNITARIO,
        quantity: 0,
        min_quantity: ESTOQUE_SEGURANCA,
        product_type: productType,
        status: 'active',
        ncm: '85182100',
        cest: '2106400',
        weight: 1,
        unit: 'un',
        lead_time: 0,
        location: P,
        revision: '00',
      });
    expectStatus(product, 201, `produto:${key}`);

    const item = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        codigo: code,
        descricao: `${P} ${key} ${SUFFIX}`,
        tipo: itemTipo,
        unidade: 'un',
        status: 'ATIVO',
        estoque_seguranca: 0,
        lote_minimo: 0,
        lead_time_dias: 0,
        custo_padrao: CUSTO_UNITARIO,
      });
    expectStatus(item, 201, `item:${key}`);

    return { productId: product.body.data.id, itemId: String(item.body.data.id) };
  }

  /**
   * Roda `POST /api/mrp/plan` com UMA demanda e devolve as linhas do
   * componente desta suite.
   *
   * Uma demanda por rodada e proposital: com uma unica origem o rateio de
   * `allocatePlanByOrigin` devolve a linha integral, entao
   * `estoque_disponivel` da linha e o saldo agregado — sem parcela nenhuma
   * no meio do caminho.
   *
   * @param quantidade - Quantidade demandada do produto acabado.
   * @param dataNecessidade - Data de necessidade (`YYYY-MM-DD`).
   * @param origemId - Documento de origem (UUID), que identifica a linha.
   * @returns Linhas do plano referentes ao componente.
   */
  async function runPlan(quantidade: number, dataNecessidade: string, origemId: string): Promise<any[]> {
    const plan = await api()
      .post('/api/mrp/plan')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        demands: [{
          item_id: ctx.acabado.itemId,
          quantidade,
          data_necessidade: dataNecessidade,
          origem: 'PEDIDO_VENDA',
          origem_id: origemId,
        }],
      });
    expectStatus(plan, 201, `mrp:plan:${quantidade}`);

    return (plan.body.data ?? []).filter((order: any) => String(order.item_id) === ctx.componente.itemId);
  }

  // ====================================================================
  // ETAPA 1 — Cadastro: produto acabado, componente e BOM 1:1
  // ====================================================================
  it('etapa 1: cadastra o produto acabado, o componente e a BOM ativa 1:1', async () => {
    ctx.acabado = await createPair('PAI', 'finished', 'PRODUTO_ACABADO');
    ctx.componente = await createPair('COMP', 'raw_material', 'MATERIA_PRIMA');
    ctx.dataDemandaCabe = futureDate(20);
    ctx.dataDemandaGrande = futureDate(30);
    ctx.origemCabe = randomUUID();
    ctx.origemGrande = randomUUID();

    const bom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.acabado.productId,
        revision: P,
        notes: 'Estrutura 1:1 minima para a prova do desconto de quarentena',
        items: [
          {
            component_product_id: ctx.componente.productId,
            quantity: QTD_POR_UNIDADE,
            unit: 'un',
            component_type: 'raw_material',
            is_critical: true,
          },
        ],
      });
    expectStatus(bom, 201, 'bom');
  });

  // ====================================================================
  // ETAPA 2 — Um saldo livre e um saldo retido, pelos caminhos reais
  // ====================================================================
  it('etapa 2: 45 entram livres e 60 entram por recebimento de compra, em QUARENTENA', async () => {
    // Entrada avulsa NAO cria lote (provado em `sale-lot-quality-gate`,
    // etapa 9): e o saldo que o MRP pode legitimamente contar.
    const entrada = await api()
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.componente.productId,
        type: 'in',
        quantity: SALDO_LIVRE,
        description: 'Saldo livre do componente (validacao do desconto de quarentena)',
      });
    expectStatus(entrada, 201, 'movimento:livre');

    const supplier = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        company_name: `${P} Fornecedor ${SUFFIX}`,
        cnpj: syntheticCnpj('01'),
        ie: 'ISENTO',
        email: `mrpquar-fornecedor-${SUFFIX}@evok.local`,
        // G11 (2026-08-11): declaracao obrigatoria no cadastro.
        is_foreign: false,
      });
    expectStatus(supplier, 201, 'fornecedor');

    const purchase = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        supplier_id: supplier.body.data.id,
        items: [{ product_id: ctx.componente.productId, quantity: SALDO_QUARENTENA, unit_price: CUSTO_UNITARIO }],
        notes: `${P} compra que gera o lote em quarentena`,
      });
    expectStatus(purchase, 201, 'pedido');
    const purchaseId = purchase.body.data.id;
    const purchaseItemId = purchase.body.data.items[0].id;

    // D-K: quem solicita nao aprova.
    for (const [status, statusToken] of [['approved', approver()], ['sent', token()]] as [string, string][]) {
      const changed = await api()
        .put(`/api/purchases/${purchaseId}/status`)
        .set('Authorization', `Bearer ${statusToken}`)
        .send({ status });
      expectStatus(changed, 200, `pedido:${status}`);
    }

    ctx.lotNumber = `${P}-LOTE-${SUFFIX}`;
    const received = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        invoice_number: `${P}-NF-${SUFFIX}`,
        items: [{ item_id: purchaseItemId, quantity: SALDO_QUARENTENA, lot_number: ctx.lotNumber }],
      });
    expectStatus(received, 200, 'recebimento');

    const lots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.componente.productId, status: 'quarantine', limit: 100 });
    expectStatus(lots, 200, 'lotes:quarentena');
    const lot = lots.body.data.find((row: any) => row.lot_number === ctx.lotNumber);
    expect(lot).toBeDefined();
    // G14: lote de compra NASCE bloqueado para consumo. Se este expect cair,
    // todo o resto da suite estaria medindo uma premissa falsa.
    expect(lot.status).toBe('quarantine');
    expect(Number(lot.quantity_available)).toBeCloseTo(SALDO_QUARENTENA, 4);
    ctx.lotId = lot.id;

    // O saldo FISICO ja inclui a quarentena — e exatamente por isso que o
    // desconto precisa existir do lado da leitura.
    const product = await api()
      .get(`/api/products/${ctx.componente.productId}`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(product, 200, 'produto:saldo');
    expect(Number(product.body.data.quantity)).toBeCloseTo(SALDO_FISICO, 4);
    expect(Number(product.body.data.reserved_quantity)).toBeCloseTo(0, 4);
  });

  // ====================================================================
  // ETAPA 3 — A prova principal: o que cabe no fisico nao cabe no livre
  // ====================================================================
  it('etapa 3: demanda de 100 (que caberia no saldo fisico) gera necessidade liquida de 60', async () => {
    const linhas = await runPlan(DEMANDA_CABE_NO_FISICO, ctx.dataDemandaCabe, ctx.origemCabe);

    // Este `expect` e o coracao da suite. Sem o desconto da quarentena o
    // disponivel seria 100 (105 fisico − 5 de seguranca), a necessidade
    // liquida daria ZERO, o motor filtraria a linha e o plano voltaria
    // VAZIO — falta de 60 pecas sem nenhum sinal no sistema.
    expect(linhas).toHaveLength(1);

    const linha = linhas[0];
    expect(Number(linha.necessidade_bruta)).toBeCloseTo(DEMANDA_CABE_NO_FISICO * QTD_POR_UNIDADE, 4);
    // 45 livres − 5 de seguranca. Os 60 em quarentena NAO entram.
    expect(Number(linha.estoque_disponivel)).toBeCloseTo(DISPONIVEL_COM_QUARENTENA, 4);
    expect(Number(linha.necessidade_liquida)).toBeCloseTo(
      DEMANDA_CABE_NO_FISICO - DISPONIVEL_COM_QUARENTENA,
      4,
    );
    // 60 e multiplo do lote minimo (5), entao planejada = liquida.
    expect(Number(linha.quantidade_planejada)).toBeCloseTo(
      DEMANDA_CABE_NO_FISICO - DISPONIVEL_COM_QUARENTENA,
      4,
    );
    expect(String(linha.origem_id)).toBe(ctx.origemCabe);
    ctx.ordemCabeId = String(linha.id);
  });

  // ====================================================================
  // ETAPA 4 — O desconto e de LEITURA: o banco continua com o saldo cheio
  // ====================================================================
  it('etapa 4: o saldo fisico e o saldo retido continuam integros no banco', async () => {
    const [produto] = await query(
      'SELECT quantity, reserved_quantity, min_quantity FROM products WHERE id = :productId',
      { productId: ctx.componente.productId },
    );
    // A decisao de projeto (`services/quarantineBalanceService.ts`) foi NAO
    // mexer no caminho de escrita de estoque: `products.quantity` continua
    // significando saldo fisico ("o material esta la, e verdade").
    expect(Number(produto.quantity)).toBeCloseTo(SALDO_FISICO, 4);
    expect(Number(produto.reserved_quantity)).toBeCloseTo(0, 4);
    expect(Number(produto.min_quantity)).toBeCloseTo(ESTOQUE_SEGURANCA, 4);

    const [retido] = await query(
      `SELECT COALESCE(SUM(quantity_available), 0) AS retido
         FROM lot_controls
        WHERE product_id = :productId
          AND status IN ('quarantine', 'blocked')`,
      { productId: ctx.componente.productId },
    );
    // Este e o numero que `quarantineBalanceService.sumWithheldByProduct`
    // calcula e que `listMrpInventoryPositions` subtrai. Ele NAO e exposto em
    // nenhum payload (`estoque_retido_qualidade` morre dentro do repositorio,
    // nao chega a `mrp_ordens_planejadas`), entao a unica verificacao direta
    // possivel e esta, contra a mesma fonte que o servico consulta.
    expect(Number(retido.retido)).toBeCloseTo(SALDO_QUARENTENA, 4);
  });

  // ====================================================================
  // ETAPA 5 — Demanda maior: a liquida carrega o retido inteiro
  // ====================================================================
  it('etapa 5: demanda de 160 gera necessidade liquida de 120 (o retido nao abate nada)', async () => {
    const linhas = await runPlan(DEMANDA_GRANDE, ctx.dataDemandaGrande, ctx.origemGrande);

    expect(linhas).toHaveLength(1);
    const linha = linhas[0];
    expect(Number(linha.necessidade_bruta)).toBeCloseTo(DEMANDA_GRANDE * QTD_POR_UNIDADE, 4);
    expect(Number(linha.estoque_disponivel)).toBeCloseTo(DISPONIVEL_COM_QUARENTENA, 4);
    expect(Number(linha.necessidade_liquida)).toBeCloseTo(DEMANDA_GRANDE - DISPONIVEL_COM_QUARENTENA, 4);
    // A linha tem de fechar sozinha na tela do planejador.
    expect(Number(linha.necessidade_bruta) - Number(linha.estoque_disponivel))
      .toBeCloseTo(Number(linha.necessidade_liquida), 4);

    ctx.ordemGrandeId = String(linha.id);
    ctx.liquidaGrandeAntes = Number(linha.necessidade_liquida);
  });

  // ====================================================================
  // ETAPA 6 — A Qualidade libera o lote (G7: inspecao aprovada primeiro)
  // ====================================================================
  it('etapa 6: a Qualidade inspeciona e libera o lote', async () => {
    // Sem inspecao registrada a liberacao e recusada (`reason:
    // 'no_inspection'`) — o gate G7 continua valendo aqui, e provoca-lo
    // primeiro evita que a etapa 7 passe por um caminho que nao existe.
    const semInspecao = await api()
      .post(`/api/inventory/lots/${ctx.lotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} tentativa de liberar sem inspecao` });
    expectStatus(semInspecao, 422, 'liberacao:semInspecao');
    expect(semInspecao.body.error.details.rule).toBe('G7');
    expect(semInspecao.body.error.details.reason).toBe('no_inspection');

    const inspection = await api()
      .post('/api/quality/inspections')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        lot_id: ctx.lotId,
        stage: 'incoming',
        acceptance_criteria: 'Conformidade dimensional e ausencia de avaria no transporte (validacao G7/MRP)',
        sampling_plan: 'Amostragem simples, nivel II',
        sample_size: 6,
        defects_found: 0,
        verdict: 'approved',
        notes: `${P} inspecao de recebimento`,
      });
    expectStatus(inspection, 201, 'inspecao');

    const release = await api()
      .post(`/api/inventory/lots/${ctx.lotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} liberado apos inspecao de recebimento` });
    expectStatus(release, 200, 'lote:liberado');
    expect(release.body.data.status).toBe('available');
    expect(Number(release.body.data.quantity_available)).toBeCloseTo(SALDO_QUARENTENA, 4);

    // Nada mudou no saldo fisico: a liberacao e um fato de QUALIDADE, nao de
    // estoque. O que muda e quanto disso o planejamento pode contar.
    const [{ retido }] = await query(
      `SELECT COALESCE(SUM(quantity_available), 0) AS retido
         FROM lot_controls
        WHERE product_id = :productId
          AND status IN ('quarantine', 'blocked')`,
      { productId: ctx.componente.productId },
    );
    expect(Number(retido)).toBeCloseTo(0, 4);
  });

  // ====================================================================
  // ETAPA 7 — Liberado, a necessidade cai exatamente o que estava retido
  // ====================================================================
  it('etapa 7: com o lote liberado, a necessidade liquida cai exatamente o saldo que estava retido', async () => {
    // MESMA demanda da etapa 5 (mesma origem e mesma data): o upsert do
    // repositorio atualiza a linha existente, entao da para comparar o
    // MESMO registro antes e depois.
    const linhas = await runPlan(DEMANDA_GRANDE, ctx.dataDemandaGrande, ctx.origemGrande);

    expect(linhas).toHaveLength(1);
    const linha = linhas[0];
    expect(String(linha.id)).toBe(ctx.ordemGrandeId);
    expect(Number(linha.estoque_disponivel)).toBeCloseTo(DISPONIVEL_APOS_LIBERACAO, 4);
    expect(Number(linha.necessidade_liquida)).toBeCloseTo(DEMANDA_GRANDE - DISPONIVEL_APOS_LIBERACAO, 4);
    // A queda e exatamente o saldo que estava em quarentena — nem mais (o
    // desconto nao pode ter tocado no estoque de seguranca), nem menos.
    expect(ctx.liquidaGrandeAntes - Number(linha.necessidade_liquida)).toBeCloseTo(SALDO_QUARENTENA, 4);

    // E a demanda da etapa 3, que so existia por causa da quarentena, some:
    // 100 pedidos contra 100 disponiveis = necessidade zero, e o motor
    // (`plannedQuantity > 0`) nao devolve linha nenhuma.
    //
    // ACHADO REGISTRADO (2026-08-12), fora do escopo desta suite: a ordem
    // planejada que a etapa 3 PERSISTIU continua em `mrp_ordens_planejadas`
    // dizendo "comprar 60", em `RASCUNHO`, e segue convertivel em requisicao
    // (`POST /api/mrp/planned-orders/convert`). O upsert de
    // `SequelizeMrpRepository` so toca as linhas que o motor devolveu, e o
    // motor nao devolve linha de necessidade zero — entao o plano cresce mas
    // nunca encolhe. E o espelho do CRITICO 1 da auditoria de 2026-08-11
    // (aquele comprava a MENOS; este compra a MAIS). Nao e afirmado aqui de
    // proposito: nem "some" (nao some) nem "fica" (fixar o comportamento
    // errado num teste o transforma em contrato). Ver
    // `docs/governance/TODO.md`, secao de 2026-08-12.
    const linhasCabe = await runPlan(DEMANDA_CABE_NO_FISICO, ctx.dataDemandaCabe, ctx.origemCabe);
    expect(linhasCabe).toHaveLength(0);
  });
});
