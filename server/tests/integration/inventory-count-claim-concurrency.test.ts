import jwt from 'jsonwebtoken';
import type { Response } from 'supertest';

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../../src/config/runtimeEnv';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Teste de integracao contra PostgreSQL real do claim (lock pessimista) de
 * contagem de inventario ciclico (`StartInventoryCountUseCase`) —
 * `docs/governance/TODO.md`, "Teste de integracao real das 3 features de
 * maior risco da terceira rodada de 2026-08-06" (o item de contagem
 * ciclica foi agrupado nesta mesma frente de testes de integracao).
 *
 * Diferente do indice unico parcial de paradas de producao, aqui a
 * protecao e via `SELECT ... FOR UPDATE` dentro de uma transacao sobre uma
 * linha EXISTENTE (o cabecalho da contagem, ja criado antes da corrida) —
 * esse padrao SERIALIZA corretamente duas transacoes concorrentes (a
 * segunda espera a primeira commitar/rollback antes de ler `assigned_to`),
 * ao contrario do caso de "duas linhas novas concorrentes" do downtime.
 * Este teste dispara 2 requests HTTP verdadeiramente concorrentes
 * (`Promise.all`, 2 usuarios distintos) contra a MESMA contagem no pool
 * para provar que exatamente 1 vence o claim.
 */
describeIntegration('Contagem de inventario ciclico — claim concorrente (integracao real)', () => {
  /**
   * Emite um token JWT diretamente para um usuario ja existente, mesma
   * tecnica de `rbac-module-access-denied.test.ts` — evita o rate limit de
   * login (`authLimiter`, 10 tentativas/15min por IP) compartilhado com as
   * demais suites de integracao rodando no mesmo processo.
   *
   * @param user - Usuario (`id`, `passwordVersion` opcional).
   * @returns Token JWT valido por 1 hora.
   */
  function mintToken(user: { id: number; passwordVersion?: number | null }): string {
    const { secret } = getJwtRuntimeConfig();
    return jwt.sign({ id: user.id, passwordVersion: user.passwordVersion ?? 1 }, secret, {
      expiresIn: '1h',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  /**
   * Cria um usuario `operator` com perfil de acesso concedendo `operate` no
   * modulo `contagens` (suficiente para `POST /:id/start`), retornando o
   * usuario e seu token.
   *
   * @param label - Rotulo usado no nome/email do usuario (para depuracao).
   * @returns `{ id, token }` do usuario criado.
   */
  async function createOperatorWithCountAccess(label: string): Promise<{ id: number; token: string }> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const profile = await AccessProfile.create({ nome: `Operador Contagens ${label} ${suffix}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'contagens', level: 'operate' });

    const user = await User.create({
      name: `Operador Contagens ${label}`,
      email: `operador-contagens-${label}-${suffix}@evok.local`,
      password: 'SenhaOperador123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });

    return { id: user.id, token: mintToken(user) };
  }

  /**
   * Resolve o id do depósito `INSUMOS` (seed obrigatório do Bloco 4),
   * necessário para criar uma contagem nova (`warehouse_id` obrigatório).
   *
   * @returns Id do depósito `INSUMOS`.
   */
  async function getInsumosWarehouseId(): Promise<number> {
    const adminToken = authToken();
    const response = await api()
      .get('/api/inventory/warehouses')
      .set('Authorization', `Bearer ${adminToken}`);
    if (response.status !== 200) {
      throw new Error(`Falha ao listar depositos: ${JSON.stringify(response.body)}`);
    }
    const insumos = response.body.data.find((w: { code: string }) => w.code === 'INSUMOS');
    if (!insumos) {
      throw new Error('Deposito INSUMOS nao encontrado — rode as migrations do Bloco 4 antes deste teste.');
    }
    return insumos.id;
  }

  /**
   * Cria uma contagem de inventário ciclico vazia (sem itens), no "pool"
   * (`assigned_to` ausente) ou atribuída a um usuário específico.
   *
   * @param assignedTo - Id do usuário a atribuir, ou `undefined` para o pool.
   * @returns Id da contagem criada.
   */
  async function createCount(assignedTo?: number): Promise<number> {
    const adminToken = authToken();
    const warehouseId = await getInsumosWarehouseId();
    const payload: Record<string, unknown> = { count_type: 'cycle', warehouse_id: warehouseId };
    if (assignedTo) payload.assigned_to = assignedTo;

    const response = await api()
      .post('/api/inventory-counts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    if (response.status !== 201) {
      throw new Error(`Falha ao criar contagem fixture: ${JSON.stringify(response.body)}`);
    }
    return response.body.data.count.id;
  }

  it('exatamente 1 de 2 requisicoes concorrentes vence o claim de uma contagem do pool', async () => {
    const [userA, userB] = await Promise.all([
      createOperatorWithCountAccess('A'),
      createOperatorWithCountAccess('B'),
    ]);
    const countId = await createCount();

    const [responseA, responseB] = await Promise.allSettled([
      api().post(`/api/inventory-counts/${countId}/start`).set('Authorization', `Bearer ${userA.token}`).send({}),
      api().post(`/api/inventory-counts/${countId}/start`).set('Authorization', `Bearer ${userB.token}`).send({}),
    ]);

    const responses = [responseA, responseB]
      .filter((result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled')
      .map((result) => result.value);

    expect(responses).toHaveLength(2);

    const successResponses = responses.filter((response) => response.status === 200);
    // A perdedora da corrida do POOL recebe 422 (BusinessRuleError,
    // "Apenas contagens em status 'draft' podem ser iniciadas"), NAO 409:
    // o lock pessimista (`SELECT ... FOR UPDATE`) faz a segunda transacao
    // esperar a primeira commitar e entao ler `status='counting'` (nao mais
    // 'draft') — a checagem de status vem ANTES da checagem de
    // `assigned_to` em `StartInventoryCountUseCase.execute`, entao o
    // `ConflictError` (409, "ja atribuida a outro funcionario") so ocorre
    // no cenario de uma contagem CRIADA JA atribuida a outro usuario (ver
    // proximo teste), nao na corrida pelo pool. Confirmado empiricamente
    // contra Postgres real: o importante para este teste e que a
    // perdedora falhe de forma didatica (nao 500) e que so uma vença.
    const losingResponses = responses.filter((response) => response.status !== 200);

    expect(successResponses).toHaveLength(1);
    expect(losingResponses).toHaveLength(1);
    expect([400, 409, 422]).toContain(losingResponses[0].status);
    expect(losingResponses[0].body.success).toBe(false);
    expect(successResponses[0].body.data.status).toBe('counting');
    expect([userA.id, userB.id]).toContain(successResponses[0].body.data.assigned_to);

    // Confirma no banco que a contagem ficou com exatamente UM responsável
    // (não ficou "meio atribuída" por uma corrida mal resolvida).
    const adminToken = authToken();
    const finalState = await api()
      .get(`/api/inventory-counts/${countId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(finalState.status).toBe(200);
    expect(finalState.body.data.status).toBe('counting');
    expect(finalState.body.data.assigned_to).toBe(successResponses[0].body.data.assigned_to);
  });

  it('contagem atribuida a um funcionario especifico nao pode ser reivindicada por OUTRO operador (409)', async () => {
    const [owner, intruder] = await Promise.all([
      createOperatorWithCountAccess('Owner'),
      createOperatorWithCountAccess('Intruder'),
    ]);
    const countId = await createCount(owner.id);

    const intruderResponse = await api()
      .post(`/api/inventory-counts/${countId}/start`)
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({});
    expect(intruderResponse.status).toBe(409);

    // O dono original ainda consegue iniciar normalmente (nao foi corrompida
    // pela tentativa negada do intruso).
    const ownerResponse = await api()
      .post(`/api/inventory-counts/${countId}/start`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({});
    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.data.assigned_to).toBe(owner.id);
    expect(ownerResponse.body.data.status).toBe('counting');
  });

  it('admin PODE assumir (override) uma contagem ja atribuida a outro funcionario', async () => {
    const owner = await createOperatorWithCountAccess('OwnerForOverride');
    const countId = await createCount(owner.id);
    const adminToken = authToken();

    const meResponse = await api().get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(meResponse.status).toBe(200);
    const adminId = meResponse.body.data.id;

    const overrideResponse = await api()
      .post(`/api/inventory-counts/${countId}/start`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(overrideResponse.status).toBe(200);
    expect(overrideResponse.body.data.status).toBe('counting');
    // O admin passa a ser o responsável (override), não o funcionário original.
    expect(overrideResponse.body.data.assigned_to).not.toBe(owner.id);
    expect(overrideResponse.body.data.assigned_to).toBe(adminId);
  });
});
