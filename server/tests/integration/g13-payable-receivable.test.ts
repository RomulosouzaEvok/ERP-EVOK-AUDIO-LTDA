/**
 * G13 — QUANDO NASCE O PASSIVO E QUANDO NASCE O ATIVO, contra PostgreSQL real.
 *
 * ## O buraco que esta suite fecha
 *
 * O gap G13 (`2648686`, 2026-08-10, decisao D-A do dono) moveu os dois
 * lancamentos financeiros da cadeia:
 *
 * | Lancamento | Nascia em | Passou a nascer em | Norma |
 * |---|---|---|---|
 * | `accounts_payable` | aprovacao do pedido de compra | **recebimento** do material | CPC 00 (R2) 4.56 / 4.58 |
 * | `accounts_receivable` | confirmacao da venda | **autorizacao da NF-e** | CPC 47 itens 31/38/108 |
 *
 * Ate 2026-08-11 esse comportamento **nunca tinha sido executado contra o
 * banco**: as suites que cobrem os dois caminhos usam repositorio dublê, e
 * dublê nao tem coluna `NOT NULL`, nem `ENUM`, nem `DEFAULT`. As quatro
 * rodadas de defeito silencioso do projeto vieram exatamente dessa diferenca
 * (`docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`).
 *
 * ## O que e provado aqui
 *
 * | # | Pergunta | Etapa |
 * |---|---|---|
 * | 1 | pedido APROVADO (e ate `sent`) nao gera passivo nenhum? | 3 |
 * | 2 | o recebimento gera a conta a pagar, `pending` e nao baixada? | 4 |
 * | 3 | recebeu metade, deve a metade (valor por ENTREGA, nao pelo pedido)? | 4 e 5 |
 * | 4 | quem recebe nao aprova pagamento (`approved_by IS NULL`)? | 4 |
 * | 5 | venda CONFIRMADA nao gera recebivel? | 7 |
 * | 6 | a NF-e autorizada gera as parcelas, todas `pending`? | 8 |
 * | 7 | a soma das parcelas e exatamente o valor da nota? | 8 |
 *
 * ## Como as afirmacoes sao verificadas
 *
 * Cada asserto financeiro e feito **duas vezes**: pela API (o que o sistema
 * responde) e por **SQL cru** contra `accounts_payable`/`accounts_receivable`
 * (o que o Postgres realmente guardou). O SQL nomeia as colunas uma a uma de
 * proposito — e assim que um drift de coluna/enum/default aparece: a query
 * quebra, em vez de o teste passar lendo um objeto que so existe na memoria
 * do Node.
 *
 * ## Convencoes
 *
 * Cadeia real, sem escrita direta no banco em nenhum caminho de negocio:
 * fornecedor -> requisicao aprovada por um SEGUNDO usuario (D-K) -> pedido
 * aprovado por ele -> recebimento (lote em quarentena, G14) -> inspecao +
 * liberacao (G7) -> transferencia INSUMOS->ACABADOS -> venda -> NF-e (gate
 * D-L satisfeito com lote liberado). Todo registro leva o sufixo
 * `G13-<timestamp>`.
 *
 * @module tests/integration/g13-payable-receivable
 */
import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

// Cada `it` desta suite encadeia varias chamadas HTTP contra a API real (a
// etapa 6 sozinha faz um ciclo inteiro de compra + qualidade + transferencia).
// O default de 5s do Jest e dimensionado para teste unitario; aqui ele
// transforma lentidao de banco em "falha" e esconde o resultado verdadeiro.
jest.setTimeout(60_000);

/** Prefixo de todo registro criado por esta suite. */
const P = 'G13';
const SUFFIX = String(Date.now()).slice(-8);

/** Quantidade comprada do insumo. */
const INSUMO_QTD = 100;
/** Preco unitario do insumo (catalogo item x fornecedor). */
const INSUMO_PRECO = 7.5;
/** Primeira entrega: 60 de 100 — e o que prova "recebeu metade, deve a metade". */
const ENTREGA_1_QTD = 60;
/** Segunda entrega: o saldo. */
const ENTREGA_2_QTD = INSUMO_QTD - ENTREGA_1_QTD;
/** Valor esperado da conta a pagar da 1a entrega. */
const ENTREGA_1_VALOR = ENTREGA_1_QTD * INSUMO_PRECO;
/** Valor esperado da conta a pagar da 2a entrega. */
const ENTREGA_2_VALOR = ENTREGA_2_QTD * INSUMO_PRECO;

/** Quantidade do produto de revenda comprada (e depois vendida). */
const REVENDA_QTD = 5;
/** Custo unitario de compra do produto de revenda. */
const REVENDA_CUSTO = 100;
/** Preco unitario de venda. */
const VENDA_PRECO = 250;
/** Numero de parcelas da venda — 1250 / 3 nao divide exato de proposito. */
const VENDA_PARCELAS = 3;
/** Valor total da nota (nao ha desconto). */
const VENDA_TOTAL = REVENDA_QTD * VENDA_PRECO;

describeIntegration('G13 — conta a pagar nasce no recebimento, conta a receber na NF-e', () => {
  const ctx: Record<string, any> = {};

  /** @returns Token do usuario que opera a cadeia (solicita, converte, recebe, vende). */
  function token(): string {
    return authToken();
  }

  /** @returns Token do SEGUNDO administrador, que aprova (segregacao D-K). */
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
   * Executa SQL cru contra o mesmo PostgreSQL que a API usa.
   *
   * A leitura por SQL (em vez de pelo model) e deliberada: e o unico jeito de
   * um teste perceber que uma coluna mudou de nome, sumiu ou ganhou um
   * `DEFAULT` diferente do que o model declara.
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
   * Contas a pagar de um pedido de compra, direto do banco.
   *
   * @param purchaseId - Pedido de compra.
   * @returns Linhas de `accounts_payable`, mais antigas primeiro.
   */
  async function payablesOf(purchaseId: number): Promise<any[]> {
    return query(
      `SELECT id, description, amount, amount_paid, due_date, payment_date, status, category,
              supplier_id, purchase_id, invoice_number, approved_by, approval_date, cost_center_id
         FROM accounts_payable
        WHERE purchase_id = :purchaseId
        ORDER BY id ASC`,
      { purchaseId },
    );
  }

  /**
   * Contas a receber de uma venda, direto do banco.
   *
   * @param saleId - Venda.
   * @returns Linhas de `accounts_receivable`, na ordem das parcelas.
   */
  async function receivablesOf(saleId: number): Promise<any[]> {
    return query(
      `SELECT id, sale_id, customer_id, installment, amount, amount_paid, due_date, payment_date,
              status, payment_method, invoice_number, collection_status
         FROM accounts_receivable
        WHERE sale_id = :saleId
        ORDER BY installment ASC`,
      { saleId },
    );
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
   * Soma dias a uma data `YYYY-MM-DD` pela MESMA aritmetica de
   * `purchasePayableRules.resolvePayableDueDate` (milissegundos sobre a data
   * interpretada em UTC) — se o codigo mudar de regra, a diferenca aparece.
   *
   * @param isoDate - Data base em `YYYY-MM-DD`.
   * @param days - Dias a somar.
   * @returns Data resultante em `YYYY-MM-DD`.
   */
  function addDays(isoDate: string, days: number): string {
    return new Date(new Date(isoDate).getTime() + days * 86_400_000).toISOString().slice(0, 10);
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
   * Gera um CPF com checksum valido (o cadastro de cliente valida o digito).
   *
   * @returns CPF de 11 digitos.
   */
  function generateValidCpf(): string {
    /**
     * Digito verificador de CPF.
     *
     * @param digits - Digitos ja conhecidos.
     * @returns Digito calculado.
     */
    const checkDigit = (digits: number[]): number => {
      let sum = 0;
      let weight = digits.length + 1;
      for (const digit of digits) {
        sum += digit * weight;
        weight -= 1;
      }
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    const d1 = checkDigit(base);
    const d2 = checkDigit([...base, d1]);
    return [...base, d1, d2].join('');
  }

  /**
   * Campos fiscais/tecnicos minimos exigidos pelo cadastro legado de produto.
   *
   * @returns Defaults para `POST /api/products`.
   */
  function productDefaults(): Record<string, unknown> {
    return {
      ncm: '85182100',
      cest: '2106400',
      weight: 1,
      unit: 'un',
      lead_time: 1,
      location: P,
      revision: '00',
    };
  }

  // ====================================================================
  // ETAPA 1 — Cadastro do fornecedor, do insumo e do catalogo
  // ====================================================================
  it('etapa 1: cadastra fornecedor, insumo (products + items) e o catalogo item x fornecedor', async () => {
    const supplier = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        company_name: `${P} Fornecedor ${SUFFIX}`,
        trade_name: `${P} Fornecedor`,
        cnpj: syntheticCnpj('01'),
        ie: 'ISENTO',
        phone: '(11) 4000-0000',
        email: `g13-fornecedor-${SUFFIX}@evok.local`,
        payment_terms: '30 dias',
        // G11 (2026-08-11): declaracao obrigatoria. Nacional, para a alcada
        // deste pedido nao exigir a diretoria e o teste medir o G13, nao o G11.
        is_foreign: false,
      });
    expectStatus(supplier, 201, 'fornecedor');
    ctx.supplierId = supplier.body.data.id;

    const code = `${P}-MP-${SUFFIX}`;
    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Insumo ${SUFFIX}`,
        code,
        description: 'Insumo da validacao do G13 (conta a pagar no recebimento)',
        price: 12,
        cost_price: INSUMO_PRECO,
        quantity: 0,
        product_type: 'raw_material',
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(product, 201, 'produto:insumo');
    ctx.insumoProductId = product.body.data.id;

    const item = await api()
      .post('/api/items')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        codigo: code,
        descricao: `${P} Insumo ${SUFFIX}`,
        tipo: 'MATERIA_PRIMA',
        unidade: 'un',
        status: 'ATIVO',
        estoque_atual: 0,
        custo_padrao: INSUMO_PRECO,
        lead_time_dias: 1,
      });
    expectStatus(item, 201, 'item:insumo');
    ctx.insumoItemId = item.body.data.id;

    const link = await api()
      .post(`/api/items/${ctx.insumoItemId}/suppliers`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        supplier_id: ctx.supplierId,
        unit_price: INSUMO_PRECO,
        currency: 'BRL',
        lead_time_days: 5,
        preferred: true,
      });
    expectStatus(link, 201, 'catalogo:item-fornecedor');
  });

  // ====================================================================
  // ETAPA 2 — Requisicao aprovada (por quem NAO a solicitou)
  // ====================================================================
  it('etapa 2: cria a requisicao de compra e aprova com o segundo usuario (D-K)', async () => {
    const created = await api()
      .post('/api/purchase-requisitions')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        origin: 'manual',
        priority: 'normal',
        notes: `${P} requisicao da validacao do G13`,
        items: [
          {
            item_id: ctx.insumoItemId,
            quantity: INSUMO_QTD,
            unit: 'un',
            required_date: futureDate(15),
            unit_price_estimated: INSUMO_PRECO,
          },
        ],
      });
    expectStatus(created, 201, 'requisicao');
    ctx.requisitionId = created.body.data.id;
    expect(created.body.data.status).toBe('pending');

    const approved = await api()
      .patch(`/api/purchase-requisitions/${ctx.requisitionId}/status`)
      .set('Authorization', `Bearer ${approver()}`)
      .send({ status: 'approved' });
    expectStatus(approved, 200, 'requisicao:aprovada');
    expect(approved.body.data.status).toBe('approved');
  });

  // ====================================================================
  // ETAPA 3 — A primeira prova: pedido aprovado NAO e passivo
  // ====================================================================
  it('etapa 3: pedido aprovado e enviado nao gera NENHUMA conta a pagar (CPC 00 R2 4.56)', async () => {
    const converted = await api()
      .post(`/api/purchase-requisitions/${ctx.requisitionId}/convert`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} conversao da requisicao` });
    expectStatus(converted, 201, 'requisicao:convertida');
    expect(converted.body.data.purchase_orders).toHaveLength(1);

    const purchase = converted.body.data.purchase_orders[0];
    ctx.purchaseId = purchase.id;
    ctx.purchaseItemId = purchase.items[0].id;
    // O preco vem do catalogo item x fornecedor. Se mudar, os valores
    // esperados das contas a pagar mudam junto — melhor falhar aqui, com o
    // motivo na cara, do que num `toBeCloseTo` de valor la na frente.
    expect(Number(purchase.items[0].unit_price)).toBeCloseTo(INSUMO_PRECO, 4);
    expect(Number(purchase.total_amount)).toBeCloseTo(INSUMO_QTD * INSUMO_PRECO, 2);

    // Contrato executorio: nenhuma das partes cumpriu. Antes do G13 a AP
    // nascia exatamente aqui, com o valor do pedido INTEIRO.
    const aprovado = await api()
      .put(`/api/purchases/${ctx.purchaseId}/status`)
      .set('Authorization', `Bearer ${approver()}`)
      .send({ status: 'approved' });
    expectStatus(aprovado, 200, 'pedido:aprovado');
    expect(aprovado.body.data.status).toBe('approved');
    expect(await payablesOf(ctx.purchaseId)).toHaveLength(0);

    const enviado = await api()
      .put(`/api/purchases/${ctx.purchaseId}/status`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'sent' });
    expectStatus(enviado, 200, 'pedido:enviado');
    // Enviar tambem nao e cumprimento do fornecedor.
    expect(await payablesOf(ctx.purchaseId)).toHaveLength(0);
  });

  // ====================================================================
  // ETAPA 4 — O passivo nasce na ENTREGA, no valor da entrega
  // ====================================================================
  it('etapa 4: o recebimento parcial gera UMA conta a pagar, pendente, no valor recebido', async () => {
    const invoiceDate = futureDate(0);
    ctx.entrega1Nf = `${P}-NF1-${SUFFIX}`;

    const received = await api()
      .post(`/api/purchases/${ctx.purchaseId}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        invoice_number: ctx.entrega1Nf,
        invoice_date: invoiceDate,
        items: [{
          item_id: ctx.purchaseItemId,
          quantity: ENTREGA_1_QTD,
          lot_number: `${P}-LOTE1-${SUFFIX}`,
        }],
      });
    expectStatus(received, 200, 'recebimento:1');
    expect(received.body.data.status).toBe('partial');

    // A API declara o passivo que acabou de nascer...
    expect(received.body.payable_skip_reason).toBeNull();
    expect(received.body.account_payable).not.toBeNull();
    expect(Number(received.body.account_payable.amount)).toBeCloseTo(ENTREGA_1_VALOR, 2);

    // ...e o banco confirma, coluna a coluna.
    const payables = await payablesOf(ctx.purchaseId);
    expect(payables).toHaveLength(1);
    const payable = payables[0];
    expect(Number(payable.id)).toBe(Number(received.body.account_payable.id));
    expect(Number(payable.amount)).toBeCloseTo(ENTREGA_1_VALOR, 2);
    // Recebeu 60 de 100: o passivo e de 60, nunca o pedido inteiro (750).
    expect(Number(payable.amount)).toBeLessThan(INSUMO_QTD * INSUMO_PRECO);
    expect(payable.status).toBe('pending');
    expect(payable.payment_date).toBeNull();
    expect(Number(payable.amount_paid)).toBeCloseTo(0, 2);
    // Segregacao de funcoes: quem RECEBEU nao aprova o pagamento. Preencher
    // `approved_by` com o recebedor destruiria o three-way match.
    expect(payable.approved_by).toBeNull();
    expect(payable.approval_date).toBeNull();
    // Rastro fiscal: a conta aponta para o pedido, o fornecedor e a NF.
    expect(Number(payable.purchase_id)).toBe(Number(ctx.purchaseId));
    expect(Number(payable.supplier_id)).toBe(Number(ctx.supplierId));
    expect(payable.invoice_number).toBe(ctx.entrega1Nf);
    expect(payable.category).toBe('Fornecedores');
    // Sem `due_date` informado, o vencimento e a NF do fornecedor + 30 dias.
    expect(String(payable.due_date).slice(0, 10)).toBe(addDays(invoiceDate, 30));
  });

  // ====================================================================
  // ETAPA 5 — Segunda entrega: segundo passivo, e a soma fecha o pedido
  // ====================================================================
  it('etapa 5: a segunda entrega gera a segunda conta a pagar e a soma fecha o valor do pedido', async () => {
    const dueDate = futureDate(45);
    ctx.entrega2Nf = `${P}-NF2-${SUFFIX}`;

    const received = await api()
      .post(`/api/purchases/${ctx.purchaseId}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        invoice_number: ctx.entrega2Nf,
        // Vencimento negociado prevalece sobre qualquer calculo.
        due_date: dueDate,
        items: [{
          item_id: ctx.purchaseItemId,
          quantity: ENTREGA_2_QTD,
          lot_number: `${P}-LOTE2-${SUFFIX}`,
        }],
      });
    expectStatus(received, 200, 'recebimento:2');
    expect(received.body.data.status).toBe('received');

    const payables = await payablesOf(ctx.purchaseId);
    expect(payables).toHaveLength(2);

    const segunda = payables[1];
    expect(Number(segunda.amount)).toBeCloseTo(ENTREGA_2_VALOR, 2);
    expect(segunda.status).toBe('pending');
    expect(segunda.payment_date).toBeNull();
    expect(segunda.approved_by).toBeNull();
    expect(segunda.invoice_number).toBe(ctx.entrega2Nf);
    expect(String(segunda.due_date).slice(0, 10)).toBe(dueDate);

    // Duas entregas, duas notas, dois passivos — e a soma e o pedido inteiro.
    const total = payables.reduce((sum: number, row: any) => sum + Number(row.amount), 0);
    expect(total).toBeCloseTo(INSUMO_QTD * INSUMO_PRECO, 2);
    // Nenhuma parcela nasce baixada.
    expect(payables.every((row: any) => row.status === 'pending' && row.payment_date === null)).toBe(true);
  });

  // ====================================================================
  // ETAPA 6 — Cenario da venda: produto de revenda com LOTE LIBERADO (D-L)
  // ====================================================================
  it('etapa 6: monta o produto de revenda com lote liberado pela Qualidade e pronto para expedir', async () => {
    const code = `${P}-PA-${SUFFIX}`;
    const product = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Alto-falante de revenda ${SUFFIX}`,
        code,
        description: 'Produto acabado da validacao do G13 (conta a receber na NF-e)',
        price: VENDA_PRECO,
        cost_price: REVENDA_CUSTO,
        quantity: 0,
        product_type: 'finished',
        status: 'active',
        ...productDefaults(),
      });
    expectStatus(product, 201, 'produto:revenda');
    ctx.revendaProductId = product.body.data.id;

    // Compra avulsa (sem requisicao): o caminho da requisicao ja foi provado
    // na etapa 2; aqui o que interessa e ter LOTE, para o gate D-L da NF-e.
    const purchase = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        supplier_id: ctx.supplierId,
        items: [{ product_id: ctx.revendaProductId, quantity: REVENDA_QTD, unit_price: REVENDA_CUSTO }],
        notes: `${P} compra do produto de revenda`,
      });
    expectStatus(purchase, 201, 'pedido:revenda');
    const revendaPurchaseId = purchase.body.data.id;
    const revendaItemId = purchase.body.data.items[0].id;

    for (const [status, statusToken] of [['approved', approver()], ['sent', token()]] as [string, string][]) {
      const changed = await api()
        .put(`/api/purchases/${revendaPurchaseId}/status`)
        .set('Authorization', `Bearer ${statusToken}`)
        .send({ status });
      expectStatus(changed, 200, `pedido:revenda:${status}`);
    }

    const lotNumber = `${P}-LOTE-PA-${SUFFIX}`;
    const received = await api()
      .post(`/api/purchases/${revendaPurchaseId}/receive`)
      .set('Authorization', `Bearer ${token()}`)
      .send({
        invoice_number: `${P}-NF-PA-${SUFFIX}`,
        items: [{ item_id: revendaItemId, quantity: REVENDA_QTD, lot_number: lotNumber }],
      });
    expectStatus(received, 200, 'recebimento:revenda');

    // O mesmo G13 vale para esta compra — util como segunda amostra do
    // comportamento, com um pedido de origem diferente (avulso).
    const revendaPayables = await payablesOf(revendaPurchaseId);
    expect(revendaPayables).toHaveLength(1);
    expect(Number(revendaPayables[0].amount)).toBeCloseTo(REVENDA_QTD * REVENDA_CUSTO, 2);
    expect(revendaPayables[0].status).toBe('pending');

    const lots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${token()}`)
      .query({ product_id: ctx.revendaProductId, status: 'quarantine', limit: 100 });
    expectStatus(lots, 200, 'lotes:quarentena');
    const lot = lots.body.data.find((row: any) => row.lot_number === lotNumber);
    expect(lot).toBeDefined();
    ctx.revendaLotId = lot.id;

    const inspection = await api()
      .post('/api/quality/inspections')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        lot_id: ctx.revendaLotId,
        stage: 'incoming',
        acceptance_criteria: 'Conformidade visual e resposta de impedancia dentro da faixa (validacao G13)',
        sampling_plan: 'Amostragem simples, nivel II',
        sample_size: 2,
        defects_found: 0,
        verdict: 'approved',
        notes: `${P} inspecao de recebimento do produto de revenda`,
      });
    expectStatus(inspection, 201, 'inspecao');

    const release = await api()
      .post(`/api/inventory/lots/${ctx.revendaLotId}/release`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ notes: `${P} liberado apos inspecao` });
    expectStatus(release, 200, 'lote:liberado');
    expect(release.body.data.status).toBe('available');

    // O recebimento cai em INSUMOS; o faturamento baixa de ACABADOS. Nao ha
    // roteamento automatico entre depositos (BUSINESS_RULES §12).
    const transfer = await api()
      .post('/api/inventory/transfers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        product_id: ctx.revendaProductId,
        from_warehouse_code: 'INSUMOS',
        to_warehouse_code: 'ACABADOS',
        quantity: REVENDA_QTD,
        reason: 'Produto de revenda disponibilizado para expedicao (validacao G13)',
      });
    expectStatus(transfer, 201, 'transferencia');

    const approvedTransfer = await api()
      .put(`/api/inventory/transfers/${transfer.body.data.id}/approve`)
      .set('Authorization', `Bearer ${approver()}`)
      .send({});
    expectStatus(approvedTransfer, 200, 'transferencia:aprovada');
  });

  // ====================================================================
  // ETAPA 7 — A segunda prova: venda confirmada NAO e recebivel
  // ====================================================================
  it('etapa 7: venda confirmada nao gera NENHUMA conta a receber (CPC 47 item 108)', async () => {
    const client = await api()
      .post('/api/clients')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        name: `${P} Cliente ${SUFFIX}`,
        cpf_cnpj: generateValidCpf(),
        state: 'SP',
        city: 'Sao Paulo',
        email: `g13-cliente-${SUFFIX}@evok.local`,
      });
    expectStatus(client, 201, 'cliente');
    ctx.clientId = client.body.data.id;

    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        customer_id: ctx.clientId,
        items: [{ product_id: ctx.revendaProductId, quantity: REVENDA_QTD, unit_price: VENDA_PRECO }],
        payment_method: 'boleto',
        installments: VENDA_PARCELAS,
        status: 'confirmed',
        notes: `${P} venda da validacao do G13`,
      });
    expectStatus(sale, 201, 'venda');
    ctx.saleId = sale.body.data.id;
    expect(sale.body.data.status).toBe('confirmed');
    expect(Number(sale.body.data.total_amount)).toBeCloseTo(VENDA_TOTAL, 2);

    // Antes do G13, confirmar criava as parcelas — e a venda a vista nascia
    // `paid`, sem um centavo ter entrado. O direito ainda e CONDICIONAL ao
    // faturamento: nao e recebivel.
    expect(await receivablesOf(ctx.saleId)).toHaveLength(0);
  });

  // ====================================================================
  // ETAPA 8 — O ativo nasce na NF-e autorizada
  // ====================================================================
  it('etapa 8: a NF-e autorizada cria as parcelas, todas pendentes, somando o valor da nota', async () => {
    const issued = await api()
      .post(`/api/sales/${ctx.saleId}/nfe`)
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expectStatus(issued, 202, 'nfe');
    expect(issued.body.data.nfe_status).toBe('authorized');
    expect(issued.body.data.status).toBe('invoiced');
    const nfeNumber = String(issued.body.data.nfe_number);

    const receivables = await receivablesOf(ctx.saleId);
    expect(receivables).toHaveLength(VENDA_PARCELAS);

    // A soma das parcelas e EXATAMENTE o valor da nota — a ultima parcela
    // absorve o resto da divisao em centavos (1250 / 3).
    const total = receivables.reduce((sum: number, row: any) => sum + Number(row.amount), 0);
    expect(total).toBeCloseTo(VENDA_TOTAL, 2);
    expect(receivables.map((row: any) => Number(row.installment))).toEqual([1, 2, 3]);

    for (const parcel of receivables) {
      // Nenhuma parcela nasce baixada: a baixa e evento proprio da Tesouraria
      // (`PUT /api/finance/receivable/:id/pay`), com valor, data e usuario.
      expect(parcel.status).toBe('pending');
      expect(parcel.payment_date).toBeNull();
      expect(Number(parcel.amount_paid)).toBeCloseTo(0, 2);
      expect(Number(parcel.amount)).toBeGreaterThan(0);
      expect(Number(parcel.customer_id)).toBe(Number(ctx.clientId));
      expect(Number(parcel.sale_id)).toBe(Number(ctx.saleId));
      // A parcela carrega o numero da nota que a originou — e o que separa o
      // dado novo do legado criado na confirmacao (que nasceu sem nota).
      expect(String(parcel.invoice_number)).toBe(nfeNumber);
      expect(parcel.collection_status).toBe('normal');
      expect(parcel.due_date).toBeTruthy();
    }
  });
});
