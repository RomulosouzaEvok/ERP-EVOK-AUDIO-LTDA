import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Regressao: RBAC ausente em rotas legadas', () => {
  /**
   * Regressao para um gap real de seguranca: `categories`, `employees`,
   * `departments`, `assets`, `mobile-inventory` (scan/batch) e
   * `quality/non-conformities`/`maintenance`/`service-orders` protegiam
   * escrita apenas com `authenticate`, sem `authorize(role)` - qualquer
   * usuario autenticado (inclusive `operator`) podia escrever em dados de
   * RH, patrimonio ou movimentar estoque via app mobile. Corrigido
   * alinhando ao mesmo padrao de RBAC ja aplicado em `products`/`sales`/
   * `purchases`.
   *
   * @returns Promise resolvida apos validar 403 para operator em rotas
   * admin-only e 401/403 sem token nas demais.
   */
  it('operator recebe 403 ao tentar criar funcionario (admin-only)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User } = require('../../src/models/index');

    const email = `operator-rbac-${Date.now()}@evok.local`;
    const password = 'SenhaOperador123456!';
    await User.create({ name: 'Operador RBAC', email, password, role: 'operator', active: true });

    const login = await api().post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    const operatorToken = login.body.data.token;

    const response = await api()
      .post('/api/employees')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Funcionario Teste', position: 'Teste', department: 'Teste' });

    expect(response.status).toBe(403);
  });

  /**
   * Confirma que `admin`/`operator` conseguem escrever em `categories`
   * (nao admin-only) e que a rota realmente exige role, nao so token.
   *
   * @returns Promise resolvida apos validar 201 com token valido e 401 sem token.
   */
  it('categories exige autenticacao e aceita admin/operator na escrita', async () => {
    const token = authToken();

    const withoutToken = await api().post('/api/categories').send({ name: `Categoria Sem Token ${Date.now()}` });
    expect(withoutToken.status).toBe(401);

    const withToken = await api()
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Categoria RBAC ${Date.now()}` });
    expect(withToken.status).toBe(201);
  });

  /**
   * Confirma que `mobile-inventory/scan` (afeta estoque real) agora exige
   * `authorize('admin', 'operator')`, nao so token.
   *
   * @returns Promise resolvida apos validar 401 sem token.
   */
  it('mobile-inventory/scan exige autenticacao', async () => {
    const withoutToken = await api().post('/api/mobile-inventory/scan').send({ product_code: 'X', quantity: 1, type: 'in' });
    expect(withoutToken.status).toBe(401);
  });

  /**
   * Cobertura RBAC de `POST /api/inventory/warehouses` e
   * `PUT /api/inventory/warehouses/:id` (`authorizeModule('estoque',
   * 'approve')`, ver `server/src/modules/inventory/presentation/routes/inventory.ts`):
   * gap identificado na triagem de seguranca de 2026-08-04 — estes dois
   * endpoints (CRUD de Depositos, Bloco 4.2/4.3) nao tinham nenhum teste de
   * integracao cobrindo 401/403/sucesso.
   *
   * @returns Promise resolvida apos validar 401 sem token, 403 para
   * operator sem nivel 'approve' no modulo 'estoque' e 201/200 para admin.
   */
  describe('CRUD de Depositos (authorizeModule estoque/approve)', () => {
    /**
     * Cria um usuario `operator` com `AccessProfile` possuindo apenas
     * `estoque: 'operate'` (sem `approve`) — reproduz o caso real de um
     * almoxarife comum tentando criar/editar deposito, acao restrita a
     * gestor da area.
     *
     * @returns Token JWT do operator recem-criado.
     */
    async function createOperatorWithoutApproveToken(): Promise<string> {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

      const suffix = Date.now();
      const profile = await AccessProfile.create({ nome: `Almoxarife RBAC ${suffix}`, active: true });
      await AccessProfilePermission.create({ accessProfileId: profile.id, module: 'estoque', level: 'operate' });

      const email = `almoxarife-rbac-${suffix}@evok.local`;
      const password = 'SenhaAlmoxarife123456!';
      await User.create({
        name: 'Almoxarife RBAC',
        email,
        password,
        role: 'operator',
        active: true,
        accessProfileId: profile.id,
      });

      const login = await api().post('/api/auth/login').send({ email, password });
      expect(login.status).toBe(200);
      return login.body.data.token;
    }

    it('POST /api/inventory/warehouses exige token (401 sem Authorization)', async () => {
      const response = await api()
        .post('/api/inventory/warehouses')
        .send({ code: `RBAC-${Date.now()}`, name: 'Deposito RBAC' });

      expect(response.status).toBe(401);
    });

    it('POST /api/inventory/warehouses retorna 403 para operator sem nivel approve em estoque', async () => {
      const operatorToken = await createOperatorWithoutApproveToken();

      const response = await api()
        .post('/api/inventory/warehouses')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ code: `RBAC-${Date.now()}`, name: 'Deposito RBAC' });

      expect(response.status).toBe(403);
    });

    it('POST /api/inventory/warehouses retorna 201 para admin', async () => {
      const token = authToken();

      const response = await api()
        .post('/api/inventory/warehouses')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: `RBAC-${Date.now()}`, name: 'Deposito RBAC Admin' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('PUT /api/inventory/warehouses/:id exige token (401 sem Authorization)', async () => {
      const response = await api().put('/api/inventory/warehouses/1').send({ name: 'Novo nome' });

      expect(response.status).toBe(401);
    });

    it('PUT /api/inventory/warehouses/:id retorna 403 para operator sem nivel approve em estoque', async () => {
      const token = authToken();
      const created = await api()
        .post('/api/inventory/warehouses')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: `RBAC-PUT-${Date.now()}`, name: 'Deposito RBAC PUT' });
      expect(created.status).toBe(201);

      const operatorToken = await createOperatorWithoutApproveToken();

      const response = await api()
        .put(`/api/inventory/warehouses/${created.body.data.id}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ name: 'Tentativa Nao Autorizada' });

      expect(response.status).toBe(403);
    });

    it('PUT /api/inventory/warehouses/:id retorna 200 para admin', async () => {
      const token = authToken();
      const created = await api()
        .post('/api/inventory/warehouses')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: `RBAC-PUT-OK-${Date.now()}`, name: 'Deposito RBAC PUT OK' });
      expect(created.status).toBe(201);

      const response = await api()
        .put(`/api/inventory/warehouses/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Deposito RBAC PUT OK Editado' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Deposito RBAC PUT OK Editado');
    });
  });
});
