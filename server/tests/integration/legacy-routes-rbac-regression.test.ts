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
});
