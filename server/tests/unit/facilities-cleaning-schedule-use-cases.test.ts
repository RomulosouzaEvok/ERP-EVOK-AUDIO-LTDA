/**
 * Testes: casos de uso de Programação de Limpeza (módulo Facilities).
 *
 * @group unit
 */

const CreateCleaningScheduleUseCase = require('../../src/modules/facilities/application/use-cases/cleaningSchedule/CreateCleaningScheduleUseCase');
const ListCleaningSchedulesUseCase = require('../../src/modules/facilities/application/use-cases/cleaningSchedule/ListCleaningSchedulesUseCase');
const UpdateCleaningScheduleUseCase = require('../../src/modules/facilities/application/use-cases/cleaningSchedule/UpdateCleaningScheduleUseCase');
const { NotFoundError } = require('../../src/errors');

function makeCleaningScheduleRepository(overrides: Partial<any> = {}) {
  return {
    createCleaningSchedule: jest.fn(async (data: any) => ({ id: 1, ...data })),
    listCleaningSchedules: jest.fn(async () => ({ rows: [], count: 0 })),
    findCleaningScheduleById: jest.fn(async () => null),
    updateCleaningSchedule: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

describe('CreateCleaningScheduleUseCase', () => {
  it('FLUXO PRINCIPAL: cria programação de limpeza', async () => {
    const repo = makeCleaningScheduleRepository();

    const result = await new CreateCleaningScheduleUseCase(repo).execute({
      area: 'Refeitório', frequency: 'daily', responsible_person: 'Maria',
    });

    expect(repo.createCleaningSchedule).toHaveBeenCalledWith(expect.objectContaining({ area: 'Refeitório', frequency: 'daily' }));
    expect(result.id).toBe(1);
  });
});

describe('ListCleaningSchedulesUseCase', () => {
  it('lista programações paginadas', async () => {
    const repo = makeCleaningScheduleRepository({
      listCleaningSchedules: jest.fn(async () => ({ rows: [{ id: 1, area: 'Refeitório' }], count: 1 })),
    });

    const result = await new ListCleaningSchedulesUseCase(repo).execute({ page: 1, limit: 20, offset: 0 });

    expect(result.count).toBe(1);
    expect(result.rows).toHaveLength(1);
  });
});

describe('UpdateCleaningScheduleUseCase', () => {
  it('FLUXO DE EXCECAO: lança NotFoundError quando a programação não existe', async () => {
    const repo = makeCleaningScheduleRepository();
    await expect(new UpdateCleaningScheduleUseCase(repo).execute({ id: 999, area: 'Novo' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
