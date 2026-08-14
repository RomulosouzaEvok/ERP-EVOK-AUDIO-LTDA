/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * Cluster: comercial-financeiro. Alvo D do lote de caracterização.
 *
 * CORREÇÃO EMPÍRICA (execução central da suíte characterization, ver nota de
 * divergência abaixo): a primeira versão deste arquivo congelava, por
 * leitura estática, a premissa de que `CancelSaleNfeUseCase` NÃO reverte
 * `sale.status`. A execução real (`node scripts/run-api-suite.cjs
 * characterization`) refutou essa premissa — `sale.status` REGRIDE. Corrigido
 * aqui para congelar o comportamento observado, com evidência > documento
 * (Regra 21).
 *
 * ONDE O REVERT ACONTECE (leitura confirmada,
 * `server/src/modules/fiscal/application/use-cases/CancelSaleNfeUseCase.ts`):
 *   - `:127-135` — dentro de `execute`, quando a emissão cancelada estava de
 *     fato `authorized` (`wasAuthorized`), chama `restoreCanceledInvoice`.
 *   - `:203` — `willRegress = sale.status === 'invoiced' || sale.status ===
 *     'partially_invoiced'` (calculado ANTES de qualquer mutação — `shipped`
 *     fica de fora de propósito, é terminal).
 *   - `:221-223` — `if (willRegress) { sale.status = anyStillInvoiced ?
 *     'partially_invoiced' : 'confirmed'; }`. Para uma venda de 1 item
 *     totalmente faturado (o caso deste teste), `anyStillInvoiced` é `false`
 *     após decrementar `invoiced_quantity` (`:188-196`), logo
 *     `sale.status` vira `'confirmed'`, não fica em `'invoiced'`.
 *
 * Comportamento congelado (real, pós-D-M 2026-08-10):
 *
 *  1. `shipped` é terminal: uma venda já `shipped` não pode ser cancelada
 *     (`ChangeSaleStatusUseCase.ts:143-150`, mensagem 422 dedicada "já foi
 *     expedida") nem transicionar para nenhum outro status
 *     (`VALID_TRANSITIONS.shipped = []`, linhas 12-30). Este trecho NÃO foi
 *     afetado pela divergência acima (nenhum cancelamento de NF-e envolvido)
 *     e continua congelado como na primeira versão.
 *  2. Cancelar a NF-e de uma venda `invoiced` totalmente faturada REGRIDE
 *     `sale.status` para `'confirmed'` (`CancelSaleNfeUseCase.ts:221-223`,
 *     D-M) — `nfe_status` vira `'cancelled'`, `sale.status` NÃO permanece
 *     `'invoiced'`. A tentativa de embarcar em seguida é rejeitada (422),
 *     mas pela guarda GENÉRICA de `VALID_TRANSITIONS`
 *     (`ChangeSaleStatusUseCase.ts:152-157` — `'confirmed'` não permite
 *     `'shipped'`), não pela guarda dedicada de `nfe_status`
 *     (`:159-170`) — essa guarda dedicada nunca é alcançada neste caminho,
 *     porque a checagem genérica já barra a transição antes dela.
 *
 * Por que isto é caracterização e não redundância: a suíte cobre o item 1
 * acima em `tests/unit/onda3-shipping-cockpit-cashflow.test.ts`, mas SEMPRE
 * com `ChangeSaleStatusUseCase` chamado diretamente e repositório fake.
 * Nenhum teste hoje percorre a pilha inteira — rota HTTP, middleware de
 * autorização, `SaleController`, `CancelSaleNfeUseCase` real, Postgres real
 * — para os mesmos cenários. Este arquivo fecha essa lacuna de nível de
 * integração.
 *
 * DIVERGÊNCIA DOCUMENTAL A REPORTAR (não corrigida aqui — só documentada,
 * fora do escopo deste arquivo editar `docs/coretriad/**` ou `src/**`):
 *   - `ChangeSaleStatusUseCase.ts:89-101` (JSDoc da classe, código de
 *     produção, não documento) descreve o motivo da guarda dedicada de
 *     `:159-170` afirmando textualmente que "a NF-e pode ser cancelada
 *     DEPOIS [de invoiced] (CancelSaleNfeUseCase) sem reverter sale.status
 *     — nesse caso a venda continua invoiced". Essa afirmação está
 *     desatualizada em relação ao próprio `CancelSaleNfeUseCase.ts` atual: a
 *     decisão D-M (2026-08-10, mais recente que o texto acima, que não tem
 *     data) fez o cancelamento regredir `sale.status` exatamente para evitar
 *     esse estado. Não encontrei, por leitura de `CancelSaleNfeUseCase.ts`
 *     inteiro, nenhum caminho do fluxo normal (cancelar via
 *     `POST /:id/nfe/cancel`, que sempre atua sobre
 *     `sale.nfe_provider_ref` — a emissão CORRENTE) que deixe uma venda
 *     `invoiced` com `nfe_status='cancelled'` simultaneamente; a guarda
 *     dedicada de `:159-170` pode proteger apenas um caminho residual (sem
 *     `sale_invoices` snapshot — venda legada pré-histórico-multi-NF-e — ou
 *     inconsistência de dual-write entre `Sale.nfe_status` e
 *     `SaleInvoice.nfe_status`) que este teste não teve como forçar via API
 *     pública. Reportado como observação para o passo 31 (auditoria), não
 *     promovido a finding — decisão de VeriCore/finding-validator, não
 *     minha.
 *   - `BUSINESS_RULE_CANDIDATES_comercial-financeiro.md` (BR-COM-003, L-3) e
 *     a matriz de rastreabilidade (`LEGACY_TRACEABILITY_MATRIX_comercial-financeiro.md:35-36`)
 *     herdam a mesma premissa desatualizada ao descrever a razão de ser da
 *     regra — não a corrijo aqui (fora do meu escopo de escrita), apenas
 *     sinalizo no retorno estruturado desta tarefa.
 *   - `tests/unit/onda3-shipping-cockpit-cashflow.test.ts:65-85` continua
 *     verde porque constrói o objeto `sale` diretamente
 *     (`{status:'invoiced', nfe_status:'cancelled'}`), sem passar por
 *     `CancelSaleNfeUseCase` — deliberadamente fora do escopo desta tarefa
 *     editar um teste já existente, mas registrado aqui como o motivo pelo
 *     qual aquele teste não capturou a divergência que a execução real
 *     revelou neste arquivo.
 *
 * Âncoras:
 *   - BR-COM-003 (CONFIRMED, lacuna de teste no caminho de exceção — L-3; premissa de origem refutada em runtime, ver divergência acima)
 *   - BR-COM-004 (CONFIRMED — `shipped` terminal)
 *   - server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts:143-150 (bloqueio de cancelamento pós-shipped)
 *   - server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts:152-157 (guarda GENÉRICA de VALID_TRANSITIONS — é ela que dispara o 422 deste cenário)
 *   - server/src/modules/sales/application/use-cases/ChangeSaleStatusUseCase.ts:159-170 (guarda DEDICADA de nfe_status — não alcançada neste caminho)
 *   - server/src/modules/fiscal/application/use-cases/CancelSaleNfeUseCase.ts:127-135,203,221-223 (regride sale.status ao cancelar NF-e autorizada — D-M, 2026-08-10)
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
 *
 * @group integration
 * @ticket ERP-LEGACY-001-passo30
 */

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('PASSO 30 — máquina de estados da venda: shipped terminal e embarque pós-cancelamento de NF-e', () => {
  /** @returns Um cliente fixture novo, com CPF matematicamente válido. */
  async function createClient(token: string) {
    const response = await api()
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Cliente Char-D ${Date.now()}`, cpf_cnpj: generateValidCpf(), state: 'SP' });
    return response.body.data;
  }

  /**
   * Cria uma venda `confirmed` e emite a NF-e por inteiro (provedor mock,
   * autorização síncrona) — ponto de partida comum aos dois cenários deste
   * arquivo.
   *
   * @param token - Bearer token autenticado.
   * @returns Id da venda, já `invoiced` com `nfe_status='authorized'`.
   */
  async function createInvoicedSale(token: string): Promise<number> {
    const productId = Number(process.env.TEST_PRODUCT_ID);
    const client = await createClient(token);

    const sale = await api()
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customer_id: client.id,
        items: [{ product_id: productId, quantity: 1, unit_price: 10 }],
        payment_method: 'pix',
        status: 'confirmed',
      });
    expect(sale.status).toBe(201);
    const saleId = sale.body.data.id;

    const issue = await api()
      .post(`/api/sales/${saleId}/nfe`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(issue.status).toBe(202);
    expect(issue.body.data.status).toBe('invoiced');
    expect(issue.body.data.nfe_status).toBe('authorized');

    return saleId;
  }

  it('cancelar a NF-e de uma venda invoiced REGRIDE sale.status para confirmed (D-M) — e o 422 do embarque seguinte vem da guarda genérica, não da de nfe_status', async () => {
    const token = authToken();
    const saleId = await createInvoicedSale(token);

    // Cancela a NF-e (CancelSaleNfeUseCase real). COMPORTAMENTO CONGELADO
    // (corrigido por evidência de execução — ver JSDoc do arquivo): a venda
    // tinha 1 item, totalmente faturado; cancelar a única NF-e devolve
    // `invoiced_quantity` a 0 (`CancelSaleNfeUseCase.ts:188-196`), então
    // `anyStillInvoiced=false` e `sale.status` regride para `'confirmed'`
    // (`:221-223`), não fica em `'invoiced'`.
    const cancelNfe = await api()
      .post(`/api/sales/${saleId}/nfe/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Caracterização passo 30 - cancelamento de NF-e pós-emissão' });
    expect(cancelNfe.status).toBe(200);
    expect(cancelNfe.body.data.nfe_status).toBe('cancelled');
    expect(cancelNfe.body.data.status).toBe('confirmed'); // sale.status REGRIDE (D-M)

    // COMPORTAMENTO CONGELADO: a venda agora está 'confirmed', então a
    // tentativa de embarcar é barrada pela guarda GENÉRICA de
    // VALID_TRANSITIONS (ChangeSaleStatusUseCase.ts:152-157 — 'confirmed'
    // não tem 'shipped' entre as transições permitidas) — a guarda DEDICADA
    // de nfe_status (:159-170) nunca chega a rodar neste caminho, porque a
    // checagem genérica já lança antes dela.
    const ship = await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'shipped' });
    expect(ship.status).toBe(422);
    // Envelope de erro padronizado (AppError/errorHandler.ts):
    // { success: false, error: { code, message, details? } }. A guarda
    // genérica (ChangeSaleStatusUseCase.ts:154-156) não passa `details` —
    // diferente da guarda dedicada de nfe_status, que passaria
    // `{ nfe_status, sale_status }` se fosse alcançada.
    expect(ship.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(ship.body.error.message).toMatch(/Transicao de status invalida: confirmed -> shipped/i);
    expect(ship.body.error.details).toBeUndefined();
  });

  it('venda shipped é terminal: não pode ser cancelada nem transicionar para nenhum outro status', async () => {
    const token = authToken();
    const saleId = await createInvoicedSale(token);

    const ship = await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'shipped' });
    expect(ship.status).toBe(200);
    expect(ship.body.data.status).toBe('shipped');

    // COMPORTAMENTO CONGELADO 1: cancelamento pós-shipped tem mensagem 422
    // dedicada ("já foi expedida"), distinta do erro genérico de transição
    // inválida.
    const cancelAttempt = await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'canceled' });
    expect(cancelAttempt.status).toBe(422);
    expect(cancelAttempt.body.error.message).toMatch(/expedida/i);

    // COMPORTAMENTO CONGELADO 2: shipped é terminal de fato — nenhuma outra
    // transição (nem "voltar" para confirmed) é aceita, com o erro genérico
    // de VALID_TRANSITIONS (não a mensagem dedicada acima, que é só para
    // 'canceled').
    const backToConfirmed = await api()
      .put(`/api/sales/${saleId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' });
    expect(backToConfirmed.status).toBe(422);
  });
});

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

/** Gera um CPF matematicamente válido (checksum real), único por chamada. */
function generateValidCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const d1 = cpfCheckDigit(base);
  const d2 = cpfCheckDigit([...base, d1]);
  return [...base, d1, d2].join('');
}
