/**
 * FIND-ERP-001 (GRUPO B) — idempotência de `POST /api/inventory/movements`.
 *
 * Cobre o RETEST_SPECIFICATION (e) do finding, adaptado pela decisão do dono
 * registrada em CASE-001 (Q2, APR-2026-020 handoff):
 *
 * 1. Duas chamadas com a MESMA `operation_id` → só a primeira aplica;
 *    a segunda recebe `409` e nenhum segundo `InventoryMovement` é criado.
 * 2. Duas chamadas com `operation_id` DISTINTOS → ambas aplicam (caso de
 *    negócio legítimo preservado — chave é por intenção do usuário, não por
 *    hash de valor/data).
 * 3. Chamada SEM `operation_id` → comportamento de transição: não é `400`
 *    (campo é opcional enquanto o consumidor externo, ex. n8n/bot, não
 *    envia a chave), continua criando o movimento normalmente, sem proteção
 *    de idempotência nesta chamada específica (risco residual documentado
 *    em REMEDIATION_EVIDENCE_PACKAGE.md).
 *
 * Âncoras:
 *  - `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
 *    (`operation_id` opcional).
 *  - `server/src/modules/inventory/application/use-cases/CreateInventoryMovementUseCase.ts`
 *    (propaga `operation_id`, converte `SequelizeUniqueConstraintError` em 409).
 *  - `server/src/models/InventoryMovement.ts` (índice único parcial).
 *
 * Estilo: integração (API HTTP real + banco `erp_evok_audio_test`) — aguarda
 * execução central (`scripts/run-api-suite.cjs`).
 *
 * @module tests/integration/inventory-movement-idempotency
 */
import { randomUUID } from 'crypto';
import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import { ensureFixtureCategoryId } from './helpers/categoryFixtures';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

async function createProduct(token: string, categoryId: number, suffix: string) {
  const res = await api()
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Produto Idempotencia Estoque ${suffix} ${Date.now()}`,
      code: `IDEM-MOV-${suffix}-${Date.now()}`,
      category_id: categoryId,
      unit: 'UN',
      quantity: 0,
      min_quantity: 1,
      cost_price: 1,
      price: 2,
    });
  expect(res.status).toBe(201);
  return res.body.data.id as number;
}

describeIntegration('FIND-ERP-001 (GRUPO B) — idempotência de POST /api/inventory/movements', () => {
  it('mesma operation_id: primeira aplica (201), segunda é rejeitada (409), 1 movimento só', async () => {
    const token = authToken();
    const categoryId = await ensureFixtureCategoryId(token);
    const productId = await createProduct(token, categoryId, 'SAME');

    const payload = {
      product_id: productId,
      operation_id: randomUUID(),
      type: 'in',
      quantity: 10,
      description: 'Idempotencia - mesma chave',
    };

    const first = await api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payload);
    const second = await api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);

    const product = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${token}`);
    expect(Number(product.body.data.quantity)).toBe(10);

    const movements = await api()
      .get('/api/inventory/movements')
      .query({ product_id: productId, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(movements.body.pagination.total).toBe(1);
  });

  it('operation_id distintos: as duas chamadas aplicam (caso de negocio legitimo preservado)', async () => {
    const token = authToken();
    const categoryId = await ensureFixtureCategoryId(token);
    const productId = await createProduct(token, categoryId, 'DISTINCT');

    const base = {
      product_id: productId,
      type: 'in',
      quantity: 10,
      description: 'Idempotencia - chaves distintas',
    };

    const first = await api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send({
      ...base,
      operation_id: randomUUID(),
    });
    const second = await api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send({
      ...base,
      operation_id: randomUUID(),
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.id).not.toBe(first.body.data.id);

    const product = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${token}`);
    expect(Number(product.body.data.quantity)).toBe(20);

    const movements = await api()
      .get('/api/inventory/movements')
      .query({ product_id: productId, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(movements.body.pagination.total).toBe(2);
  });

  it('operation_id ausente (Q2 — transicao ate consumidor externo migrar): NAO retorna 400, continua criando o movimento', async () => {
    const token = authToken();
    const categoryId = await ensureFixtureCategoryId(token);
    const productId = await createProduct(token, categoryId, 'ABSENT');

    const payload = {
      product_id: productId,
      type: 'in',
      quantity: 10,
      description: 'Sem operation_id - consumidor externo ainda nao migrado',
    };

    const res = await api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.operation_id).toBeNull();

    // Risco residual documentado (Q2): sem a chave, um segundo reenvio ainda
    // duplica — comportamento intencional de transição, não regressão.
    const replay = await api().post('/api/inventory/movements').set('Authorization', `Bearer ${token}`).send(payload);
    expect(replay.status).toBe(201);

    const product = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${token}`);
    expect(Number(product.body.data.quantity)).toBe(20);
  });
});
