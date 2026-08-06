import CreateEmployeeUseCase = require('../../src/modules/employees/application/use-cases/CreateEmployeeUseCase');
import GetEmployeeByIdUseCase = require('../../src/modules/employees/application/use-cases/GetEmployeeByIdUseCase');
import UpdateEmployeeUseCase = require('../../src/modules/employees/application/use-cases/UpdateEmployeeUseCase');
import ListEmployeesUseCase = require('../../src/modules/employees/application/use-cases/ListEmployeesUseCase');
import { ValidationError, NotFoundError, ConflictError } from '../../src/errors';
import { SENSITIVE_EMPLOYEE_FIELDS } from '../../src/modules/employees/domain/services/employeeSensitiveFields';

describe('Use cases de funcionários', () => {
  it('rejeita criação de funcionário sem nome ou CPF', async () => {
    const employeesRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateEmployeeUseCase(employeesRepository as any);

    await expect(useCase.execute({ name: 'João' })).rejects.toBeInstanceOf(ValidationError);
    expect(employeesRepository.create).not.toHaveBeenCalled();
  });

  it('rejeita criação de funcionário com CPF inválido', async () => {
    const employeesRepository = {
      create: jest.fn(),
    };

    const useCase = new CreateEmployeeUseCase(employeesRepository as any);

    await expect(useCase.execute({ name: 'João', cpf: '111.111.111-11' })).rejects.toBeInstanceOf(ValidationError);
    expect(employeesRepository.create).not.toHaveBeenCalled();
  });

  it('converte violação de unicidade em ConflictError ao criar funcionário com CPF duplicado', async () => {
    const uniqueError: any = new Error('duplicate');
    uniqueError.name = 'SequelizeUniqueConstraintError';
    const employeesRepository = {
      create: jest.fn(async () => { throw uniqueError; }),
    };

    const useCase = new CreateEmployeeUseCase(employeesRepository as any);

    await expect(useCase.execute({ name: 'João', cpf: '529.982.247-25' })).rejects.toBeInstanceOf(ConflictError);
  });

  it('lança NotFoundError ao buscar funcionário inexistente', async () => {
    const employeesRepository = {
      findById: jest.fn(async () => null),
    };

    const useCase = new GetEmployeeByIdUseCase(employeesRepository as any);

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lança NotFoundError ao atualizar funcionário inexistente', async () => {
    const employeesRepository = {
      update: jest.fn(async () => 0),
      findById: jest.fn(),
    };

    const useCase = new UpdateEmployeeUseCase(employeesRepository as any);

    await expect(useCase.execute({ id: 999, body: { name: 'Novo' } })).rejects.toBeInstanceOf(NotFoundError);
    expect(employeesRepository.findById).not.toHaveBeenCalled();
  });
});

/**
 * BR-RH-020 (LGPD): `GET /api/employees` e `GET /api/employees/:id` não
 * podem vazar salário/CPF/dados bancários/endereço/telefone para usuários
 * sem acesso de RH. Ver `employeeSensitiveFields.ts`.
 */
describe('Segregação de campos sensíveis de RH (BR-RH-020)', () => {
  const fakeEmployee = {
    id: 1,
    name: 'Maria Silva',
    department_id: 3,
    cpf: '52998224725',
    rg: '123456',
    pis_pasep: '12012345678',
    ctps: '9988776',
    salary: 5000,
    salary_type: 'mensal',
    bank_name: 'Banco X',
    bank_agency: '0001',
    bank_account: '123456-7',
    bank_account_type: 'corrente',
    pix_key: 'maria@example.com',
    address: 'Rua das Flores, 100',
    phone: '11999998888',
    email: 'maria@evokaudio.com',
    position: 'Operadora de produção',
    status: 'active',
    shift: 'morning',
  };

  describe('GetEmployeeByIdUseCase', () => {
    it('retorna todos os campos, incluindo sensíveis, para role admin', async () => {
      const employeesRepository = { findById: jest.fn(async () => fakeEmployee) };
      const useCase = new GetEmployeeByIdUseCase(employeesRepository as any);

      const result = await useCase.execute({ id: 1, requestingUser: { role: 'admin' } });

      expect(result.salary).toBe(5000);
      expect(result.cpf).toBe(fakeEmployee.cpf);
      expect(result.bank_account).toBe(fakeEmployee.bank_account);
    });

    it('retorna todos os campos para usuário com módulo "rh" no perfil de acesso', async () => {
      const employeesRepository = { findById: jest.fn(async () => fakeEmployee) };
      const useCase = new GetEmployeeByIdUseCase(employeesRepository as any);

      const result = await useCase.execute({
        id: 1,
        requestingUser: { role: 'operator', permissions: { rh: 'operate' } },
      });

      expect(result.salary).toBe(5000);
      expect(result.cpf).toBe(fakeEmployee.cpf);
    });

    it('NÃO retorna salário/CPF/dados bancários/endereço/telefone para usuário autenticado comum', async () => {
      const employeesRepository = { findById: jest.fn(async () => fakeEmployee) };
      const useCase = new GetEmployeeByIdUseCase(employeesRepository as any);

      const result = await useCase.execute({
        id: 1,
        requestingUser: { role: 'operator', permissions: {} },
      });

      for (const field of SENSITIVE_EMPLOYEE_FIELDS) {
        expect(result).not.toHaveProperty(field);
      }
      // Continua funcional para uso básico (nome/cargo/departamento).
      expect(result.name).toBe('Maria Silva');
      expect(result.position).toBe('Operadora de produção');
      expect(result.department_id).toBe(3);
    });

    it('NÃO retorna campos sensíveis quando não há requestingUser (defesa em profundidade)', async () => {
      const employeesRepository = { findById: jest.fn(async () => fakeEmployee) };
      const useCase = new GetEmployeeByIdUseCase(employeesRepository as any);

      const result = await useCase.execute({ id: 1 });

      for (const field of SENSITIVE_EMPLOYEE_FIELDS) {
        expect(result).not.toHaveProperty(field);
      }
    });
  });

  describe('ListEmployeesUseCase', () => {
    it('lista continua funcionando (nome/departamento) e oculta campos sensíveis para usuário comum', async () => {
      const employeesRepository = {
        findAndCountAll: jest.fn(async () => ({ count: 1, rows: [fakeEmployee] })),
      };
      const useCase = new ListEmployeesUseCase(employeesRepository as any);

      const result = await useCase.execute({
        requestingUser: { role: 'operator', permissions: {} },
      });

      expect(result.total).toBe(1);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Maria Silva');
      for (const field of SENSITIVE_EMPLOYEE_FIELDS) {
        expect(result.rows[0]).not.toHaveProperty(field);
      }
    });

    it('lista retorna campos sensíveis completos para admin', async () => {
      const employeesRepository = {
        findAndCountAll: jest.fn(async () => ({ count: 1, rows: [fakeEmployee] })),
      };
      const useCase = new ListEmployeesUseCase(employeesRepository as any);

      const result = await useCase.execute({ requestingUser: { role: 'admin' } });

      expect(result.rows[0].salary).toBe(5000);
      expect(result.rows[0].cpf).toBe(fakeEmployee.cpf);
    });
  });
});
