/**
 * Testes do relatório de OEE (item 7/9 do LEVANTAMENTO_ERP — "OEE completo
 * ainda não implementado"): GET /api/reports/oee.
 *
 * Mocka `ReportsRepository.findWorkCentersForOee` e
 * `findOeeAggregatesByWorkCenter` diretamente (as agregações SQL já viram
 * `OeeAggregateRow` prontos) — o foco destes testes é a regra de negócio do
 * use case: cálculo dos 3 eixos, composição do OEE, proteção contra divisão
 * por zero (null com motivo, nunca 0 enganoso) e agregação por soma (não
 * média) entre centros de trabalho.
 */

import GetOeeReportUseCase = require('../../src/modules/reports/application/use-cases/GetOeeReportUseCase');
const { ValidationError } = require('../../src/errors');

/** Turno idêntico em todos os 7 dias da semana — evita dependência do fuso/dia da semana do runner nos testes. */
function shiftsAllWeek(start_time: string, end_time: string) {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start_time, end_time }));
}

describe('GetOeeReportUseCase (item 7/9)', () => {
  it('calcula os 3 eixos (disponibilidade, performance, qualidade) a partir dos turnos e apontamentos', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        {
          id: 1,
          code: 'MONT',
          name: 'Montagem',
          machines_count: 1,
          capacity_hours_per_day: 8,
          efficiency_factor: 1,
          shifts: shiftsAllWeek('08:00', '17:00'), // 9h/dia, todos os dias
        },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => [
        { work_center_id: 1, run_hours: 45, standard_hours: 40.5, quantity_good: 90, quantity_scrapped: 10, tracking_count: 20 },
      ]),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    // 2026-08-03 a 2026-08-09: 7 dias corridos -> 9h * 7 = 63h disponíveis.
    const report = await useCase.execute({ start_date: '2026-08-03', end_date: '2026-08-09' });

    const center = report.by_work_center[0];
    expect(center.available_hours).toBe(63);
    expect(center.availability).toBeCloseTo(45 / 63, 4);
    expect(center.performance).toBeCloseTo(40.5 / 45, 4); // 0.9
    expect(center.quality).toBeCloseTo(0.9, 4);
    expect(center.no_data_reason).toBeNull();
  });

  it('compõe o OEE = disponibilidade × performance × qualidade', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        { id: 1, code: 'TESTE', name: 'Teste Acústico', machines_count: 1, capacity_hours_per_day: 10, efficiency_factor: 1, shifts: [] },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => [
        { work_center_id: 1, run_hours: 8, standard_hours: 6, quantity_good: 90, quantity_scrapped: 10, tracking_count: 5 },
      ]),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    // Período de 1 dia -> available_hours = 10 * 1 dia * 1 máquina * eficiência 1 = 10.
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-05' });

    const center = report.by_work_center[0];
    expect(center.availability).toBeCloseTo(0.8, 4);   // 8/10
    expect(center.performance).toBeCloseTo(0.75, 4);   // 6/8
    expect(center.quality).toBeCloseTo(0.9, 4);         // 90/100
    expect(center.oee).toBeCloseTo(0.8 * 0.75 * 0.9, 4); // 0.54
  });

  it('não confunde ausência de apontamento com 0%: performance/qualidade viram null, disponibilidade 0 é real', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        { id: 1, code: 'MONT', name: 'Montagem', machines_count: 1, capacity_hours_per_day: 8, efficiency_factor: 1, shifts: [] },
      ]),
      // Nenhum apontamento concluído no período para este centro.
      findOeeAggregatesByWorkCenter: jest.fn(async () => []),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-05' });

    const center = report.by_work_center[0];
    // available_hours > 0 (fallback capacity_hours_per_day) e run_hours = 0 -> 0% real, não null.
    expect(center.availability).toBe(0);
    // run_hours = 0 no denominador de performance -> null, não 0/0.
    expect(center.performance).toBeNull();
    // good+scrap = 0 no denominador de qualidade -> null.
    expect(center.quality).toBeNull();
    // OEE não pode ser calculado sem os 3 eixos.
    expect(center.oee).toBeNull();
    expect(center.no_data_reason).toContain('apontamento');
    expect(center.no_data_reason).toContain('quantidade');
  });

  it('centro sem turnos cadastrados usa o fallback capacity_hours_per_day × dias × máquinas × eficiência', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        { id: 2, code: 'CNC-02', name: 'CNC 02', machines_count: 2, capacity_hours_per_day: 8, efficiency_factor: 0.5, shifts: [] },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => [
        { work_center_id: 2, run_hours: 10, standard_hours: 10, quantity_good: 10, quantity_scrapped: 0, tracking_count: 1 },
      ]),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    // 3 dias corridos, sem turnos: 8h/dia * 3 dias * 2 máquinas * 0.5 eficiência = 24h.
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-07' });

    expect(report.by_work_center[0].available_hours).toBe(24);
    expect(report.by_work_center[0].availability).toBeCloseTo(10 / 24, 4);
  });

  it('refugo 100% no período: qualidade = 0 (real, não null, pois há denominador > 0)', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        { id: 3, code: 'QC', name: 'Controle de Qualidade', machines_count: 1, capacity_hours_per_day: 8, efficiency_factor: 1, shifts: [] },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => [
        { work_center_id: 3, run_hours: 5, standard_hours: 4, quantity_good: 0, quantity_scrapped: 50, tracking_count: 10 },
      ]),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-05' });

    expect(report.by_work_center[0].quality).toBe(0);
    expect(report.by_work_center[0].oee).toBe(0);
    expect(report.by_work_center[0].no_data_reason).toBeNull();
  });

  it('limita a performance a 100% quando o tempo real apontado é menor que o tempo padrão', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        { id: 4, code: 'RAPIDO', name: 'Linha rápida', machines_count: 1, capacity_hours_per_day: 24, efficiency_factor: 1, shifts: [] },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => [
        // standard_hours (20) > run_hours (10) -> razão bruta 2.0, deve ser limitada a 1.0.
        { work_center_id: 4, run_hours: 10, standard_hours: 20, quantity_good: 100, quantity_scrapped: 0, tracking_count: 3 },
      ]),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-05' });

    expect(report.by_work_center[0].performance).toBe(1);
    // As horas brutas permanecem sem cap, para auditoria.
    expect(report.by_work_center[0].standard_hours).toBe(20);
    expect(report.by_work_center[0].run_hours).toBe(10);
  });

  it('protege disponibilidade contra divisão por zero (sem turnos e capacidade/dia = 0)', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        { id: 5, code: 'SEM-CAPACIDADE', name: 'Sem capacidade cadastrada', machines_count: 1, capacity_hours_per_day: 0, efficiency_factor: 1, shifts: [] },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => [
        { work_center_id: 5, run_hours: 5, standard_hours: 5, quantity_good: 10, quantity_scrapped: 0, tracking_count: 2 },
      ]),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-05' });

    expect(report.by_work_center[0].available_hours).toBe(0);
    expect(report.by_work_center[0].availability).toBeNull();
    expect(report.by_work_center[0].oee).toBeNull();
    expect(report.by_work_center[0].no_data_reason).toContain('horas disponíveis');
  });

  it('agrega múltiplos centros somando as bases (não faz média simples das taxas)', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        { id: 1, code: 'A', name: 'Centro A', machines_count: 1, capacity_hours_per_day: 10, efficiency_factor: 1, shifts: [] },
        { id: 2, code: 'B', name: 'Centro B', machines_count: 1, capacity_hours_per_day: 100, efficiency_factor: 1, shifts: [] },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => [
        { work_center_id: 1, run_hours: 10, standard_hours: 5, quantity_good: 50, quantity_scrapped: 50, tracking_count: 5 },
        { work_center_id: 2, run_hours: 10, standard_hours: 10, quantity_good: 100, quantity_scrapped: 0, tracking_count: 8 },
      ]),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    // Período de 1 dia -> Centro A: available=10h, Centro B: available=100h.
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-05' });

    // Centro A isolado: D=1.0 (10/10), P=0.5 (5/10), Q=0.5 (50/100) -> oee_A = 0.25
    // Centro B isolado: D=0.1 (10/100), P=1.0 (10/10), Q=1.0 (100/100) -> oee_B = 0.1
    // Média simples seria (0.25+0.1)/2 = 0.175 — o agregado correto NÃO é isso.
    expect(report.aggregate.available_hours).toBe(110);
    expect(report.aggregate.run_hours).toBe(20);
    expect(report.aggregate.availability).toBeCloseTo(20 / 110, 4); // ~0.1818
    expect(report.aggregate.performance).toBeCloseTo(15 / 20, 4);   // 0.75
    expect(report.aggregate.quality).toBeCloseTo(150 / 200, 4);     // 0.75
    expect(report.aggregate.oee).not.toBeCloseTo(0.175, 2);
    expect(report.aggregate.work_centers_count).toBe(2);
  });

  it('filtra por work_center_id e repassa o filtro ao repositório', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        { id: 7, code: 'FILTRADO', name: 'Centro filtrado', machines_count: 1, capacity_hours_per_day: 8, efficiency_factor: 1, shifts: [] },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => []),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-05', work_center_id: '7' });

    expect(repository.findWorkCentersForOee).toHaveBeenCalledWith(7);
    expect(repository.findOeeAggregatesByWorkCenter).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), 7);
    expect(report.work_center_id).toBe(7);
  });

  it('rejeita work_center_id inválido (não numérico ou <= 0) com ValidationError', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(),
      findOeeAggregatesByWorkCenter: jest.fn(),
    };
    const useCase = new GetOeeReportUseCase(repository as any);

    await expect(useCase.execute({ work_center_id: 'abc' })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute({ work_center_id: 0 })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute({ work_center_id: -1 })).rejects.toBeInstanceOf(ValidationError);
    expect(repository.findWorkCentersForOee).not.toHaveBeenCalled();
  });

  it('período sem nenhum centro de trabalho ativo: aggregate com motivo explícito e by_work_center vazio', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => []),
      findOeeAggregatesByWorkCenter: jest.fn(async () => []),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    const report = await useCase.execute({});

    expect(report.by_work_center).toEqual([]);
    expect(report.aggregate.oee).toBeNull();
    expect(report.aggregate.work_centers_count).toBe(0);
    expect(report.aggregate.no_data_reason).toContain('nenhum centro de trabalho ativo');
  });

  it('suporta instâncias Sequelize (com .get({ plain: true }))', async () => {
    const repository = {
      findWorkCentersForOee: jest.fn(async () => [
        {
          get: () => ({
            id: 9, code: 'SEQ', name: 'Via Sequelize', machines_count: 1, capacity_hours_per_day: 8, efficiency_factor: 1, shifts: [],
          }),
        },
      ]),
      findOeeAggregatesByWorkCenter: jest.fn(async () => [
        { work_center_id: 9, run_hours: 4, standard_hours: 4, quantity_good: 8, quantity_scrapped: 0, tracking_count: 2 },
      ]),
    };

    const useCase = new GetOeeReportUseCase(repository as any);
    const report = await useCase.execute({ start_date: '2026-08-05', end_date: '2026-08-05' });

    expect(report.by_work_center[0].code).toBe('SEQ');
    expect(report.by_work_center[0].availability).toBeCloseTo(0.5, 4); // 4/8
  });
});
