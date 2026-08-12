/**
 * `GET /api/rh/employee-benefits/monthly-report` — RF-RH-053, §10.2 do
 * contrato de API. `hr_employee_benefits` não tem coluna de competência —
 * "vigente na competência" é derivado por `enrolled_at <= fim do mês` e
 * (`canceled_at` nulo OU `canceled_at >= início do mês`), decisão desta
 * implementação registrada no HANDOFF (a tabela não foi alterada). Agrega
 * `company_cost_value` por departamento (via `Department.cost_center_id`,
 * RF-RH-053/071); `discount_value` individual só aparece na lista plana
 * (relatório de SAÍDA para o provedor de folha — RNF-RH-03, não escreve).
 *
 * @module modules/rh/application/use-cases/benefit/GetMonthlyBenefitReportUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import EmployeeBenefitRepository from '../../../domain/repositories/EmployeeBenefitRepository';

interface GetMonthlyBenefitReportInput {
  competencia: string; // YYYY-MM
}

class GetMonthlyBenefitReportUseCase extends UseCase<GetMonthlyBenefitReportInput, any> {
  private readonly employeeBenefitRepository: EmployeeBenefitRepository;

  public constructor(employeeBenefitRepository: EmployeeBenefitRepository) {
    super();
    this.employeeBenefitRepository = employeeBenefitRepository;
  }

  /** @throws {ValidationError} `competencia` ausente/mal formatada (400). */
  public async execute(input: GetMonthlyBenefitReportInput): Promise<any> {
    if (!input.competencia || !/^\d{4}-\d{2}$/.test(input.competencia)) {
      throw new ValidationError('competencia é obrigatória, no formato YYYY-MM.');
    }
    const [year, month] = input.competencia.split('-').map(Number);
    const monthStart = `${input.competencia}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthEnd = `${input.competencia}-${String(lastDay).padStart(2, '0')}`;

    const rows = await this.employeeBenefitRepository.listActiveForCompetence(monthStart, monthEnd);

    const byDepartment = new Map<string, { department_id: number | null; cost_center_id: number | null; company_cost_total: number; count: number }>();
    const items = rows.map((row: any) => {
      const employee = row.employee ?? null;
      const department = employee?.department ?? null;
      const departmentId = department?.id ?? employee?.department_id ?? null;
      const costCenterId = department?.cost_center_id ?? null;
      const companyCost = Number(row.company_cost_value ?? 0);

      const key = String(departmentId ?? 'sem_departamento');
      const bucket = byDepartment.get(key) ?? { department_id: departmentId, cost_center_id: costCenterId, company_cost_total: 0, count: 0 };
      bucket.company_cost_total += companyCost;
      bucket.count += 1;
      byDepartment.set(key, bucket);

      return {
        employee_id: row.employee_id,
        department_id: departmentId,
        cost_center_id: costCenterId,
        benefit_type_id: row.benefit_type_id,
        benefit_type_name: row.benefitType?.name ?? null,
        discount_value: row.discount_value,
        company_cost_value: row.company_cost_value,
      };
    });

    return {
      competencia: input.competencia,
      items,
      by_department: Array.from(byDepartment.values()),
    };
  }
}

export = GetMonthlyBenefitReportUseCase;
