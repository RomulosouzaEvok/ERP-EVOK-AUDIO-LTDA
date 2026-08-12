/**
 * Interface de serviço de acesso ao cadastro de funcionários (`employees`,
 * módulo `employees` já em produção) a partir do módulo RH.
 *
 * ⚠️ **Motivo de existir (correção de arquitetura da passada 2):** a passada
 * 1 fazia `require('../../../../../models/index')` DENTRO dos use cases de
 * férias/admissão/demissão para ler e gravar `Employee`. Isso viola a regra
 * de Clean Architecture do projeto ("zero Sequelize direto em use case",
 * `CLAUDE.md` §4 e o mesmo padrão já aplicado em `modules/marketing/`
 * (`ClientService`) e `modules/ti/` (`MaintenanceOrderService`)), e ainda
 * tornava os três use cases mais críticos do bloco impossíveis de testar
 * sem banco. Este serviço é a fronteira: o use case declara o que precisa,
 * o adapter de infraestrutura resolve como.
 *
 * Todos os métodos de escrita aceitam `transaction` porque RF-RH-009
 * (admissão) e RF-RH-022 (demissão) exigem explicitamente "uma única
 * transação"/"no mesmo ato transacional".
 *
 * @module modules/rh/application/services/EmployeeDirectoryService
 */

import { CreateEmployeeFromAdmissionData, ActiveEmployeeWithJobPosition } from './EmployeeDirectoryTypes';

abstract class EmployeeDirectoryService {
  /** Funcionário por id (ou `null`). `transaction` opcional para leitura dentro da transação do chamador. */
  abstract findById(employeeId: number | string, transaction?: unknown): Promise<any | null>;

  /** Headcount ativo (`employees.status='active'`) de um departamento — denominador do limite de equipe em férias (RF-RH-039). */
  abstract countActiveByDepartment(departmentId: number | string): Promise<number>;

  /**
   * Cria o registro em `employees` na conclusão da admissão (RF-RH-009).
   * @throws Erro bruto do Sequelize (`SequelizeUniqueConstraintError` em CPF duplicado) — o mapeamento para `ConflictError` é do use case.
   */
  abstract create(data: CreateEmployeeFromAdmissionData, transaction?: unknown): Promise<any>;

  /** Marca o funcionário como desligado (`status='fired'` + `dismissal_date`) na conclusão da demissão (RF-RH-022). */
  abstract markAsTerminated(employeeId: number | string, dismissalDate: string, transaction?: unknown): Promise<void>;

  /**
   * Atualiza `employees.status` (RF-RH-045/048 — `Absence` move o funcionário
   * para `'license'` na abertura e reverte para `'active'` no retorno).
   */
  abstract updateStatus(employeeId: number | string, status: string, transaction?: unknown): Promise<void>;

  /**
   * Funcionários ativos com cargo atribuído, opcionalmente filtrados por
   * departamento — insumo do relatório "quem não pode operar" (RF-RH-058).
   */
  abstract listActiveWithJobPosition(departmentId?: number | string | null): Promise<ActiveEmployeeWithJobPosition[]>;
}

export = EmployeeDirectoryService;
