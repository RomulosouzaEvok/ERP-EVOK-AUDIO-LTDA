import ListAuditLogsUseCase = require('../../src/modules/auditLogs/application/use-cases/ListAuditLogsUseCase');
import GetAuditLogByIdUseCase = require('../../src/modules/auditLogs/application/use-cases/GetAuditLogByIdUseCase');
import { NotFoundError } from '../../src/errors';

describe('Use cases de logs de auditoria', () => {
  it('calcula paginação corretamente ao listar logs', async () => {
    const auditLogsRepository = {
      findAndCountAll: jest.fn(async () => ({ count: 25, rows: [{ id: 1 }] })),
    };

    const useCase = new ListAuditLogsUseCase(auditLogsRepository as any);

    const result = await useCase.execute({ page: '2', limit: '10' });

    expect(auditLogsRepository.findAndCountAll).toHaveBeenCalledWith(
      { entity_type: undefined, entity_id: undefined, action: undefined, start_date: undefined, end_date: undefined },
      { limit: 10, offset: 10 }
    );
    expect(result).toEqual({ rows: [{ id: 1 }], total: 25, page: 2, limit: 10, totalPages: 3 });
  });

  it('lança NotFoundError ao buscar log de auditoria inexistente', async () => {
    const auditLogsRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetAuditLogByIdUseCase(auditLogsRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });
});
