/**
 * Regressão de `FIND-ERP-005` (RF-JUR-003 — alçada de aprovação de contrato
 * jurídico), remediação SanaCore do caso `ERP-LEGACY-001-CASE-002`,
 * autorizada por `APR-2026-021` Partes B e C.
 *
 * ## O que este arquivo cobre e o que NÃO cobre
 *
 * O finding registra que "nenhuma das 4 falhas é detectável pela suíte
 * atual", e a triagem explicou por quê: as Falhas 2 e 4 vivem parcialmente
 * na rota/controller e são invisíveis a teste que instancie o use case
 * diretamente. Por isso a regressão está dividida em DOIS arquivos:
 *
 * | Bloco do reteste | Onde é exercitado |
 * |---|---|
 * | R1(a)-(e), R2(e), R3(a)-(c)(e), R4(a)-(d), R5(a)(b) | **este arquivo** (sem banco) |
 * | R2(a)-(d), R4(a)-(c) por HTTP autenticado, R1(b) via endpoint | `tests/integration/jur-contract-authority-find-erp-005.test.ts` (exige API + `erp_evok_audio_test`) |
 *
 * Este arquivo roda **sem banco e sem API**, de propósito: é a parte da
 * evidência que existe mesmo com a lacuna de infraestrutura declarada
 * (`L-T1` — `psql`/Docker indisponíveis). Ele NÃO substitui o reteste
 * dinâmico da VeriCore (R6(d)); apenas garante que a regressão fique
 * versionada e detectável no CI.
 *
 * @group unit
 */

import fs from 'fs';
import path from 'path';

import {
  resolveApprovalPolicy,
  selectEffectiveRules,
  resolveContractApprovalPolicy,
  type ApprovalThresholdRule,
} from '../../src/modules/juridico/domain/approvalPolicy';

const ActivateContractUseCase = require('../../src/modules/juridico/application/use-cases/contract/ActivateContractUseCase');
const ApproveContractUseCase = require('../../src/modules/juridico/application/use-cases/contract/ApproveContractUseCase');
const CreateContractAddendumUseCase = require('../../src/modules/juridico/application/use-cases/contract/CreateContractAddendumUseCase');
const contractController = require('../../src/modules/juridico/presentation/controllers/contractController');
const { BusinessRuleError } = require('../../src/errors');

/**
 * Lê um arquivo-fonte **removendo comentários**.
 *
 * R1(a) proíbe limiar de alçada como LITERAL DE CÓDIGO; a prosa dos
 * cabeçalhos precisa continuar podendo citar "50.000 / 300.000" para explicar
 * de onde os valores saíram — documentar a história do finding não é
 * reintroduzi-lo.
 *
 * @param relativePath - Caminho relativo a `server/tests/unit`.
 * @returns Código sem comentários de bloco nem de linha.
 */
function readSourceWithoutComments(relativePath: string): string {
  const source = fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

// --------------------------------------------------------------------------
// Fixtures — os VALORES de negócio vivem aqui (e em `jur_approval_thresholds`),
// nunca mais em `server/src/**/constants.ts` (R1(a)).
// --------------------------------------------------------------------------

/** Reproduz o seed da migration `20260814-000048` (política default `'*'`). */
function defaultPolicyRules(): ApprovalThresholdRule[] {
  return [
    { id: 1, contract_type: '*', min_value: 0, max_value: 50000, required_roles: [], required_level: 'approve', active: true },
    { id: 2, contract_type: '*', min_value: 50000, max_value: 300000, required_roles: ['diretor'], required_level: 'approve', active: true },
    { id: 3, contract_type: '*', min_value: 300000, max_value: null, required_roles: ['diretor', 'financeiro'], required_level: 'approve', active: true },
  ];
}

function makeThresholdRepository(rules: ApprovalThresholdRule[] = defaultPolicyRules()) {
  return { listAll: jest.fn(async () => rules) };
}

function makeContract(overrides: Partial<any> = {}) {
  return {
    id: 900,
    contract_number: 'F5-0001',
    // `contract_type` fora de employment/supplier/nda para não arrastar o
    // checklist de cláusulas (RF-JUR-010) para dentro dos testes de alçada.
    contract_type: 'commercial',
    status: 'draft',
    value: '10000.00',
    end_date: null,
    alert_advance_days: 60,
    renewal_auto: false,
    notice_days: null,
    adjustment_index: 'none',
    adjustment_base_date: null,
    responsible_user_id: 12,
    clause_checklist: null,
    signed_at: null,
    created_by: 777,
    ...overrides,
  };
}

function makeContractRepository(overrides: Partial<any> = {}) {
  let state = overrides.initialContract ?? makeContract();
  return {
    findById: jest.fn(async () => state),
    update: jest.fn(async (id: any, data: any) => { state = { ...state, ...data, id }; return state; }),
    countPartySignatories: jest.fn(async () => 2),
    hasSignedDocument: jest.fn(async () => true),
    countAddendums: jest.fn(async () => 0),
    addAddendum: jest.fn(async (data: any) => ({ id: 1, ...data })),
    currentState: () => state,
    ...overrides,
  };
}

function makeApprovalRepository(initialApprovals: any[] = []) {
  const approvals: any[] = [...initialApprovals];
  return {
    listByContract: jest.fn(async () => approvals.filter((a) => !a.invalidated_at)),
    listAllByContract: jest.fn(async () => approvals),
    findByContractAndRole: jest.fn(async (_id: any, role: string) => approvals.find((a) => a.approver_role === role && !a.invalidated_at) ?? null),
    invalidateByContract: jest.fn(async (_id: any, meta: any) => {
      let count = 0;
      approvals.forEach((approval) => {
        if (!approval.invalidated_at) {
          approval.invalidated_at = new Date();
          approval.invalidated_reason = meta.reason;
          count += 1;
        }
      });
      return count;
    }),
    create: jest.fn(async (data: any) => { const approval = { id: approvals.length + 1, ...data }; approvals.push(approval); return approval; }),
    rows: approvals,
  };
}

function makeAlertRepository() {
  return { create: jest.fn(async (data: any) => ({ id: 1, ...data })) };
}

// ==========================================================================
// FALHA 1 — alçada configurável (R1)
// ==========================================================================

describe('FIND-ERP-005 / Falha 1 — RF-JUR-003: alçada vem de configuração, não de literais (R1)', () => {
  it('R1(a): nenhum limiar de alçada permanece como literal em domain/constants.ts', () => {
    const source = readSourceWithoutComments('../../src/modules/juridico/domain/constants.ts');
    expect(source).not.toMatch(/50000\b/);
    expect(source).not.toMatch(/300000\b/);
    expect(source).not.toMatch(/JUR_APPROVAL_THRESHOLD_(DIRECTOR|FINANCE)\s*=/);
    // E a função pura que os interpretava não existe mais aqui.
    expect(source).not.toMatch(/export function requiredApproverRoles/);
  });

  it('R1(a): o interpretador de política não contém limiar de negócio embutido', () => {
    const source = readSourceWithoutComments('../../src/modules/juridico/domain/approvalPolicy.ts');
    expect(source).not.toMatch(/50000\b/);
    expect(source).not.toMatch(/300000\b/);
  });

  it('R1(a): nenhum use case do fluxo de alçada carrega limiar literal', () => {
    const arquivos = [
      '../../src/modules/juridico/application/use-cases/contract/ActivateContractUseCase.ts',
      '../../src/modules/juridico/application/use-cases/contract/ApproveContractUseCase.ts',
      '../../src/modules/juridico/application/use-cases/contract/CreateContractAddendumUseCase.ts',
      '../../src/modules/juridico/application/use-cases/contract/ListContractApprovalsUseCase.ts',
    ];
    arquivos.forEach((arquivo) => {
      const source = readSourceWithoutComments(arquivo);
      expect(source).not.toMatch(/50000\b/);
      expect(source).not.toMatch(/300000\b/);
    });
  });

  it('R1(b): alterar a configuração muda o comportamento SEM deploy (mesmo código, outra política)', async () => {
    const contract = makeContract({ value: '10000.00' });

    const comDefault = resolveApprovalPolicy(defaultPolicyRules(), { value: contract.value, contractType: contract.contract_type });
    expect(comDefault.requiredRoles).toEqual([]);

    // Mesma versão do código, política nova: limiar cai para R$ 5.000.
    const politicaNova: ApprovalThresholdRule[] = [
      { id: 10, contract_type: '*', min_value: 0, max_value: 5000, required_roles: [], required_level: 'approve', active: true },
      { id: 11, contract_type: '*', min_value: 5000, max_value: null, required_roles: ['diretor'], required_level: 'approve', active: true },
    ];
    const comNova = resolveApprovalPolicy(politicaNova, { value: contract.value, contractType: contract.contract_type });
    expect(comNova.requiredRoles).toEqual(['diretor']);
  });

  it('R1(b): o gate de ativação obedece à política configurada, não a constantes', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '10000.00' }) });
    const politicaRestritiva: ApprovalThresholdRule[] = [
      { id: 20, contract_type: '*', min_value: 0, max_value: 1000, required_roles: [], required_level: 'approve', active: true },
      { id: 21, contract_type: '*', min_value: 1000, max_value: null, required_roles: ['diretor'], required_level: 'approve', active: true },
    ];

    await expect(
      new ActivateContractUseCase(repo, makeAlertRepository(), makeApprovalRepository(), makeThresholdRepository(politicaRestritiva))
        .execute({ id: 900, approverHasApprove: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('R1(c): tipos de contrato diferentes com o MESMO valor recebem alçadas diferentes', () => {
    const rules: ApprovalThresholdRule[] = [
      ...defaultPolicyRules(),
      { id: 30, contract_type: 'rental', min_value: 0, max_value: 1000, required_roles: [], required_level: 'approve', active: true },
      { id: 31, contract_type: 'rental', min_value: 1000, max_value: null, required_roles: ['diretor', 'financeiro'], required_level: 'approve', active: true },
    ];

    const comercial = resolveApprovalPolicy(rules, { value: 20000, contractType: 'commercial' });
    const locacao = resolveApprovalPolicy(rules, { value: 20000, contractType: 'rental' });

    expect(comercial.requiredRoles).toEqual([]);
    expect(locacao.requiredRoles).toEqual(['diretor', 'financeiro']);
  });

  it('R1(c): regra específica por contract_type tem precedência TOTAL sobre a regra curinga', () => {
    const rules: ApprovalThresholdRule[] = [
      ...defaultPolicyRules(),
      { id: 40, contract_type: 'rental', min_value: 0, max_value: null, required_roles: [], required_level: 'approve', active: true },
    ];
    const efetivas = selectEffectiveRules(rules, 'rental', '2026-08-14');
    expect(efetivas.map((rule) => rule.id)).toEqual([40]);
  });

  it('R1: vigência é respeitada (regra fora de vigência não entra)', () => {
    const rules: ApprovalThresholdRule[] = [
      { id: 50, contract_type: '*', min_value: 0, max_value: null, required_roles: ['diretor'], required_level: 'approve', active: true, valid_from: '2027-01-01' },
    ];
    expect(selectEffectiveRules(rules, 'commercial', '2026-08-14')).toEqual([]);
    expect(selectEffectiveRules(rules, 'commercial', '2027-06-01')).toHaveLength(1);
  });

  it('R1: regra inativa não entra', () => {
    const rules: ApprovalThresholdRule[] = [
      { id: 60, contract_type: '*', min_value: 0, max_value: null, required_roles: ['diretor'], required_level: 'approve', active: false },
    ];
    expect(selectEffectiveRules(rules, 'commercial', '2026-08-14')).toEqual([]);
  });

  it('R1 + R5: política vazia é FAIL-CLOSED — não "libera por não haver regra"', () => {
    expect(() => resolveApprovalPolicy([], { value: 5000000, contractType: 'commercial' }))
      .toThrow(/n[ãa]o configurada/i);
  });

  it('R1 + R5: repositório de política ausente é FAIL-CLOSED', async () => {
    await expect(resolveContractApprovalPolicy(undefined, { value: 5000000, contract_type: 'commercial' }))
      .rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('R1(d): a alçada vigente no momento da ativação fica registrada no contrato', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '150000.00' }) });
    const approvalRepo = makeApprovalRepository([
      { id: 1, contract_id: 900, approver_role: 'diretor', approver_user_id: 5, approved_value: '150000.00' },
    ]);

    await new ActivateContractUseCase(repo, makeAlertRepository(), approvalRepo, makeThresholdRepository())
      .execute({ id: 900, approverHasApprove: false });

    const snapshotCall = repo.update.mock.calls.find((call: any[]) => call[1]?.approval_policy_snapshot);
    expect(snapshotCall).toBeDefined();
    const snapshot = snapshotCall![1].approval_policy_snapshot;
    expect(snapshot.matched_rule_id).toBe(2);
    expect(snapshot.matched_rule.required_roles).toEqual(['diretor']);
    expect(snapshot.evaluated_value).toBe(150000);
    expect(snapshot.effective_rule_ids).toEqual([1, 2, 3]);
  });

  it('preserva o comportamento observável das 3 faixas do seed (não-regressão de RF-JUR-003)', () => {
    const rules = defaultPolicyRules();
    const roles = (value: number) => resolveApprovalPolicy(rules, { value, contractType: 'commercial' }).requiredRoles;

    expect(roles(50000)).toEqual([]);
    expect(roles(50000.01)).toEqual(['diretor']);
    expect(roles(300000)).toEqual(['diretor']);
    expect(roles(300000.01)).toEqual(['diretor', 'financeiro']);
  });
});

// ==========================================================================
// FALHA 2 — nível exigido (R2(e)) e fail-closed (R5)
// ==========================================================================

describe('FIND-ERP-005 / Falha 2 — RF-JUR-003: aprovação exige NÍVEL approve, não presença de módulo (R2(e))', () => {
  const resolveRoles = contractController.__test__resolveAvailableApproverRoles;

  /**
   * VIA DECLARADA (exigência da nota de R2(e) na triagem): os vetores são
   * exercitados por **teste unitário da função de resolução de papel**, não
   * por injeção direta em `access_profile_permissions`. Motivo: o nível é um
   * enum (`'operate' | 'approve'`) e a maioria destes valores não é
   * inserível por perfil normal — testá-los pelo banco exigiria corromper
   * deliberadamente o schema. A via HTTP (403 + zero registro) está no
   * arquivo de integração.
   */
  const vetores: Array<[string, unknown]> = [
    ["'operate' (o nível real mais baixo — era o vetor do finding)", 'operate'],
    ["'read'", 'read'],
    ["string vazia", ''],
    ['0', 0],
    ["'Approve' (capitalização)", 'Approve'],
    ["'APPROVE' (maiúsculas)", 'APPROVE'],
    ["' approve ' (espaços)", ' approve '],
    ['true (booleano)', true],
    ["['approve'] (array)", ['approve']],
    ['{} (objeto vazio)', {}],
    ['null', null],
    ['undefined', undefined],
  ];

  it.each(vetores)('rejeita %s como nível de aprovador (diretor e financeiro)', (_label, value) => {
    const req: any = { user: { id: 5, role: 'operator', permissions: { diretor: value, financeiro: value } } };
    expect(resolveRoles(req)).toEqual([]);
  });

  it("aceita exatamente 'approve' — e só ele", () => {
    const req: any = { user: { id: 5, role: 'operator', permissions: { diretor: 'approve', financeiro: 'approve' } } };
    expect(resolveRoles(req)).toEqual(['diretor', 'financeiro']);
  });

  it('resolve apenas o papel que tem approve, quando os níveis diferem', () => {
    const req: any = { user: { id: 5, role: 'operator', permissions: { diretor: 'approve', financeiro: 'operate' } } };
    expect(resolveRoles(req)).toEqual(['diretor']);
  });

  it('a rota POST /contracts/:id/approve declara requiredLevel approve nos DOIS candidatos', () => {
    const source = readSourceWithoutComments('../../src/modules/juridico/presentation/routes/juridico.ts');
    const inicio = source.indexOf("'/contracts/:id/approve'");
    expect(inicio).toBeGreaterThan(-1);
    const bloco = source.slice(inicio, source.indexOf('contractController.approve', inicio));
    expect(bloco).toMatch(/moduleKey: 'diretor', requiredLevel: 'approve'/);
    expect(bloco).toMatch(/moduleKey: 'financeiro', requiredLevel: 'approve'/);
    // O GET de consulta da alçada permanece em `operate` — blast radius 1 rota.
    const getIndex = source.indexOf("'/contracts/:id/approvals'");
    const getBloco = source.slice(getIndex, source.indexOf('contractController.listApprovals', getIndex));
    expect(getBloco).not.toMatch(/requiredLevel/);
  });

  it('R5(a)(b): ActivateContractUseCase NÃO pode ser construído sem o repositório que impõe a alçada', () => {
    const repo = makeContractRepository();
    expect(() => new ActivateContractUseCase(repo, makeAlertRepository()))
      .toThrow(/approvalRepository e obrigatorio/i);
    expect(() => new ActivateContractUseCase(repo, makeAlertRepository(), makeApprovalRepository()))
      .toThrow(/thresholdRepository e obrigatorio/i);
  });

  it('R5(b): contrato de R$ 5.000.000 não é ativado por instância sem o gate (a instância nem existe)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '5000000.00' }) });
    // Antes da remediação, isto ATIVAVA o contrato em silêncio.
    expect(() => new ActivateContractUseCase(repo, makeAlertRepository())).toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });
});

// ==========================================================================
// FALHA 3 — aditivo reabre a alçada (R3)
// ==========================================================================

describe('FIND-ERP-005 / Falha 3 — RF-JUR-003/RF-JUR-008: aditivo que eleva valor reabre a alçada (R3)', () => {
  function addendumUseCase(repo: any, approvalRepo: any, rules?: ApprovalThresholdRule[]) {
    return new CreateContractAddendumUseCase(repo, approvalRepo, makeThresholdRepository(rules));
  }

  it('R3(a): contrato active de R$ 40.000 elevado a R$ 5.000.000 NÃO permanece active', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', value: '40000.00' }) });
    const approvalRepo = makeApprovalRepository();

    await addendumUseCase(repo, approvalRepo).execute({
      contractId: 900, change_type: 'value', new_value: 5000000, description: 'Aditivo de valor', createdBy: 1,
      requesterHasApprove: true,
    });

    expect(repo.currentState().status).toBe('in_approval');
    expect(repo.currentState().value).toBe(5000000);
  });

  it('R3(b): VARIANTE CRUZADA — change_type=term carregando new_value é REJEITADO', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', value: '40000.00', end_date: '2027-08-31' }) });
    const approvalRepo = makeApprovalRepository();

    await expect(
      addendumUseCase(repo, approvalRepo).execute({
        contractId: 900, change_type: 'term', new_end_date: '2028-08-31', new_value: 5000000,
        description: 'Prorrogação com valor escondido', createdBy: 1, requesterHasApprove: true,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    // Nenhuma escrita: nem valor, nem aditivo.
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.addAddendum).not.toHaveBeenCalled();
    expect(repo.currentState().value).toBe('40000.00');
  });

  it('R3(c): aprovação da faixa antiga NÃO vale para a faixa nova — é invalidada, com histórico', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', value: '60000.00' }) });
    const approvalRepo = makeApprovalRepository([
      { id: 1, contract_id: 900, approver_role: 'diretor', approver_user_id: 5, approved_value: '60000.00' },
    ]);

    await addendumUseCase(repo, approvalRepo).execute({
      contractId: 900, change_type: 'value', new_value: 5000000, description: 'Aditivo de valor', createdBy: 1,
      requesterHasApprove: true,
    });

    expect(approvalRepo.invalidateByContract).toHaveBeenCalled();
    expect(await approvalRepo.listByContract(900)).toEqual([]);
    // Histórico preservado (não é DELETE).
    const todas = await approvalRepo.listAllByContract(900);
    expect(todas).toHaveLength(1);
    expect(todas[0].invalidated_at).toBeInstanceOf(Date);
    expect(todas[0].invalidated_reason).toMatch(/al[çc]ada reaberta/i);
    expect(repo.currentState().status).toBe('in_approval');
  });

  it('R3(c): a alçada reaberta é a da faixa NOVA, e a ativação volta a exigir os dois papéis', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', value: '60000.00' }) });
    const approvalRepo = makeApprovalRepository([
      { id: 1, contract_id: 900, approver_role: 'diretor', approver_user_id: 5, approved_value: '60000.00' },
    ]);

    await addendumUseCase(repo, approvalRepo).execute({
      contractId: 900, change_type: 'value', new_value: 5000000, description: 'Aditivo', createdBy: 1, requesterHasApprove: true,
    });

    await expect(
      new ActivateContractUseCase(repo, makeAlertRepository(), approvalRepo, makeThresholdRepository())
        .execute({ id: 900, approverHasApprove: true }),
    ).rejects.toMatchObject({ details: expect.objectContaining({ rule: 'RF-JUR-003' }) });
  });

  it('APR-2026-021 B.4: elevar valor sem nível approve é rejeitado (preparação ≠ efetivação)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', value: '40000.00' }) });
    const approvalRepo = makeApprovalRepository();

    await expect(
      addendumUseCase(repo, approvalRepo).execute({
        contractId: 900, change_type: 'value', new_value: 5000000, description: 'Aditivo', createdBy: 1,
        requesterHasApprove: false,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.currentState().value).toBe('40000.00');
  });

  it('APR-2026-021 B.4: REDUZIR valor não exige approve (só a elevação é ato material)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', value: '400000.00' }) });
    const approvalRepo = makeApprovalRepository();

    const addendum = await addendumUseCase(repo, approvalRepo).execute({
      contractId: 900, change_type: 'value', new_value: 10000, description: 'Redução negociada', createdBy: 1,
      requesterHasApprove: false,
    });

    expect(addendum.new_value).toBe(10000);
    expect(repo.currentState().value).toBe(10000);
  });

  it('R3(e): aditivo que NÃO altera valor continua funcionando (sem regressão)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', value: '40000.00', end_date: '2027-08-31' }) });
    const approvalRepo = makeApprovalRepository();

    const addendum = await addendumUseCase(repo, approvalRepo).execute({
      contractId: 900, change_type: 'term', new_end_date: '2028-08-31', description: 'Prorrogação', createdBy: 1,
      requesterHasApprove: false,
    });

    expect(addendum.previous_end_date).toBe('2027-08-31');
    expect(repo.currentState().end_date).toBe('2028-08-31');
    expect(repo.currentState().status).toBe('active');
    expect(approvalRepo.invalidateByContract).not.toHaveBeenCalled();
  });

  it('elevação dentro da MESMA faixa coberta pelas aprovações vivas não reabre a alçada', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ status: 'active', value: '60000.00' }) });
    const approvalRepo = makeApprovalRepository([
      { id: 1, contract_id: 900, approver_role: 'diretor', approver_user_id: 5, approved_value: '250000.00' },
    ]);

    await addendumUseCase(repo, approvalRepo).execute({
      contractId: 900, change_type: 'value', new_value: 200000, description: 'Ajuste dentro do aprovado', createdBy: 1,
      requesterHasApprove: true,
    });

    expect(approvalRepo.invalidateByContract).not.toHaveBeenCalled();
    expect(repo.currentState().status).toBe('active');
  });

  it('fail-closed: o use case do aditivo não pode ser construído sem os repositórios de controle', () => {
    const repo = makeContractRepository();
    expect(() => new CreateContractAddendumUseCase(repo)).toThrow(/obrigatorios/i);
  });
});

// ==========================================================================
// FALHA 4 — segregação de identidade (R4)
// ==========================================================================

describe('FIND-ERP-005 / Falha 4 — RF-JUR-003 + D-K: dupla aprovação exige duas PESSOAS (R4)', () => {
  function approveUseCase(repo: any, approvalRepo: any) {
    return new ApproveContractUseCase(repo, approvalRepo, makeThresholdRepository());
  }

  it('R4(a): a MESMA pessoa registra diretor e é rejeitada ao tentar financeiro — exatamente 1 aprovação', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '5000000.00', created_by: 999 }) });
    const approvalRepo = makeApprovalRepository();
    const adminUserId = 1;

    const primeira = await approveUseCase(repo, approvalRepo).execute({
      contractId: 900, approverUserId: adminUserId, availableRoles: ['diretor', 'financeiro'], desiredRole: 'diretor',
    });
    expect(primeira.approver_role).toBe('diretor');

    await expect(
      approveUseCase(repo, approvalRepo).execute({
        contractId: 900, approverUserId: adminUserId, availableRoles: ['diretor', 'financeiro'], desiredRole: 'financeiro',
      }),
    ).rejects.toMatchObject({ details: expect.objectContaining({ rule: 'D-K-JURIDICO' }) });

    expect(await approvalRepo.listAllByContract(900)).toHaveLength(1);
  });

  it('R4(b): duas pessoas distintas registram os dois papéis e a ativação de R$ 5.000.000 é liberada', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '5000000.00', created_by: 999 }) });
    const approvalRepo = makeApprovalRepository();

    await approveUseCase(repo, approvalRepo).execute({ contractId: 900, approverUserId: 11, availableRoles: ['diretor'] });
    await approveUseCase(repo, approvalRepo).execute({ contractId: 900, approverUserId: 22, availableRoles: ['financeiro'] });

    expect(await approvalRepo.listByContract(900)).toHaveLength(2);

    const contrato = await new ActivateContractUseCase(repo, makeAlertRepository(), approvalRepo, makeThresholdRepository())
      .execute({ id: 900, approverHasApprove: true });
    expect(contrato.status).toBe('active');
  });

  it('R4(c): a rejeição é por IDENTIDADE, não por papel — dois admins DIFERENTES são permitidos', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '5000000.00', created_by: 999 }) });
    const approvalRepo = makeApprovalRepository();

    // Ambos com `role: 'admin'` → `availableRoles` traz os dois papéis.
    await approveUseCase(repo, approvalRepo).execute({
      contractId: 900, approverUserId: 1, availableRoles: ['diretor', 'financeiro'], desiredRole: 'diretor',
    });
    const segunda = await approveUseCase(repo, approvalRepo).execute({
      contractId: 900, approverUserId: 2, availableRoles: ['diretor', 'financeiro'], desiredRole: 'financeiro',
    });

    expect(segunda.approver_role).toBe('financeiro');
    expect(await approvalRepo.listByContract(900)).toHaveLength(2);
  });

  it('R4(d): quem CRIOU o contrato não pode aprová-lo (D-K estendido, APR-2026-021 B.5)', async () => {
    const criadorId = 777;
    const repo = makeContractRepository({ initialContract: makeContract({ value: '150000.00', created_by: criadorId }) });
    const approvalRepo = makeApprovalRepository();

    await expect(
      approveUseCase(repo, approvalRepo).execute({ contractId: 900, approverUserId: criadorId, availableRoles: ['diretor'] }),
    ).rejects.toMatchObject({ details: expect.objectContaining({ rule: 'D-K-JURIDICO' }) });

    expect(await approvalRepo.listAllByContract(900)).toHaveLength(0);
  });

  it('R4: `admin` NÃO é exceção — identidade não é concedível', async () => {
    const criadorId = 777;
    const repo = makeContractRepository({ initialContract: makeContract({ value: '5000000.00', created_by: criadorId }) });
    const approvalRepo = makeApprovalRepository();

    // Mesmo trazendo os dois papéis (curto-circuito de admin), a identidade barra.
    await expect(
      approveUseCase(repo, approvalRepo).execute({
        contractId: 900, approverUserId: criadorId, availableRoles: ['diretor', 'financeiro'], desiredRole: 'diretor',
      }),
    ).rejects.toMatchObject({ details: expect.objectContaining({ rule: 'D-K-JURIDICO' }) });
  });

  it('a aprovação grava o VALOR aprovado (vínculo aprovação ↔ valor, Falha 3)', async () => {
    const repo = makeContractRepository({ initialContract: makeContract({ value: '150000.00', created_by: 999 }) });
    const approvalRepo = makeApprovalRepository();

    const aprovacao = await approveUseCase(repo, approvalRepo).execute({
      contractId: 900, approverUserId: 11, availableRoles: ['diretor'],
    });

    expect(aprovacao.approved_value).toBe('150000.00');
  });

  it('a segregação é verificada ANTES de qualquer escrita (nenhum estado parcial)', async () => {
    const criadorId = 777;
    const repo = makeContractRepository({ initialContract: makeContract({ value: '150000.00', created_by: criadorId }) });
    const approvalRepo = makeApprovalRepository();

    await expect(
      approveUseCase(repo, approvalRepo).execute({ contractId: 900, approverUserId: criadorId, availableRoles: ['diretor'] }),
    ).rejects.toThrow();

    expect(approvalRepo.create).not.toHaveBeenCalled();
  });
});
