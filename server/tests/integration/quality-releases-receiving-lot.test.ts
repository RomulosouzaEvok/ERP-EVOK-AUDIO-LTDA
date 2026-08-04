import jwt from 'jsonwebtoken';

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';
import { getJwtRuntimeConfig, JWT_ISSUER, JWT_AUDIENCE } from '../../src/config/runtimeEnv';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

/**
 * Emite um token JWT diretamente (mesma tecnica de `scripts/run-api-suite.cjs`
 * para o token admin), sem passar por `POST /api/auth/login` — evita
 * consumir o `authLimiter` (10 tentativas/15min por IP, `server/app.ts`)
 * compartilhado com as demais suites de integracao no mesmo processo. O
 * middleware `authenticate` recarrega o usuario/perfil do banco a cada
 * request (nunca confia em claims do token), entao o caminho de autorizacao
 * exercitado e identico ao de um token emitido via login real.
 *
 * @param user - Usuario (`id`, `passwordVersion` opcional) para o qual emitir o token.
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
 * Fecha o item pendente do Bloco 1 (`docs/governance/TODO.md`, Bloco 1.5):
 * "Teste E2E: Qualidade libera lote criado pelo Recebimento (permissao
 * avaliada pelo modulo da acao, nao pela origem do dado — UC-37)".
 *
 * Fluxo real ponta a ponta: um usuario do modulo `recebimento` recebe um
 * pedido de compra (`POST /api/purchases/:id/receive`,
 * `server/src/modules/purchases/presentation/routes/purchases.ts`), o que
 * cria um `LotControl` em `status='quarantine'`
 * (`ReceivePurchaseItemsUseCase`); em seguida, um usuario DIFERENTE, do
 * modulo `qualidade` (sem nenhum acesso a `recebimento` ou `compras`),
 * consegue liberar esse mesmo lote via `POST /api/inventory/lots/:id/release`
 * (`authorizeModule('qualidade', 'approve')`,
 * `server/src/modules/inventory/presentation/routes/inventory.ts`).
 *
 * Confirma a regra central do UC-37: a permissao de uma acao e avaliada
 * pelo MODULO DONO DA ACAO (aqui, `qualidade`, porque liberar lote e
 * decisao de qualidade), nunca pelo modulo de origem do dado (`recebimento`,
 * que apenas criou o lote em quarentena) — nem o usuario de Recebimento
 * pode liberar o proprio lote que recebeu (falta `qualidade`/`approve`),
 * nem a ausencia de `estoque`/`recebimento` no perfil de Qualidade impede a
 * liberacao.
 *
 * @returns Promise resolvida apos validar o fluxo completo compra ->
 * recebimento (lote em quarentena) -> liberacao pela Qualidade.
 */
describeIntegration('E2E: Qualidade libera lote criado pelo Recebimento (UC-37, modulo da acao != origem do dado)', () => {
  /**
   * Cria um usuario `operator` com perfil possuindo APENAS
   * `recebimento: 'operate'` (sem `compras`, sem `qualidade`) — reproduz o
   * almoxarife de recebimento que so pode dar entrada fisica/fiscal no
   * material, nao decide sobre a liberacao para consumo.
   *
   * @returns Token JWT do usuario de Recebimento recem-criado.
   */
  async function createReceivingUserToken(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = Date.now();
    const profile = await AccessProfile.create({ nome: `Recebimento UC37 ${suffix}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'recebimento', level: 'operate' });

    const email = `recebimento-uc37-${suffix}@evok.local`;
    const user = await User.create({
      name: 'Usuario Recebimento UC37',
      email,
      password: 'SenhaRecebimento123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });

    return mintToken(user);
  }

  /**
   * Cria um usuario `operator` com perfil possuindo APENAS
   * `qualidade: 'approve'` (sem `estoque`, sem `recebimento`, sem
   * `compras`) — reproduz o inspetor de qualidade que decide a liberacao de
   * lotes, mas nao tem acesso operacional ao modulo de Estoque/Recebimento.
   *
   * @returns Token JWT do usuario de Qualidade recem-criado.
   */
  async function createQualityUserToken(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = Date.now();
    const profile = await AccessProfile.create({ nome: `Qualidade UC37 ${suffix}`, active: true });
    await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'qualidade', level: 'approve' });

    const email = `qualidade-uc37-${suffix}@evok.local`;
    const user = await User.create({
      name: 'Usuario Qualidade UC37',
      email,
      password: 'SenhaQualidade123456!',
      role: 'operator',
      active: true,
      accessProfileId: profile.id,
    });

    return mintToken(user);
  }

  it('recebimento cria/recebe lote em quarentena e qualidade (usuario diferente) libera o lote', async () => {
    const adminToken = authToken();
    const supplierId = Number(process.env.TEST_SUPPLIER_ID);
    const productId = Number(process.env.TEST_PRODUCT_ID);

    // Setup do pedido de compra ate 'sent' feito por admin (fora do escopo
    // deste teste, que foca na colaboracao Recebimento -> Qualidade).
    const created = await api()
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ supplier_id: supplierId, items: [{ product_id: productId, quantity: 7, unit_price: 10 }] });
    expect(created.status).toBe(201);
    const purchaseId = created.body.data.id;
    const itemId = created.body.data.items[0].id;

    for (const status of ['approved', 'sent']) {
      await api().put(`/api/purchases/${purchaseId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status }).expect(200);
    }

    // 1) Recebimento (usuario com apenas 'recebimento':'operate') recebe o
    // pedido - cria/atualiza o LotControl em status='quarantine'.
    const receivingToken = await createReceivingUserToken();
    const invoiceNumber = `NF-UC37-${Date.now()}`;
    const lotNumber = `LOTE-UC37-${Date.now()}`;

    const receive = await api()
      .post(`/api/purchases/${purchaseId}/receive`)
      .set('Authorization', `Bearer ${receivingToken}`)
      .send({ items: [{ item_id: itemId, quantity: 7, lot_number: lotNumber }], invoice_number: invoiceNumber });
    expect(receive.status).toBe(200);

    // O usuario de Recebimento NAO tem 'qualidade' no perfil - nao pode
    // liberar o proprio lote que recebeu (a acao de liberar pertence ao
    // modulo Qualidade, nao ao Recebimento que apenas originou o dado).
    // `limit` alto: o produto de fixture acumula lotes `quarantine` de
    // outras suites de integracao rodadas na mesma sessao/banco de dev
    // (endpoint ordena por `createdAt ASC`, sem `limit` o lote recem-criado
    // cai fora da 1a pagina default de 20).
    const lots = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ product_id: productId, status: 'quarantine', limit: 1000 });
    expect(lots.status).toBe(200);
    const lot = lots.body.data.find((l: any) => l.lot_number === lotNumber);
    expect(lot).toBeDefined();
    expect(lot.status).toBe('quarantine');

    const receivingTriesToRelease = await api()
      .post(`/api/inventory/lots/${lot.id}/release`)
      .set('Authorization', `Bearer ${receivingToken}`)
      .send({ notes: 'Tentativa indevida pelo proprio Recebimento' });
    expect(receivingTriesToRelease.status).toBe(403);
    expect(receivingTriesToRelease.body.error.code).toBe('MODULE_ACCESS_DENIED');

    // 2) Qualidade (usuario DIFERENTE, com apenas 'qualidade':'approve',
    // sem 'estoque'/'recebimento'/'compras') libera o mesmo lote com
    // sucesso - RBAC por modulo nao impede a colaboracao entre modulos
    // diferentes no fluxo real (UC-37).
    const qualityToken = await createQualityUserToken();
    const release = await api()
      .post(`/api/inventory/lots/${lot.id}/release`)
      .set('Authorization', `Bearer ${qualityToken}`)
      .send({ notes: 'Liberado apos inspecao de recebimento - teste de integracao UC-37' });

    expect(release.status).toBe(200);
    expect(release.body.success).toBe(true);
    expect(release.body.data.id).toBe(lot.id);
    expect(release.body.data.status).toBe('available');

    // `limit` alto: o produto de fixture (`TEST_PRODUCT_ID`) acumula lotes
    // 'available' de execucoes anteriores da suite (mesmo banco), e a
    // listagem ordena por `createdAt ASC` (mais antigos primeiro) - sem um
    // limite generoso, o lote recem-liberado (o mais recente) ficaria fora
    // da primeira pagina (default `limit=20`).
    const confirmAvailable = await api()
      .get('/api/inventory/lots')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ product_id: productId, status: 'available', limit: 5000 });
    expect(confirmAvailable.status).toBe(200);
    const releasedLot = confirmAvailable.body.data.find((l: any) => l.id === lot.id);
    expect(releasedLot).toBeDefined();
    expect(releasedLot.status).toBe('available');
  });
});
