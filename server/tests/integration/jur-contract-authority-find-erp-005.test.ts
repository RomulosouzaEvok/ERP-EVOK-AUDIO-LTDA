/**
 * Regressão HTTP de `FIND-ERP-005` (RF-JUR-003 — alçada de aprovação de
 * contrato jurídico). Remediação SanaCore `ERP-LEGACY-001-CASE-002`,
 * autorizada por `APR-2026-021` Partes B e C.
 *
 * ## Por que esta suíte precisa ser de INTEGRAÇÃO
 *
 * O finding registra que as Falhas 2 e 4 "vivem parcialmente na camada de
 * rota/controller e são invisíveis a teste que instancie o use case
 * diretamente" — é exatamente por isso que a suíte anterior passava verde
 * com as quatro falhas abertas. Os blocos R2(a)-(d) e R4(a)-(c) do
 * RETEST_SPECIFICATION exigem requisição HTTP autenticada, com o RBAC real
 * (`authenticate` recarrega perfil e permissões do banco a cada request).
 *
 * ## Banco
 *
 * **Exclusivamente `erp_evok_audio_test`**, via `server/.env.test` +
 * `scripts/run-api-suite.cjs` (que impõe o sufixo `_test`/`_ci` no nome do
 * banco). Banco real é linha vermelha (`APR-2026-016`, reafirmada na Parte D
 * da `APR-2026-021`). Sem os pré-requisitos, a suíte é `skip` — e **skip não
 * é evidência de aprovação**: a lacuna correspondente está declarada no
 * `REMEDIATION.md` do caso.
 *
 * ## Armadilhas de fixture (herdadas da triagem)
 *
 * - `jur_contracts.contract_number` é `varchar(20)` — usar identificador curto.
 * - Ativação exige `responsible_user_id`, **2 signatários** (`party_a`/`party_b`)
 *   e **documento assinado**.
 * - `contract_type` **fora** de `employment`/`supplier`/`nda`, para não
 *   arrastar o checklist de cláusulas (RF-JUR-010) para dentro dos testes de
 *   alçada.
 *
 * @group integration
 */

import { api, authToken, approverToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

const JUR_BASE = '/api/jur';

/** Sufixo curto — `contract_number` é varchar(20). */
function shortId(): string {
  return `F5-${Date.now() % 1e6}-${Math.floor(Math.random() * 1000)}`;
}

describeIntegration('FIND-ERP-005 — alçada de contrato jurídico (RF-JUR-003) por HTTP', () => {
  /**
   * Cria um usuário com um perfil de acesso contendo exatamente os módulos e
   * níveis pedidos.
   *
   * @param modules - Mapa `{ moduleKey: level }`.
   * @param role - `role` da tabela `users` (default `operator`, para não herdar o curto-circuito de `admin`).
   * @returns Token JWT obtido por login real.
   */
  async function createUserToken(modules: Record<string, string>, role = 'operator'): Promise<{ token: string; userId: number }> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User, AccessProfile, AccessProfilePermission } = require('../../src/models/index');

    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const profile = await AccessProfile.create({ nome: `FIND-ERP-005 ${suffix}`, active: true });
    for (const [moduleKey, level] of Object.entries(modules)) {
      await AccessProfilePermission.create({ accessProfileId: profile.id, module: moduleKey, level });
    }

    const email = `find-erp-005-${suffix}@evok.local`;
    const password = 'SenhaFindErp005Teste!';
    const user = await User.create({ name: `FIND-ERP-005 ${suffix}`, email, password, role, active: true, accessProfileId: profile.id });

    const login = await api().post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    return { token: login.body.data.token, userId: user.id };
  }

  /**
   * Cria um contrato pronto para ativar (responsável, 2 signatários parte e
   * documento assinado), no valor pedido.
   *
   * @param value - Valor do contrato.
   * @param token - Token de quem cria (default: o admin da suíte).
   * @returns Id do contrato.
   */
  async function createActivatableContract(value: number, token: string = authToken()): Promise<number> {
    const created = await api()
      .post(`${JUR_BASE}/contracts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'commercial',
        object: `Contrato de regressao FIND-ERP-005 ${shortId()}`,
        counterparty_type: 'other',
        counterparty_name: 'Contraparte Teste',
        counterparty_doc: '00000000000191',
        value,
        responsible_user_id: 1,
      });
    expect(created.status).toBe(201);
    const contractId = created.body.data.id;

    for (const party of ['party_a', 'party_b']) {
      const signatory = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/signatories`)
        .set('Authorization', `Bearer ${token}`)
        // `party_type` (nao `signatory_type`): e o campo exigido por
        // AddContractSignatoryUseCase:26 e documentado em BLOCO_3_JUR_API 2.3.
        // O use case mapeia party_type -> coluna signatory_role.
        .send({ party_type: party, name: `Signatario ${party}` });
      expect([200, 201]).toContain(signatory.status);
    }

    const document = await api()
      .post(`${JUR_BASE}/contracts/${contractId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      // `file_url` + `is_signed_version` sao os campos reais
      // (AddContractDocumentUseCase:26,39). `version_number` e calculado pelo
      // backend e nunca informado pelo cliente.
      .send({ file_url: 'https://example.invalid/assinado.pdf', is_signed_version: true });
    expect([200, 201]).toContain(document.status);

    return contractId;
  }

  /**
   * Conta linhas VIVAS em `jur_contract_approvals` para um contrato.
   *
   * @param contractId - Contrato.
   * @returns Quantidade de aprovações não invalidadas.
   */
  async function countApprovals(contractId: number): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { JurContractApproval } = require('../../src/models/index');
    return JurContractApproval.count({ where: { contract_id: contractId, invalidated_at: null } });
  }

  // ------------------------------------------------------------------
  // R2 — nível exigido (Falha 2)
  // ------------------------------------------------------------------

  describe('R2 — RF-JUR-003: registrar aprovação exige NÍVEL approve (Falha 2)', () => {
    it('R2(a): diretor:operate recebe 403 e NÃO grava aprovação', async () => {
      const contractId = await createActivatableContract(200000);
      const { token } = await createUserToken({ diretor: 'operate' });

      const response = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'diretor' });

      expect(response.status).toBe(403);
      expect(await countApprovals(contractId)).toBe(0);
    });

    it('R2(b): financeiro:operate recebe 403 e NÃO grava aprovação', async () => {
      const contractId = await createActivatableContract(5000000);
      const { token } = await createUserToken({ financeiro: 'operate' });

      const response = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'financeiro' });

      expect(response.status).toBe(403);
      expect(await countApprovals(contractId)).toBe(0);
    });

    it('R2(c): diretor:approve registra a aprovação (201, 1 linha)', async () => {
      const contractId = await createActivatableContract(200000);
      const { token } = await createUserToken({ diretor: 'approve' });

      const response = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'diretor' });

      expect(response.status).toBe(201);
      expect(response.body.data.approver_role).toBe('diretor');
      // Falha 3: a aprovação nasce vinculada ao valor aprovado.
      expect(Number(response.body.data.approved_value)).toBe(200000);
      expect(await countApprovals(contractId)).toBe(1);
    });

    it('R2(d): com apenas a tentativa negada, activate falha com RF-JUR-003 e o status não muda', async () => {
      const contractId = await createActivatableContract(200000);
      const { token: operateToken } = await createUserToken({ diretor: 'operate' });

      const negada = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${operateToken}`)
        .send({ role: 'diretor' });
      expect(negada.status).toBe(403);

      const { token: juridicoToken } = await createUserToken({ juridico: 'operate' });
      const ativacao = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/activate`)
        .set('Authorization', `Bearer ${juridicoToken}`)
        .send({});

      expect(ativacao.status).toBe(422);
      expect(ativacao.body?.details?.rule ?? ativacao.body?.error?.details?.rule).toBe('RF-JUR-003');

      const contrato = await api()
        .get(`${JUR_BASE}/contracts/${contractId}`)
        .set('Authorization', `Bearer ${authToken()}`);
      expect(contrato.body.data.status).toBe('draft');
    });

    it('GET /contracts/:id/approvals continua acessível em nível operate (não foi quebrado)', async () => {
      const contractId = await createActivatableContract(200000);
      const { token } = await createUserToken({ juridico: 'operate' });

      const response = await api()
        .get(`${JUR_BASE}/contracts/${contractId}/approvals`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.required_roles).toEqual(['diretor']);
    });
  });

  // ------------------------------------------------------------------
  // R4 — segregação de identidade (Falha 4)
  // ------------------------------------------------------------------

  describe('R4 — D-K: dupla aprovação exige duas PESSOAS (Falha 4)', () => {
    it('R4(a): o mesmo admin registra diretor e é rejeitado no financeiro — exatamente 1 linha', async () => {
      // Contrato criado por OUTRA pessoa (o segundo admin), para isolar a
      // regra "aprovador ≠ aprovador anterior" da regra "aprovador ≠ criador".
      const contractId = await createActivatableContract(5000000, approverToken());

      const primeira = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ role: 'diretor' });
      expect(primeira.status).toBe(201);

      const segunda = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ role: 'financeiro' });

      expect(segunda.status).toBe(422);
      expect(segunda.body?.details?.rule ?? segunda.body?.error?.details?.rule).toBe('D-K-JURIDICO');
      expect(await countApprovals(contractId)).toBe(1);
    });

    it('R4(b): duas pessoas distintas com approve → 2 aprovações e ativação de R$ 5.000.000 liberada', async () => {
      const contractId = await createActivatableContract(5000000);
      const diretor = await createUserToken({ diretor: 'approve' });
      const financeiro = await createUserToken({ financeiro: 'approve' });

      const a = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${diretor.token}`)
        .send({ role: 'diretor' });
      expect(a.status).toBe(201);

      const b = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${financeiro.token}`)
        .send({ role: 'financeiro' });
      expect(b.status).toBe(201);

      expect(await countApprovals(contractId)).toBe(2);

      const { token: juridicoToken } = await createUserToken({ juridico: 'approve' });
      const ativacao = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/activate`)
        .set('Authorization', `Bearer ${juridicoToken}`)
        // `responsible_user_id` NAO e persistido na criacao (por desenho,
        // BLOCO_3_JUR_API 2.1) — e exigido aqui (BR-JUR-001). Sem ele a
        // ativacao retorna 422 antes de exercitar a alcada.
        .send({ responsible_user_id: 1 });
      expect(ativacao.status).toBe(200);
      expect(ativacao.body.data.status).toBe('active');
      // R1(d): a alçada vigente ficou registrada.
      expect(ativacao.body.data.approval_policy_snapshot).toBeTruthy();
    });

    it('R4(c): a rejeição é por IDENTIDADE — dois admins DIFERENTES aprovam papéis diferentes', async () => {
      // Criado por um terceiro (usuário `juridico`), para que nenhum dos dois
      // admins seja o criador.
      const criador = await createUserToken({ juridico: 'operate' });
      const contractId = await createActivatableContract(5000000, criador.token);

      const primeira = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ role: 'diretor' });
      expect(primeira.status).toBe(201);

      const segunda = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${approverToken()}`)
        .send({ role: 'financeiro' });

      expect(segunda.status).toBe(201);
      expect(await countApprovals(contractId)).toBe(2);
    });

    it('R4(d): quem criou o contrato não pode aprová-lo, mesmo com papel e nível', async () => {
      const criador = await createUserToken({ juridico: 'operate', diretor: 'approve' });
      const contractId = await createActivatableContract(200000, criador.token);

      const response = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${criador.token}`)
        .send({ role: 'diretor' });

      expect(response.status).toBe(422);
      expect(response.body?.details?.rule ?? response.body?.error?.details?.rule).toBe('D-K-JURIDICO');
      expect(await countApprovals(contractId)).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // R3 — aditivo (Falha 3)
  // ------------------------------------------------------------------

  describe('R3 — RF-JUR-008: aditivo que eleva valor reabre a alçada (Falha 3)', () => {
    /**
     * Ativa um contrato de valor baixo (faixa sem alçada) para servir de base
     * aos testes de aditivo.
     *
     * @param value - Valor inicial.
     * @returns Id do contrato ativo.
     */
    async function createActiveContract(value: number): Promise<number> {
      const criador = await createUserToken({ juridico: 'approve' });
      const contractId = await createActivatableContract(value, criador.token);
      const ativacao = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/activate`)
        .set('Authorization', `Bearer ${criador.token}`)
        // Ver nota em R4(b): responsible_user_id so entra na ativacao.
        .send({ responsible_user_id: 1 });
      expect(ativacao.status).toBe(200);
      return contractId;
    }

    it('R3(a): elevar contrato ativo de R$ 40.000 para R$ 5.000.000 tira o contrato de active', async () => {
      const contractId = await createActiveContract(40000);
      const { token } = await createUserToken({ juridico: 'approve' });

      const aditivo = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/addendums`)
        .set('Authorization', `Bearer ${token}`)
        .send({ change_type: 'value', new_value: 5000000, description: 'Aditivo de valor' });
      expect(aditivo.status).toBe(201);

      const contrato = await api()
        .get(`${JUR_BASE}/contracts/${contractId}`)
        .set('Authorization', `Bearer ${authToken()}`);
      expect(contrato.body.data.status).toBe('in_approval');
      expect(Number(contrato.body.data.value)).toBe(5000000);
    });

    it('R3(b): VARIANTE CRUZADA — change_type=term com new_value é rejeitado e nada muda', async () => {
      const contractId = await createActiveContract(40000);
      const { token } = await createUserToken({ juridico: 'approve' });

      const aditivo = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/addendums`)
        .set('Authorization', `Bearer ${token}`)
        .send({ change_type: 'term', new_end_date: '2028-08-31', new_value: 5000000, description: 'Prorrogacao com valor' });

      expect(aditivo.status).toBe(422);

      const contrato = await api()
        .get(`${JUR_BASE}/contracts/${contractId}`)
        .set('Authorization', `Bearer ${authToken()}`);
      expect(contrato.body.data.status).toBe('active');
      expect(Number(contrato.body.data.value)).toBe(40000);
    });

    it('APR-2026-021 B.4: juridico:operate NÃO efetiva elevação de valor', async () => {
      const contractId = await createActiveContract(40000);
      const { token } = await createUserToken({ juridico: 'operate' });

      const aditivo = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/addendums`)
        .set('Authorization', `Bearer ${token}`)
        .send({ change_type: 'value', new_value: 5000000, description: 'Aditivo de valor' });

      expect(aditivo.status).toBe(422);

      const contrato = await api()
        .get(`${JUR_BASE}/contracts/${contractId}`)
        .set('Authorization', `Bearer ${authToken()}`);
      expect(Number(contrato.body.data.value)).toBe(40000);
    });

    it('R3(c): as aprovações da faixa antiga são invalidadas (histórico preservado)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { JurContractApproval } = require('../../src/models/index');

      const criador = await createUserToken({ juridico: 'approve' });
      const contractId = await createActivatableContract(200000, criador.token);
      const diretor = await createUserToken({ diretor: 'approve' });

      const aprovacao = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/approve`)
        .set('Authorization', `Bearer ${diretor.token}`)
        .send({ role: 'diretor' });
      expect(aprovacao.status).toBe(201);

      const ativacao = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/activate`)
        .set('Authorization', `Bearer ${criador.token}`)
        // Ver nota em R4(b): responsible_user_id so entra na ativacao.
        .send({ responsible_user_id: 1 });
      expect(ativacao.status).toBe(200);

      const aditivo = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/addendums`)
        .set('Authorization', `Bearer ${criador.token}`)
        .send({ change_type: 'value', new_value: 5000000, description: 'Aditivo de valor' });
      expect(aditivo.status).toBe(201);

      expect(await countApprovals(contractId)).toBe(0);
      const todas = await JurContractApproval.findAll({ where: { contract_id: contractId } });
      expect(todas).toHaveLength(1);
      expect(todas[0].invalidated_at).toBeTruthy();
    });

    it('R3(e): aditivo que NÃO altera valor continua funcionando', async () => {
      const contractId = await createActiveContract(40000);
      const { token } = await createUserToken({ juridico: 'operate' });

      const aditivo = await api()
        .post(`${JUR_BASE}/contracts/${contractId}/addendums`)
        .set('Authorization', `Bearer ${token}`)
        .send({ change_type: 'term', new_end_date: '2028-08-31', description: 'Prorrogacao simples' });

      expect(aditivo.status).toBe(201);

      const contrato = await api()
        .get(`${JUR_BASE}/contracts/${contractId}`)
        .set('Authorization', `Bearer ${authToken()}`);
      expect(contrato.body.data.status).toBe('active');
    });
  });

  // ------------------------------------------------------------------
  // R1 — política configurável por endpoint (Falha 1)
  // ------------------------------------------------------------------

  describe('R1 — RF-JUR-003: alçada configurável pelos endpoints do contrato de API (Falha 1)', () => {
    it('GET /settings/approval-thresholds devolve as faixas vigentes e o histórico', async () => {
      const response = await api()
        .get(`${JUR_BASE}/settings/approval-thresholds`)
        .set('Authorization', `Bearer ${authToken()}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.rules)).toBe(true);
      expect(response.body.data.rules.length).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data.history)).toBe(true);
    });

    it('PUT /settings/approval-thresholds exige nível approve (juridico:operate → 403)', async () => {
      const { token } = await createUserToken({ juridico: 'operate' });

      const response = await api()
        .put(`${JUR_BASE}/settings/approval-thresholds`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rules: [{ contract_type: '*', min_value: 0, max_value: null, required_roles: [] }] });

      expect(response.status).toBe(403);
    });

    it('PUT rejeita política vazia (validação server-side, fail-closed)', async () => {
      const response = await api()
        .put(`${JUR_BASE}/settings/approval-thresholds`)
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ rules: [] });

      expect(response.status).toBe(400);
    });

    it('PUT rejeita papel inválido em required_roles (validação server-side)', async () => {
      const response = await api()
        .put(`${JUR_BASE}/settings/approval-thresholds`)
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ rules: [{ contract_type: '*', min_value: 0, max_value: null, required_roles: ['presidente'] }] });

      expect(response.status).toBe(400);
    });

    it('PUT rejeita lacuna entre faixas do mesmo contract_type', async () => {
      const response = await api()
        .put(`${JUR_BASE}/settings/approval-thresholds`)
        .set('Authorization', `Bearer ${authToken()}`)
        .send({
          reason: 'Regressao FIND-ERP-005 gap',
          rules: [
            { contract_type: '*', min_value: 0, max_value: 50000, required_roles: [], required_level: 'approve' },
            { contract_type: '*', min_value: 300000, max_value: null, required_roles: ['diretor'], required_level: 'approve' },
          ],
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toMatch(/grupo "\*".*lacuna/i);
    });

    it('PUT rejeita sobreposição entre faixas do mesmo contract_type', async () => {
      const response = await api()
        .put(`${JUR_BASE}/settings/approval-thresholds`)
        .set('Authorization', `Bearer ${authToken()}`)
        .send({
          reason: 'Regressao FIND-ERP-005 overlap',
          rules: [
            { contract_type: '*', min_value: 0, max_value: 100000, required_roles: [], required_level: 'approve' },
            { contract_type: '*', min_value: 50000, max_value: 200000, required_roles: ['diretor'], required_level: 'approve' },
          ],
        });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toMatch(/grupo "\*".*sobreposi/i);
    });

    it('R1(b): alterar a configuração muda o comportamento de activate SEM deploy', async () => {
      const original = await api()
        .get(`${JUR_BASE}/settings/approval-thresholds`)
        .set('Authorization', `Bearer ${authToken()}`);
      expect(original.status).toBe(200);
      const regrasOriginais = original.body.data.rules;

      try {
        const alterada = await api()
          .put(`${JUR_BASE}/settings/approval-thresholds`)
          .set('Authorization', `Bearer ${authToken()}`)
          .send({
            reason: 'Regressao FIND-ERP-005 R1(b)',
            rules: [
              { contract_type: '*', min_value: 0, max_value: 1000, required_roles: [], required_level: 'approve' },
              { contract_type: '*', min_value: 1000, max_value: null, required_roles: ['diretor'], required_level: 'approve' },
            ],
          });
        expect(alterada.status).toBe(200);

        // Contrato de R$ 10.000 — na política ORIGINAL não exigiria nada.
        const criador = await createUserToken({ juridico: 'approve' });
        const contractId = await createActivatableContract(10000, criador.token);
        const ativacao = await api()
          .post(`${JUR_BASE}/contracts/${contractId}/activate`)
          .set('Authorization', `Bearer ${criador.token}`)
          .send({});

        expect(ativacao.status).toBe(422);
        expect(ativacao.body?.details?.rule ?? ativacao.body?.error?.details?.rule).toBe('RF-JUR-003');
      } finally {
        // Restaura a política original — a suíte não pode deixar o banco de
        // teste com alçada alterada para as demais suítes.
        const restore = await api()
          .put(`${JUR_BASE}/settings/approval-thresholds`)
          .set('Authorization', `Bearer ${authToken()}`)
          .send({ reason: 'Restauracao pos-regressao FIND-ERP-005', rules: regrasOriginais });
        expect(restore.status).toBe(200);
      }
    });

    it('R1(c): tipos de contrato diferentes podem ter alçadas diferentes', async () => {
      const original = await api()
        .get(`${JUR_BASE}/settings/approval-thresholds`)
        .set('Authorization', `Bearer ${authToken()}`);
      const regrasOriginais = original.body.data.rules;

      try {
        const alterada = await api()
          .put(`${JUR_BASE}/settings/approval-thresholds`)
          .set('Authorization', `Bearer ${authToken()}`)
          .send({
            reason: 'Regressao FIND-ERP-005 R1(c)',
            rules: [
              ...regrasOriginais,
              { contract_type: 'rental', min_value: 0, max_value: 1000, required_roles: [], required_level: 'approve' },
              { contract_type: 'rental', min_value: 1000, max_value: null, required_roles: ['diretor'], required_level: 'approve' },
            ],
          });
        expect(alterada.status).toBe(200);

        const comercial = await createActivatableContract(10000);
        const situacao = await api()
          .get(`${JUR_BASE}/contracts/${comercial}/approvals`)
          .set('Authorization', `Bearer ${authToken()}`);
        expect(situacao.body.data.required_roles).toEqual([]);
      } finally {
        const restore = await api()
          .put(`${JUR_BASE}/settings/approval-thresholds`)
          .set('Authorization', `Bearer ${authToken()}`)
          .send({ reason: 'Restauracao pos-regressao FIND-ERP-005', rules: regrasOriginais });
        expect(restore.status).toBe(200);
      }
    });
  });
});
