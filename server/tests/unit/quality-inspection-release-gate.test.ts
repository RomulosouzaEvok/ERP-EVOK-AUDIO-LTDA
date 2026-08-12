/**
 * G7 — a inspecao de qualidade como entidade + gate de liberacao de lote
 * (decisao D-H do dono do produto em 2026-08-10,
 * `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4).
 *
 * O que estas suites provam:
 *
 * 1. **Liberar sem inspecao aprovada e bloqueado E NADA e gravado** — o
 *    criterio de aceite explicito desta entrega. Nao basta lancar erro: se o
 *    caso de uso escrevesse antes de checar, o lote ficaria liberado no
 *    banco e ainda devolveria 422.
 * 2. A regra e "a inspecao MAIS RECENTE", nao "existe alguma aprovada" —
 *    senao um lote aprovado na entrada e reprovado depois continuaria
 *    liberavel para sempre (ISO 9001 8.7).
 * 3. Quem autoriza a liberacao vem do JWT, e e gravado no lote
 *    (`released_by`), junto com a inspecao que autorizou
 *    (`release_inspection_id`) — a rastreabilidade que a ISO 9001 8.6 exige.
 * 4. Aceitacao sob concessao (8.7) e um veredito proprio, com justificativa
 *    obrigatoria — nunca um "release com observacao".
 * 5. Reprovacao NAO reimplementa bloqueio de lote/RNC: delega ao caminho ja
 *    existente do G8/G10 (`CreateNonConformityUseCase`).
 *
 * ⚠️ Todo teste de erro afirma `details.rule === 'G7'`. Sem isso, um mock
 * incompleto que derrubasse o caso de uso com `TypeError` faria o teste
 * passar pelo motivo errado.
 *
 * @module tests/unit/quality-inspection-release-gate
 */

const createNonConformityExecute = jest.fn(async () => ({ id: 909 }));

/**
 * Transacao dubl. `ReleaseLotUseCase` passou a abrir transacao propria e a
 * travar a linha do lote (2026-08-11) — sem este mock o teste unitario
 * tentaria conectar no Postgres de verdade.
 */
const mockTransaction = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: jest.fn(async () => {}),
  rollback: jest.fn(async () => {}),
};

jest.mock('../../src/config/database', () => ({
  sequelize: { transaction: jest.fn(async () => mockTransaction) },
}));

jest.mock('../../src/modules/nonConformities/application/use-cases/CreateNonConformityUseCase', () =>
  jest.fn().mockImplementation(() => ({ execute: createNonConformityExecute })));

jest.mock('../../src/modules/nonConformities/infrastructure/sequelize/SequelizeNonConformitiesRepository', () =>
  jest.fn().mockImplementation(() => ({})));

import ReleaseLotUseCase = require('../../src/modules/inventory/application/use-cases/ReleaseLotUseCase');
import CreateQualityInspectionUseCase = require('../../src/modules/quality/application/use-cases/CreateQualityInspectionUseCase');
import GetLotReleaseEligibilityUseCase = require('../../src/modules/quality/application/use-cases/GetLotReleaseEligibilityUseCase');
import ListQualityInspectionsUseCase = require('../../src/modules/quality/application/use-cases/ListQualityInspectionsUseCase');
import { BusinessRuleError, NotFoundError, ValidationError } from '../../src/errors';
import {
  decideLotRelease,
  INSPECTION_VERDICTS,
  QUALITY_INSPECTION_RULE,
  RELEASING_VERDICTS,
} from '../../src/modules/quality/domain/constants';

/**
 * Monta um lote mockado com `update` espionado.
 *
 * @param overrides - Campos a sobrescrever (ex.: `status`).
 */
function buildLot(overrides: Record<string, any> = {}) {
  return {
    id: 77,
    lot_number: 'LOT-2026-077',
    product_id: 10,
    supplier_id: 3,
    status: 'quarantine',
    quantity_initial: '500',
    notes: null,
    update: jest.fn(async function (this: any, values: any) { Object.assign(this, values); return this; }),
    ...overrides,
  };
}

/**
 * Repositorio de estoque mockado — PROPOSITALMENTE completo para o caminho
 * exercitado, para que uma falha nunca venha de metodo ausente.
 *
 * `findLotByIdForUpdate` e o metodo que a liberacao usa desde 2026-08-11 (a
 * leitura passou a travar a linha, `FOR UPDATE`, dentro da transacao);
 * `findLotById` continua no dubl. porque outros caminhos ainda o usam.
 *
 * @param lot - Lote devolvido pelas duas leituras.
 */
function buildInventoryRepository(lot: any) {
  return {
    findLotById: jest.fn(async () => lot),
    findLotByIdForUpdate: jest.fn(async () => lot),
  };
}

/**
 * Gateway de inspecao mockado.
 *
 * @param inspection - Inspeccao mais recente do lote (ou `null`).
 */
function buildQualityGateway(inspection: any) {
  return { findLatestInspectionForLot: jest.fn(async () => inspection) };
}

/**
 * Repositorio de qualidade mockado, completo para `CreateQualityInspectionUseCase`.
 *
 * @param options - `lot` devolvido por `findLotById`.
 */
function buildQualityRepository({ lot = buildLot() }: { lot?: any } = {}) {
  const created: any[] = [];
  return {
    created,
    findLotById: jest.fn(async () => lot),
    createInspection: jest.fn(async (data: any) => {
      const record = { id: 101, ...data };
      created.push(record);
      return record;
    }),
    updateInspection: jest.fn(async (id: any, data: any) => ({ id, ...data })),
    findInspectionById: jest.fn(async () => null),
    findLatestInspectionForLot: jest.fn(async () => null),
    listInspections: jest.fn(async () => ({ rows: [], count: 0 })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  createNonConformityExecute.mockResolvedValue({ id: 909 });
});

describe('G7 — regra pura do gate (decideLotRelease)', () => {
  it('sem inspecao nenhuma, a liberacao e recusada com motivo no_inspection', () => {
    expect(decideLotRelease(null)).toEqual({
      allowed: false,
      reason: 'no_inspection',
      inspectionId: null,
      verdict: null,
    });
  });

  it('aprovacao e aceitacao sob concessao liberam; reprovacao nao', () => {
    expect(decideLotRelease({ id: 1, verdict: 'approved' }).allowed).toBe(true);
    expect(decideLotRelease({ id: 2, verdict: 'approved_under_concession' }).allowed).toBe(true);
    expect(decideLotRelease({ id: 3, verdict: 'rejected' })).toEqual({
      allowed: false,
      reason: 'last_inspection_rejected',
      inspectionId: 3,
      verdict: 'rejected',
    });
  });

  it('os vereditos que liberam sao um subconjunto dos vereditos validos (guarda de enum)', () => {
    for (const verdict of RELEASING_VERDICTS) {
      expect(INSPECTION_VERDICTS).toContain(verdict);
    }
    // Reprovacao NUNCA pode liberar — se alguem acrescentar 'rejected' a
    // RELEASING_VERDICTS por engano, o gate inteiro vira decoracao.
    expect(RELEASING_VERDICTS as readonly string[]).not.toContain('rejected');
  });
});

describe('G7 — ReleaseLotUseCase: liberar sem inspecao aprovada e bloqueado e NADA e gravado', () => {
  it('lote em quarentena SEM nenhuma inspecao: recusa com details.rule G7 e nao chama update', async () => {
    const lot = buildLot();
    const useCase = new ReleaseLotUseCase(buildInventoryRepository(lot), buildQualityGateway(null));

    await expect(useCase.execute({ id: 77, notes: 'Liberado', releasedBy: 42 })).rejects.toMatchObject({
      constructor: BusinessRuleError,
      details: {
        rule: QUALITY_INSPECTION_RULE,
        lot_id: 77,
        reason: 'no_inspection',
        inspection_id: null,
      },
    });

    // O criterio de aceite: nada gravado.
    expect(lot.update).not.toHaveBeenCalled();
    expect(lot.status).toBe('quarantine');
    expect(lot.notes).toBeNull();
  });

  it('lote cuja inspecao MAIS RECENTE reprovou: recusa e nao grava', async () => {
    const lot = buildLot({ status: 'blocked', notes: 'Bloqueado pela RNC #10' });
    const useCase = new ReleaseLotUseCase(
      buildInventoryRepository(lot),
      buildQualityGateway({ id: 55, verdict: 'rejected' })
    );

    await expect(useCase.execute({ id: 77, releasedBy: 42 })).rejects.toMatchObject({
      constructor: BusinessRuleError,
      details: {
        rule: QUALITY_INSPECTION_RULE,
        reason: 'last_inspection_rejected',
        inspection_id: 55,
        inspection_verdict: 'rejected',
      },
    });

    expect(lot.update).not.toHaveBeenCalled();
    expect(lot.status).toBe('blocked');
  });

  it('status invalido continua sendo recusado ANTES de consultar a qualidade (e tambem carrega details.rule)', async () => {
    const lot = buildLot({ status: 'available' });
    const qualityGateway = buildQualityGateway({ id: 1, verdict: 'approved' });
    const useCase = new ReleaseLotUseCase(buildInventoryRepository(lot), qualityGateway);

    await expect(useCase.execute({ id: 77, releasedBy: 42 })).rejects.toMatchObject({
      constructor: BusinessRuleError,
      details: {
        rule: QUALITY_INSPECTION_RULE,
        current_status: 'available',
        allowed_statuses: ['quarantine', 'blocked'],
      },
    });

    expect(qualityGateway.findLatestInspectionForLot).not.toHaveBeenCalled();
    expect(lot.update).not.toHaveBeenCalled();
  });

  it('lote inexistente devolve NotFoundError sem consultar a qualidade', async () => {
    const qualityGateway = buildQualityGateway({ id: 1, verdict: 'approved' });
    const useCase = new ReleaseLotUseCase(
      { findLotByIdForUpdate: jest.fn(async () => null) } as any,
      qualityGateway,
    );

    await expect(useCase.execute({ id: 999, releasedBy: 42 })).rejects.toBeInstanceOf(NotFoundError);
    expect(qualityGateway.findLatestInspectionForLot).not.toHaveBeenCalled();
  });
});

/**
 * Auditoria de 2026-08-11 — a brecha do "bloqueio decorativo".
 *
 * `aprovada -> liberada -> RNC/bloqueio -> release` era CONCEDIDO com a
 * inspecao antiga: ela continuava sendo "a mais recente", e ninguem tinha
 * examinado o material depois do defeito aparecer (ISO 9001 8.7).
 */
describe('G7 — re-liberacao de lote bloqueado exige inspecao POSTERIOR ao bloqueio', () => {
  const BLOQUEIO = new Date('2026-08-11T10:00:00Z');

  it('inspecao aprovada ANTERIOR ao bloqueio nao libera, e nada e gravado', async () => {
    const lot = buildLot({ status: 'blocked', blocked_at: BLOQUEIO });
    const useCase = new ReleaseLotUseCase(
      buildInventoryRepository(lot),
      buildQualityGateway({ id: 88, verdict: 'approved', inspected_at: new Date('2026-08-11T09:00:00Z') }),
    );

    await expect(useCase.execute({ id: 77, releasedBy: 42 })).rejects.toMatchObject({
      constructor: BusinessRuleError,
      details: {
        rule: QUALITY_INSPECTION_RULE,
        reason: 'inspection_before_block',
        inspection_id: 88,
        inspection_verdict: 'approved',
      },
    });

    expect(lot.update).not.toHaveBeenCalled();
    expect(lot.status).toBe('blocked');
  });

  it('inspecao aprovada POSTERIOR ao bloqueio libera e limpa o marcador de bloqueio', async () => {
    const lot = buildLot({ status: 'blocked', blocked_at: BLOQUEIO });
    const useCase = new ReleaseLotUseCase(
      buildInventoryRepository(lot),
      buildQualityGateway({ id: 91, verdict: 'approved', inspected_at: new Date('2026-08-11T11:00:00Z') }),
    );

    await useCase.execute({ id: 77, releasedBy: 42 });

    const written = lot.update.mock.calls[0][0];
    expect(written.status).toBe('available');
    expect(written.release_inspection_id).toBe(91);
    // `blocked_at` descreve o bloqueio VIGENTE: liberado, ele deixa de existir.
    expect(written.blocked_at).toBeNull();
  });

  it('lote em quarentena (sem bloqueio datado) mantem o comportamento antigo', async () => {
    const lot = buildLot({ status: 'quarantine', blocked_at: null });
    const useCase = new ReleaseLotUseCase(
      buildInventoryRepository(lot),
      buildQualityGateway({ id: 5, verdict: 'approved', inspected_at: new Date('2020-01-01T00:00:00Z') }),
    );

    await useCase.execute({ id: 77, releasedBy: 42 });

    expect(lot.update.mock.calls[0][0].status).toBe('available');
  });

  it('regra pura: empate de instante fica do lado seguro (nao libera)', () => {
    const instante = new Date('2026-08-11T10:00:00Z');
    expect(decideLotRelease({ id: 1, verdict: 'approved', inspected_at: instante }, instante)).toMatchObject({
      allowed: false,
      reason: 'inspection_before_block',
    });
  });

  it('regra pura: inspecao SEM data nao supera um bloqueio datado', () => {
    expect(decideLotRelease({ id: 2, verdict: 'approved' }, BLOQUEIO)).toMatchObject({
      allowed: false,
      reason: 'inspection_before_block',
    });
  });
});

describe('G7 — ReleaseLotUseCase: liberacao autorizada grava a evidencia (ISO 9001 8.6)', () => {
  it('com inspecao aprovada, grava status, a inspecao que autorizou, quem autorizou e quando', async () => {
    const lot = buildLot();
    const useCase = new ReleaseLotUseCase(
      buildInventoryRepository(lot),
      buildQualityGateway({ id: 88, verdict: 'approved' })
    );

    await useCase.execute({ id: 77, notes: 'Amostra conforme', releasedBy: 42 });

    expect(lot.update).toHaveBeenCalledTimes(1);
    const written = lot.update.mock.calls[0][0];
    expect(written.status).toBe('available');
    expect(written.release_inspection_id).toBe(88);
    // Anti-spoofing: vem do JWT, nunca do body.
    expect(written.released_by).toBe(42);
    expect(written.released_at).toBeInstanceOf(Date);
  });

  it('aceitacao sob concessao tambem libera, e registra a inspecao de concessao como autorizadora', async () => {
    const lot = buildLot();
    const useCase = new ReleaseLotUseCase(
      buildInventoryRepository(lot),
      buildQualityGateway({ id: 91, verdict: 'approved_under_concession' })
    );

    await useCase.execute({ id: 77, releasedBy: 7 });

    expect(lot.update.mock.calls[0][0]).toMatchObject({
      status: 'available',
      release_inspection_id: 91,
      released_by: 7,
    });
  });
});

describe('G7 — CreateQualityInspectionUseCase: a evidencia exigida pela ISO 9001 8.6', () => {
  it('exige criterio de aceitacao (o campo que substitui a "observacao livre")', async () => {
    const useCase = new CreateQualityInspectionUseCase(buildQualityRepository() as any);

    await expect(useCase.execute({ lot_id: 77, verdict: 'approved', inspectorId: 42 })).rejects.toMatchObject({
      constructor: ValidationError,
      details: { rule: QUALITY_INSPECTION_RULE, field: 'acceptance_criteria' },
    });
  });

  it('exige lot_id — nao existe inspecao desvinculada de lote', async () => {
    const useCase = new CreateQualityInspectionUseCase(buildQualityRepository() as any);

    await expect(useCase.execute({
      verdict: 'approved',
      acceptance_criteria: 'Visual + dimensional',
      inspectorId: 42,
    })).rejects.toMatchObject({
      constructor: ValidationError,
      details: { rule: QUALITY_INSPECTION_RULE, field: 'lot_id' },
    });
  });

  it('recusa veredito fora do ENUM (guarda contra literal errado, que passaria por typecheck)', async () => {
    const useCase = new CreateQualityInspectionUseCase(buildQualityRepository() as any);

    await expect(useCase.execute({
      lot_id: 77,
      verdict: 'aprovado',
      acceptance_criteria: 'Visual + dimensional',
      inspectorId: 42,
    })).rejects.toMatchObject({
      constructor: ValidationError,
      details: { rule: QUALITY_INSPECTION_RULE, field: 'verdict' },
    });
  });

  it('recusa estagio fora do ENUM', async () => {
    const useCase = new CreateQualityInspectionUseCase(buildQualityRepository() as any);

    await expect(useCase.execute({
      lot_id: 77,
      stage: 'recebimento',
      verdict: 'approved',
      acceptance_criteria: 'Visual + dimensional',
      inspectorId: 42,
    })).rejects.toMatchObject({
      constructor: ValidationError,
      details: { rule: QUALITY_INSPECTION_RULE, field: 'stage' },
    });
  });

  it('aceitacao sob concessao SEM justificativa e recusada (ISO 9001 8.7) e nada e gravado', async () => {
    const repository = buildQualityRepository();
    const useCase = new CreateQualityInspectionUseCase(repository as any);

    await expect(useCase.execute({
      lot_id: 77,
      verdict: 'approved_under_concession',
      acceptance_criteria: 'Visual + dimensional',
      inspectorId: 42,
    })).rejects.toMatchObject({
      constructor: ValidationError,
      details: { rule: QUALITY_INSPECTION_RULE, field: 'concession_justification' },
    });

    expect(repository.createInspection).not.toHaveBeenCalled();
  });

  it('lote inexistente devolve NotFoundError com details.rule e nao grava inspecao', async () => {
    const repository = buildQualityRepository();
    repository.findLotById = jest.fn(async () => null);
    const useCase = new CreateQualityInspectionUseCase(repository as any);

    await expect(useCase.execute({
      lot_id: 999,
      verdict: 'approved',
      acceptance_criteria: 'Visual + dimensional',
      inspectorId: 42,
    })).rejects.toMatchObject({
      constructor: NotFoundError,
      details: { rule: QUALITY_INSPECTION_RULE, lot_id: 999 },
    });

    expect(repository.createInspection).not.toHaveBeenCalled();
  });

  it('inspecao aprovada grava criterio, resultado, responsavel (do JWT) e vinculo ao lote', async () => {
    const repository = buildQualityRepository();
    const useCase = new CreateQualityInspectionUseCase(repository as any);

    const inspection = await useCase.execute({
      lot_id: 77,
      stage: 'incoming',
      acceptance_criteria: 'Inspecao visual e dimensional conforme desenho DES-1042 rev. C',
      sampling_plan: 'ISO 2859-1 nivel II',
      sample_size: 20,
      defects_found: 0,
      verdict: 'approved',
      // Tentativa de spoofing: o body NAO pode ditar quem inspecionou.
      inspector_id: 999,
      inspectorId: 42,
    } as any);

    const written = repository.createInspection.mock.calls[0][0];
    expect(written.lot_id).toBe(77);
    expect(written.acceptance_criteria).toContain('DES-1042');
    expect(written.verdict).toBe('approved');
    expect(written.inspector_id).toBe(42);
    expect(written.concession_justification).toBeNull();
    // Tamanho do lote herdado do proprio lote quando nao informado.
    expect(written.lot_size).toBe(500);
    expect(inspection.id).toBe(101);
    // Aprovar NAO libera o lote: liberar e ato separado (ISO 9001 8.6).
    expect(createNonConformityExecute).not.toHaveBeenCalled();
  });

  it('aceitacao sob concessao com justificativa grava a justificativa (evidencia 8.7)', async () => {
    const repository = buildQualityRepository();
    const useCase = new CreateQualityInspectionUseCase(repository as any);

    await useCase.execute({
      lot_id: 77,
      acceptance_criteria: 'Dimensional fora de tolerancia em 0,2mm',
      verdict: 'approved_under_concession',
      concession_justification: 'Desvio aceito pela Engenharia: nao afeta montagem do conjunto magnetico.',
      inspectorId: 42,
    });

    const written = repository.createInspection.mock.calls[0][0];
    expect(written.verdict).toBe('approved_under_concession');
    expect(written.concession_justification).toContain('Engenharia');
  });
});

describe('G7 — reprovacao integra com G8/G10 em vez de reimplementar', () => {
  it('verdict rejected delega a CreateNonConformityUseCase (que ja bloqueia o lote) e guarda o vinculo', async () => {
    const repository = buildQualityRepository();
    const useCase = new CreateQualityInspectionUseCase(repository as any);

    const result = await useCase.execute({
      lot_id: 77,
      stage: 'incoming',
      acceptance_criteria: 'Resistencia DC 5,6 +/- 0,3 ohm',
      sample_size: 20,
      defects_found: 4,
      verdict: 'rejected',
      inspectorId: 42,
    });

    expect(createNonConformityExecute).toHaveBeenCalledTimes(1);
    const ncPayload = createNonConformityExecute.mock.calls[0][0] as any;
    // O bloqueio do lote acontece la dentro, por (product_id, lot_number) —
    // e por isso que os dois campos precisam ir juntos (licao do G10).
    expect(ncPayload.product_id).toBe(10);
    expect(ncPayload.lot_number).toBe('LOT-2026-077');
    expect(ncPayload.reportedBy).toBe(42);
    // `origin` e repassado do estagio: conferido contra o ENUM de
    // `non_conformities.origin`.
    expect(ncPayload.origin).toBe('incoming');

    expect(repository.updateInspection).toHaveBeenCalledWith(101, { non_conformity_id: 909 });
    expect(result.non_conformity_id).toBe(909);
  });

  it('estagio final vira origin=final na RNC (literais alinhados aos dois ENUMs)', async () => {
    const repository = buildQualityRepository();
    const useCase = new CreateQualityInspectionUseCase(repository as any);

    await useCase.execute({
      lot_id: 77,
      stage: 'final',
      acceptance_criteria: 'Teste funcional 100%',
      verdict: 'rejected',
      inspectorId: 42,
    });

    expect((createNonConformityExecute.mock.calls[0][0] as any).origin).toBe('final');
  });
});

describe('G7 — leitura sem efeito colateral (GET .../release-eligibility)', () => {
  it('informa que o lote NAO pode ser liberado, com o motivo, sem gravar nada', async () => {
    const lot = buildLot();
    const repository = buildQualityRepository({ lot });
    const useCase = new GetLotReleaseEligibilityUseCase(repository as any);

    const result = await useCase.execute({ lotId: 77 });

    expect(result).toMatchObject({
      rule: QUALITY_INSPECTION_RULE,
      lot_id: 77,
      lot_status: 'quarantine',
      status_allows_release: true,
      quality_gate_passed: false,
      can_release: false,
      reason: 'no_inspection',
      latest_inspection: null,
    });
    expect(lot.update).not.toHaveBeenCalled();
  });

  it('com inspecao aprovada, devolve can_release=true e a evidencia que autoriza', async () => {
    const lot = buildLot();
    const repository = buildQualityRepository({ lot });
    repository.findLatestInspectionForLot = jest.fn(async () => ({
      id: 88,
      inspection_number: 'INSP-1',
      stage: 'incoming',
      verdict: 'approved',
      acceptance_criteria: 'Visual',
      inspector_id: 42,
      inspected_at: new Date('2026-08-10T12:00:00Z'),
      non_conformity_id: null,
    }));
    const useCase = new GetLotReleaseEligibilityUseCase(repository as any);

    const result = await useCase.execute({ lotId: 77 });

    expect(result.can_release).toBe(true);
    expect(result.latest_inspection.id).toBe(88);
    expect(lot.update).not.toHaveBeenCalled();
  });

  it('lote inexistente devolve NotFoundError com details.rule', async () => {
    const repository = buildQualityRepository();
    repository.findLotById = jest.fn(async () => null);
    const useCase = new GetLotReleaseEligibilityUseCase(repository as any);

    await expect(useCase.execute({ lotId: 4242 })).rejects.toMatchObject({
      constructor: NotFoundError,
      details: { rule: QUALITY_INSPECTION_RULE, lot_id: 4242 },
    });
  });
});

describe('G7 — listagem de inspecoes', () => {
  it('ignora filtro de enum invalido em vez de repassa-lo ao Postgres (evitaria um 500)', async () => {
    const repository = buildQualityRepository();
    const useCase = new ListQualityInspectionsUseCase(repository as any);

    await useCase.execute({ verdict: 'aprovado', stage: 'recebimento', lot_id: 77 });

    const where = repository.listInspections.mock.calls[0][0];
    expect(where).toEqual({ lot_id: 77 });
  });

  it('repassa filtros validos e pagina', async () => {
    const repository = buildQualityRepository();
    const useCase = new ListQualityInspectionsUseCase(repository as any);

    await useCase.execute({ verdict: 'rejected', stage: 'final', page: 2, limit: 10 });

    expect(repository.listInspections).toHaveBeenCalledWith(
      { verdict: 'rejected', stage: 'final' },
      { limit: 10, offset: 10 }
    );
  });
});
