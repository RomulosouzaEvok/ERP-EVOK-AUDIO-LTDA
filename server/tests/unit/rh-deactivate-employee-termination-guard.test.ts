import DeactivateEmployeeUseCase from '../../src/modules/employees/application/use-cases/DeactivateEmployeeUseCase';

describe('DeactivateEmployeeUseCase — BLOCO 6 RH, reconciliação com HrTerminationProcess (achado 13)', () => {
  it('bloqueia DELETE quando existe HrTerminationProcess aberto para o funcionário', async () => {
    const employeesRepository: any = { update: jest.fn() };
    const terminationProcessChecker = { hasOpenTerminationProcess: jest.fn().mockResolvedValue(true) };
    const useCase = new (DeactivateEmployeeUseCase as any)(employeesRepository, terminationProcessChecker);

    await expect(useCase.execute({ id: 501 })).rejects.toMatchObject({ statusCode: 422, code: 'BUSINESS_RULE_VIOLATION' });
    expect(employeesRepository.update).not.toHaveBeenCalled();
  });

  it('permite DELETE normalmente quando não há HrTerminationProcess aberto', async () => {
    const employeesRepository: any = { update: jest.fn().mockResolvedValue({ id: 501 }) };
    const terminationProcessChecker = { hasOpenTerminationProcess: jest.fn().mockResolvedValue(false) };
    const useCase = new (DeactivateEmployeeUseCase as any)(employeesRepository, terminationProcessChecker);

    const result = await useCase.execute({ id: 501 });
    expect(result.message).toMatch(/desligado/);
    expect(employeesRepository.update).toHaveBeenCalledWith(501, expect.objectContaining({ status: 'inactive' }));
  });

  it('mantém o comportamento legado quando nenhum checker é injetado (compatibilidade)', async () => {
    const employeesRepository: any = { update: jest.fn().mockResolvedValue({ id: 501 }) };
    const useCase = new (DeactivateEmployeeUseCase as any)(employeesRepository);

    const result = await useCase.execute({ id: 501 });
    expect(result.message).toMatch(/desligado/);
  });

  it('lança NotFoundError quando o funcionário não existe', async () => {
    const employeesRepository: any = { update: jest.fn().mockResolvedValue(null) };
    const useCase = new (DeactivateEmployeeUseCase as any)(employeesRepository);

    await expect(useCase.execute({ id: 999 })).rejects.toMatchObject({ statusCode: 404 });
  });
});
