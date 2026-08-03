/**
 * Test: Camada de aplicacao de Centros de Trabalho (WorkCenters)
 *
 * Cobre:
 * - CreateWorkCenterUseCase: 409 (ConflictError) em codigo duplicado.
 * - ReplaceWorkCenterShiftsUseCase: 422 (BusinessRuleError) em turnos
 *   sobrepostos e em end_time <= start_time.
 * - GetWorkCenterLoadUseCase: calculo de capacidade com e sem turnos
 *   cadastrados, e utilization_rate protegida contra divisao por zero.
 */

import CreateWorkCenterUseCase = require('../../src/modules/workCenters/application/use-cases/CreateWorkCenterUseCase');
import UpdateWorkCenterUseCase = require('../../src/modules/workCenters/application/use-cases/UpdateWorkCenterUseCase');
import ReplaceWorkCenterShiftsUseCase = require('../../src/modules/workCenters/application/use-cases/ReplaceWorkCenterShiftsUseCase');
import GetWorkCenterLoadUseCase = require('../../src/modules/workCenters/application/use-cases/GetWorkCenterLoadUseCase');
import { ConflictError, BusinessRuleError, NotFoundError } from '../../src/errors';

describe('CreateWorkCenterUseCase', () => {
  it('normaliza o code (uppercase/trim) e cria o centro de trabalho', async () => {
    const workCenterRepository = {
      findWorkCenterByCode: jest.fn(async () => null),
      createWorkCenter: jest.fn(async (data: any) => ({ id: 1, ...data })),
    };

    const useCase = new CreateWorkCenterUseCase(workCenterRepository as any);
    const result = await useCase.execute({ code: '  cnc-01  ', name: 'CNC 01' });

    expect(workCenterRepository.findWorkCenterByCode).toHaveBeenCalledWith('CNC-01');
    expect(workCenterRepository.createWorkCenter).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CNC-01',
        name: 'CNC 01',
        machines_count: 1,
        capacity_hours_per_day: 8,
        efficiency_factor: 1,
      }),
      undefined
    );
    expect(result).toMatchObject({ code: 'CNC-01' });
  });

  it('rejeita code duplicado com ConflictError (409)', async () => {
    const workCenterRepository = {
      findWorkCenterByCode: jest.fn(async () => ({ id: 5, code: 'CNC-01' })),
      createWorkCenter: jest.fn(),
    };

    const useCase = new CreateWorkCenterUseCase(workCenterRepository as any);

    await expect(
      useCase.execute({ code: 'cnc-01', name: 'CNC 01 Duplicado' })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(workCenterRepository.createWorkCenter).not.toHaveBeenCalled();
  });
});

describe('UpdateWorkCenterUseCase', () => {
  it('rejeita code duplicado de outro centro com ConflictError (409)', async () => {
    const workCenterRepository = {
      findWorkCenterById: jest.fn(async (id: number) => ({ id, code: 'CNC-01' })),
      findWorkCenterByCode: jest.fn(async () => ({ id: 999, code: 'CNC-02' })),
      updateWorkCenter: jest.fn(),
    };

    const useCase = new UpdateWorkCenterUseCase(workCenterRepository as any);

    await expect(
      useCase.execute({ id: 1, code: 'cnc-02' })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(workCenterRepository.updateWorkCenter).not.toHaveBeenCalled();
  });

  it('lanca NotFoundError (404) se o centro de trabalho nao existir', async () => {
    const workCenterRepository = {
      findWorkCenterById: jest.fn(async () => null),
      findWorkCenterByCode: jest.fn(),
      updateWorkCenter: jest.fn(),
    };

    const useCase = new UpdateWorkCenterUseCase(workCenterRepository as any);

    await expect(
      useCase.execute({ id: 999, name: 'Novo nome' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ReplaceWorkCenterShiftsUseCase', () => {
  const buildRepository = () => ({
    findWorkCenterById: jest.fn(async (id: number) => ({ id, code: 'CNC-01' })),
    deleteShiftsByWorkCenter: jest.fn(async () => undefined),
    createShift: jest.fn(async (data: any) => data),
  });

  it('rejeita turnos sobrepostos no mesmo weekday com BusinessRuleError (422)', async () => {
    const workCenterRepository = buildRepository();
    const useCase = new ReplaceWorkCenterShiftsUseCase(workCenterRepository as any);

    await expect(
      useCase.execute({
        work_center_id: 1,
        transaction: {},
        shifts: [
          { weekday: 1, start_time: '08:00', end_time: '12:00' },
          { weekday: 1, start_time: '11:00', end_time: '17:00' },
        ],
      })
    ).rejects.toBeInstanceOf(BusinessRuleError);

    expect(workCenterRepository.deleteShiftsByWorkCenter).not.toHaveBeenCalled();
  });

  it('rejeita turno com end_time <= start_time com BusinessRuleError (422)', async () => {
    const workCenterRepository = buildRepository();
    const useCase = new ReplaceWorkCenterShiftsUseCase(workCenterRepository as any);

    await expect(
      useCase.execute({
        work_center_id: 1,
        transaction: {},
        shifts: [{ weekday: 2, start_time: '17:00', end_time: '08:00' }],
      })
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('aceita turnos validos em weekdays diferentes e substitui via delete+insert', async () => {
    const workCenterRepository = buildRepository();
    const useCase = new ReplaceWorkCenterShiftsUseCase(workCenterRepository as any);

    await useCase.execute({
      work_center_id: 1,
      transaction: { id: 'tx' },
      shifts: [
        { weekday: 1, start_time: '08:00', end_time: '17:00' },
        { weekday: 2, start_time: '08:00', end_time: '17:00' },
      ],
    });

    expect(workCenterRepository.deleteShiftsByWorkCenter).toHaveBeenCalledWith(1, { id: 'tx' });
    expect(workCenterRepository.createShift).toHaveBeenCalledTimes(2);
  });

  it('aceita turnos nao sobrepostos no mesmo weekday (manha e tarde)', async () => {
    const workCenterRepository = buildRepository();
    const useCase = new ReplaceWorkCenterShiftsUseCase(workCenterRepository as any);

    await useCase.execute({
      work_center_id: 1,
      transaction: {},
      shifts: [
        { weekday: 1, start_time: '08:00', end_time: '12:00' },
        { weekday: 1, start_time: '13:00', end_time: '17:00' },
      ],
    });

    expect(workCenterRepository.createShift).toHaveBeenCalledTimes(2);
  });
});

describe('GetWorkCenterLoadUseCase', () => {
  it('calcula capacidade a partir de capacity_hours_per_day quando o centro nao tem turnos', async () => {
    const workCenterRepository = {
      listActiveWorkCentersWithShifts: jest.fn(async () => ([
        {
          get: () => ({
            id: 1,
            code: 'CNC-01',
            name: 'CNC 01',
            machines_count: 2,
            capacity_hours_per_day: 8,
            efficiency_factor: 1,
            shifts: [],
          }),
        },
      ])),
      aggregateLoadByWorkCenter: jest.fn(async () => ([
        { work_center_id: 1, load_hours: 20, steps_count: 3 },
      ])),
    };

    const useCase = new GetWorkCenterLoadUseCase(workCenterRepository as any);
    const result = await useCase.execute({ days: 7 });

    // 8h/dia * 7 dias * 2 maquinas * eficiencia 1 = 112h
    expect(result.centers[0]).toMatchObject({
      id: 1,
      capacity_hours: 112,
      load_hours: 20,
      steps_count: 3,
    });
    expect(result.centers[0].utilization_rate).toBeCloseTo(20 / 112, 4);
  });

  it('calcula capacidade a partir dos turnos cadastrados quando existentes', async () => {
    const today = new Date();
    const todayWeekday = today.getDay();

    const workCenterRepository = {
      listActiveWorkCentersWithShifts: jest.fn(async () => ([
        {
          get: () => ({
            id: 2,
            code: 'CNC-02',
            name: 'CNC 02',
            machines_count: 1,
            capacity_hours_per_day: 8,
            efficiency_factor: 0.5,
            // Turno de 8h apenas no weekday de hoje.
            shifts: [{ weekday: todayWeekday, start_time: '08:00', end_time: '16:00' }],
          }),
        },
      ])),
      aggregateLoadByWorkCenter: jest.fn(async () => ([])),
    };

    const useCase = new GetWorkCenterLoadUseCase(workCenterRepository as any);
    // Horizonte de 1 dia (hoje): 1 ocorrencia do weekday de hoje.
    const result = await useCase.execute({ days: 1 });

    // 8h de turno * 1 ocorrencia * 1 maquina * eficiencia 0.5 = 4h
    expect(result.centers[0].capacity_hours).toBe(4);
    expect(result.centers[0].load_hours).toBe(0);
    expect(result.centers[0].utilization_rate).toBe(0);
  });

  it('retorna utilization_rate null quando capacity_hours é 0 (protegido contra divisao por zero)', async () => {
    const workCenterRepository = {
      listActiveWorkCentersWithShifts: jest.fn(async () => ([
        {
          get: () => ({
            id: 3,
            code: 'CNC-03',
            name: 'CNC 03',
            machines_count: 1,
            capacity_hours_per_day: 8,
            efficiency_factor: 1,
            // Turno com 0h de duracao em todos os weekdays possiveis do horizonte.
            shifts: [{ weekday: 0, start_time: '08:00', end_time: '08:00' }],
          }),
        },
      ])),
      aggregateLoadByWorkCenter: jest.fn(async () => ([
        { work_center_id: 3, load_hours: 5, steps_count: 1 },
      ])),
    };

    const useCase = new GetWorkCenterLoadUseCase(workCenterRepository as any);
    const result = await useCase.execute({ days: 1 });

    expect(result.centers[0].capacity_hours).toBe(0);
    expect(result.centers[0].utilization_rate).toBeNull();
  });

  it('ordena os centros por utilization_rate desc (null tratado como o menor valor)', async () => {
    const workCenterRepository = {
      listActiveWorkCentersWithShifts: jest.fn(async () => ([
        {
          get: () => ({
            id: 10, code: 'A', name: 'A', machines_count: 1,
            capacity_hours_per_day: 10, efficiency_factor: 1, shifts: [],
          }),
        },
        {
          get: () => ({
            id: 11, code: 'B', name: 'B', machines_count: 1,
            capacity_hours_per_day: 10, efficiency_factor: 1, shifts: [],
          }),
        },
        {
          get: () => ({
            id: 12, code: 'C', name: 'C', machines_count: 1,
            capacity_hours_per_day: 0, efficiency_factor: 1, shifts: [],
          }),
        },
      ])),
      aggregateLoadByWorkCenter: jest.fn(async () => ([
        { work_center_id: 10, load_hours: 5, steps_count: 1 },
        { work_center_id: 11, load_hours: 9, steps_count: 1 },
      ])),
    };

    const useCase = new GetWorkCenterLoadUseCase(workCenterRepository as any);
    const result = await useCase.execute({ days: 1 });

    expect(result.centers.map((c: any) => c.id)).toEqual([11, 10, 12]);
    expect(result.centers[2].utilization_rate).toBeNull();
  });
});
