/**
 * Test: Requisicao por departamento (Bloco C,
 * docs/governance/TODO_REORGANIZACAO_DEPARTAMENTOS.md).
 *
 * Cobre:
 * 1. `CreatePurchaseRequisitionUseCase` resolve `department_id` sempre a
 *    partir do `Employee` vinculado ao usuario autenticado
 *    (`requester_id` -> `Employee.user_id` -> `Employee.department_id`),
 *    nunca de um valor enviado pelo cliente.
 * 2. Quando o usuario autenticado nao tem `Employee` vinculado,
 *    `department_id` fica `null` (sem quebrar a criacao).
 * 3. `ListPurchaseRequisitionsUseCase` repassa o filtro `department_id`
 *    para o repositorio.
 *
 * @group unit
 * @ticket Bloco-C-Reorganizacao-Departamentos
 */

const employeeFindOneMock = jest.fn();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CreatePurchaseRequisitionUseCase = require('../../src/modules/purchaseRequisitions/application/use-cases/CreatePurchaseRequisitionUseCase');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ListPurchaseRequisitionsUseCase = require('../../src/modules/purchaseRequisitions/application/use-cases/ListPurchaseRequisitionsUseCase');

describe('CreatePurchaseRequisitionUseCase — department_id derivado do usuario logado', () => {
  beforeEach(() => {
    employeeFindOneMock.mockReset();
  });

  function makeUseCase() {
    const requisitionRepository = {
      createRequisition: jest.fn(async (data: any) => ({ id: 10, requisition_number: data.requisition_number, status: data.status, origin: data.origin, department_id: data.department_id })),
      createRequisitionItem: jest.fn(async (data: any) => data),
      findRequisitionById: jest.fn(async (id: number) => ({ id, requisition_number: 'RQ-DEPTO' })),
      findEngineeringProjectById: jest.fn(async () => null),
      findEmployeeByUserId: jest.fn(async (...args: any[]) => employeeFindOneMock(...args)),
    };
    const itemRepository = {
      findById: jest.fn(async (id: string) => (id === 'item-1' ? { id } : null)),
    };
    return { useCase: new CreatePurchaseRequisitionUseCase(requisitionRepository, itemRepository), requisitionRepository, itemRepository };
  }

  it('preenche department_id a partir do Employee vinculado ao usuario autenticado', async () => {
    employeeFindOneMock.mockResolvedValue({ id: 99, department_id: 4 });
    const { useCase, requisitionRepository } = makeUseCase();

    await useCase.execute({
      requester_id: 123,
      origin: 'manual',
      items: [{ item_id: 'item-1', quantity: 1 }],
    });

    expect(requisitionRepository.findEmployeeByUserId).toHaveBeenCalledWith(123, undefined);
    expect(requisitionRepository.createRequisition).toHaveBeenCalledWith(
      expect.objectContaining({ department_id: 4 }),
      undefined,
    );
  });

  it('ignora department_id enviado pelo cliente e sempre resolve pelo usuario logado (anti-spoofing)', async () => {
    employeeFindOneMock.mockResolvedValue({ id: 99, department_id: 4 });
    const { useCase, requisitionRepository } = makeUseCase();

    await useCase.execute({
      requester_id: 123,
      department_id: 999, // valor malicioso/indevido enviado pelo cliente
      origin: 'manual',
      items: [{ item_id: 'item-1', quantity: 1 }],
    });

    expect(requisitionRepository.createRequisition).toHaveBeenCalledWith(
      expect.objectContaining({ department_id: 4 }),
      undefined,
    );
  });

  it('mantem department_id null quando o usuario autenticado nao tem Employee vinculado', async () => {
    employeeFindOneMock.mockResolvedValue(null);
    const { useCase, requisitionRepository } = makeUseCase();

    await useCase.execute({
      requester_id: 555,
      origin: 'manual',
      items: [{ item_id: 'item-1', quantity: 1 }],
    });

    expect(requisitionRepository.createRequisition).toHaveBeenCalledWith(
      expect.objectContaining({ department_id: null }),
      undefined,
    );
  });
});

describe('ListPurchaseRequisitionsUseCase — filtro por department_id', () => {
  it('repassa department_id ao repositorio para restringir a fila ao departamento do usuario', async () => {
    const requisitionRepository = {
      listRequisitions: jest.fn(async () => ({ rows: [], count: 0 })),
    };
    const useCase = new ListPurchaseRequisitionsUseCase(requisitionRepository);

    await useCase.execute({ department_id: 4, page: 1, limit: 20, offset: 0 });

    expect(requisitionRepository.listRequisitions).toHaveBeenCalledWith(
      expect.objectContaining({ department_id: 4 }),
      { limit: 20, offset: 0 },
    );
  });

  it('nao filtra por departamento quando department_id nao e informado', async () => {
    const requisitionRepository = {
      listRequisitions: jest.fn(async () => ({ rows: [], count: 0 })),
    };
    const useCase = new ListPurchaseRequisitionsUseCase(requisitionRepository);

    await useCase.execute({ page: 1, limit: 20, offset: 0 });

    expect(requisitionRepository.listRequisitions).toHaveBeenCalledWith(
      expect.objectContaining({ department_id: undefined }),
      { limit: 20, offset: 0 },
    );
  });
});
