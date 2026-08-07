/**
 * Testes: casos de uso de Condutor (módulo Facilities, BLOCO 4 FAC) — foco
 * em CNH e suspensão (RF-FAC-011 a 015).
 *
 * @group unit
 */

const { CreateDriverUseCase, SuspendDriverUseCase } = require('../../src/modules/facilities/application/use-cases/driver/DriverUseCases');
const { ConflictError, NotFoundError, ValidationError } = require('../../src/errors');

function makeDriverRepository(overrides: Partial<any> = {}) {
  return {
    findByEmployeeId: jest.fn(async () => null),
    findById: jest.fn(async () => ({ id: 1, employee_id: 88, authorized: true })),
    create: jest.fn(async (data: any) => ({ id: 1, ...data })),
    update: jest.fn(async (id: number, data: any) => ({ id, ...data })),
    ...overrides,
  };
}

describe('CreateDriverUseCase', () => {
  it('FLUXO PRINCIPAL: cadastra condutor com authorized=false por padrão', async () => {
    const repo = makeDriverRepository();
    const result = await new CreateDriverUseCase(repo).execute({
      employee_id: 88, cnh_number: '12345678900', cnh_category: 'B', cnh_valid_until: '2029-05-10',
    });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ authorized: false }));
    expect(result.employee_id).toBe(88);
  });

  it('FLUXO DE EXCECAO: rejeita employee_id já cadastrado como condutor', async () => {
    const repo = makeDriverRepository({ findByEmployeeId: jest.fn(async () => ({ id: 5 })) });

    await expect(
      new CreateDriverUseCase(repo).execute({ employee_id: 88, cnh_number: '1', cnh_category: 'B', cnh_valid_until: '2029-05-10' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('FLUXO DE EXCECAO: rejeita payload sem campos obrigatórios', async () => {
    const repo = makeDriverRepository();
    await expect(new CreateDriverUseCase(repo).execute({ employee_id: 88 })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('SuspendDriverUseCase (RF-FAC-015)', () => {
  it('FLUXO PRINCIPAL: suspende condutor preservando histórico (não exclui)', async () => {
    const repo = makeDriverRepository();
    const result = await new SuspendDriverUseCase(repo).execute({ id: 1, suspension_reason: 'CNH cassada', suspendedBy: 9 });

    expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ authorized: false }));
    expect(result.authorized).toBe(false);
  });

  it('FLUXO DE EXCECAO: exige suspension_reason', async () => {
    const repo = makeDriverRepository();
    await expect(new SuspendDriverUseCase(repo).execute({ id: 1, suspension_reason: '', suspendedBy: 9 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('FLUXO DE EXCECAO: lança NotFoundError quando o condutor não existe', async () => {
    const repo = makeDriverRepository({ findById: jest.fn(async () => null) });
    await expect(new SuspendDriverUseCase(repo).execute({ id: 999, suspension_reason: 'x', suspendedBy: 9 })).rejects.toBeInstanceOf(NotFoundError);
  });
});
