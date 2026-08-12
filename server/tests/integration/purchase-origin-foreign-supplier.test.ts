/**
 * G11 — a origem do pedido de compra para de depender de um default permissivo.
 *
 * ## A brecha (auditoria de 2026-08-11)
 *
 * A alçada de compra é por ORIGEM: importação exige a diretoria em **qualquer
 * valor**, nacional só acima de R$ 500 mil. Quem decide a origem é
 * `resolvePurchaseOrigin(purchase.origin, supplier.is_foreign)` — e as duas
 * fontes tinham o mesmo ponto cego:
 *
 * - `suppliers.is_foreign` é `DEFAULT false` no banco **e opcional no
 *   validador** da API. Cadastrar um fornecedor estrangeiro sem marcar o campo
 *   (o caminho de menor esforço, e o único disponível para quem usa a API
 *   direto) produz um fornecedor de importação gravado como nacional;
 * - a partir daí, todo pedido para ele resolve `origin = 'national'` e passa
 *   direto por baixo do teto — a alçada de importação simplesmente não
 *   acontece, sem nenhum erro em lugar nenhum.
 *
 * O inverso também ficava incoerente: era possível declarar `origin='import'`
 * num pedido cujo fornecedor está cadastrado como nacional. O pedido subia
 * para a diretoria (lado seguro), mas o cadastro seguia mentindo, e ninguém
 * era avisado de qual dos dois estava errado.
 *
 * ## O que esta suíte prova
 *
 * | # | Pergunta | Etapa |
 * |---|---|---|
 * | 1 | `is_foreign` virou declaração obrigatória no cadastro? | 1 |
 * | 2 | pedido `import` com fornecedor nacional é recusado (422)? | 3 |
 * | 3 | fornecedor estrangeiro + `origin='national'` vira importação? | 4 |
 * | 4 | e aí a alçada exige diretoria mesmo em valor baixo? | 4 |
 * | 5 | aprovar sem a alçada registrada é recusado? | 5 |
 *
 * O item 3 é o coração: quem monta o pedido **não consegue rebaixar** um
 * fornecedor estrangeiro para nacional, porque a origem é reescrita a partir
 * do cadastro na própria criação.
 *
 * @module tests/integration/purchase-origin-foreign-supplier
 */
import { api, approverToken, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/** Prefixo/sufixo de todo registro criado por esta suite. */
const P = 'G11ORI';
const SUFFIX = String(Date.now()).slice(-8);

describeIntegration('G11 — origem do pedido x cadastro do fornecedor', () => {
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
   * Gera um CNPJ sintetico **com digitos verificadores validos**, unico por
   * execucao — `CreateSupplierUseCase` valida o documento de verdade
   * (`Validators.isValidCNPJ`), entao numero aleatorio de 14 digitos e
   * recusado antes de chegar a regra que este teste exercita.
   *
   * @param seed - Sufixo numerico curto que diferencia os fornecedores.
   * @returns CNPJ de 14 digitos com DV calculado.
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

  // ====================================================================
  // ETAPA 1 — `is_foreign` deixou de ser opcional no cadastro
  // ====================================================================
  it('etapa 1: cadastro de fornecedor exige declarar is_foreign', async () => {
    const semDeclaracao = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        company_name: `${P} Sem Declaracao ${SUFFIX}`,
        cnpj: syntheticCnpj('01'),
        email: `sem-declaracao-${SUFFIX}@evok.local`,
      });
    expectStatus(semDeclaracao, 400, 'fornecedor:semDeclaracao');
    // O campo aparece nomeado no erro — quem integra precisa saber QUAL campo
    // falta, nao so que o payload e invalido.
    expect(JSON.stringify(semDeclaracao.body)).toContain('is_foreign');
  });

  // ====================================================================
  // ETAPA 2 — Dois fornecedores: um nacional, um estrangeiro
  // ====================================================================
  it('etapa 2: cadastra fornecedor nacional e fornecedor estrangeiro', async () => {
    const nacional = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        company_name: `${P} Nacional ${SUFFIX}`,
        cnpj: syntheticCnpj('02'),
        email: `nacional-${SUFFIX}@evok.local`,
        is_foreign: false,
      });
    expectStatus(nacional, 201, 'fornecedor:nacional');
    expect(nacional.body.data.is_foreign).toBe(false);
    ctx.nacionalId = nacional.body.data.id;

    const estrangeiro = await api()
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        company_name: `${P} Estrangeiro ${SUFFIX}`,
        cnpj: syntheticCnpj('03'),
        email: `estrangeiro-${SUFFIX}@evok.local`,
        is_foreign: true,
      });
    expectStatus(estrangeiro, 201, 'fornecedor:estrangeiro');
    expect(estrangeiro.body.data.is_foreign).toBe(true);
    ctx.estrangeiroId = estrangeiro.body.data.id;
  });

  // ====================================================================
  // ETAPA 3 — `origin='import'` com fornecedor nacional e recusado
  // ====================================================================
  it('etapa 3: pedido de importacao com fornecedor nacional e recusado', async () => {
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const pedido = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        supplier_id: ctx.nacionalId,
        origin: 'import',
        items: [{ product_id: productId, quantity: 1, unit_price: 100 }],
      });
    expectStatus(pedido, 422, 'pedido:importComNacional');
    expect(pedido.body.error.details.rule).toBe('G11-ORIGIN-SUPPLIER-MISMATCH');
    expect(pedido.body.error.details.supplier_id).toBe(ctx.nacionalId);
  });

  // ====================================================================
  // ETAPA 4 — Fornecedor estrangeiro nunca passa como nacional
  // ====================================================================
  it('etapa 4: fornecedor estrangeiro declarado como nacional vira importacao na gravacao', async () => {
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const pedido = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        supplier_id: ctx.estrangeiroId,
        // A declaracao do comprador diz "nacional" — o cadastro diz o
        // contrario, e e o cadastro que vale.
        origin: 'national',
        items: [{ product_id: productId, quantity: 1, unit_price: 100 }],
      });
    expectStatus(pedido, 201, 'pedido:estrangeiro');
    expect(pedido.body.data.origin).toBe('import');
    ctx.pedidoImportacaoId = pedido.body.data.id;

    // Valor de R$ 100 — muito abaixo do teto de R$ 500 mil. Se a origem
    // tivesse ficado 'national', a alcada nao exigiria ninguem.
    const alcada = await api()
      .get(`/api/purchases/${ctx.pedidoImportacaoId}/approvals`)
      .set('Authorization', `Bearer ${token()}`);
    expectStatus(alcada, 200, 'pedido:alcada');
    expect(alcada.body.data.origin).toBe('import');
    expect(alcada.body.data.origin_source).toBe('supplier');
    expect(alcada.body.data.required_roles).toContain('diretor');
    expect(alcada.body.data.approval_complete).toBe(false);
  });

  // ====================================================================
  // ETAPA 5 — Sem a alcada registrada, o pedido nao e aprovado
  // ====================================================================
  it('etapa 5: aprovar o pedido de importacao exige a alcada da diretoria', async () => {
    const semAlcada = await api()
      .put(`/api/purchases/${ctx.pedidoImportacaoId}/status`)
      .set('Authorization', `Bearer ${approverToken()}`)
      .send({ status: 'approved' });
    expectStatus(semAlcada, 422, 'pedido:aprovaSemAlcada');
    expect(semAlcada.body.error.details.rule).toBe('G11');
    expect(semAlcada.body.error.details.origin).toBe('import');

    // Registrada a alcada (por quem NAO montou o pedido — D-K), aprova.
    const alcada = await api()
      .post(`/api/purchases/${ctx.pedidoImportacaoId}/approve`)
      .set('Authorization', `Bearer ${approverToken()}`)
      .send({});
    expectStatus(alcada, 201, 'pedido:registraAlcada');
    expect(alcada.body.data.approver_role).toBe('diretor');

    const aprovado = await api()
      .put(`/api/purchases/${ctx.pedidoImportacaoId}/status`)
      .set('Authorization', `Bearer ${approverToken()}`)
      .send({ status: 'approved' });
    expectStatus(aprovado, 200, 'pedido:aprovado');
    expect(aprovado.body.data.status).toBe('approved');
  });
});
