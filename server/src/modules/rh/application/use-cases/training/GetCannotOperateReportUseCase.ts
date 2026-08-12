/**
 * `GET /api/rh/employee-trainings/cannot-operate-report` — RF-RH-058, §11.4
 * do contrato de API. Funcionários ativos com cargo cuja matriz
 * (`HrJobPosition × HrTrainingCourse`, RF-RH-026) exige treinamento
 * ausente/vencido. É um RELATÓRIO — nunca bloqueia operação sozinho (o gate
 * de produção em si, se existir, é responsabilidade de `manufacturing`,
 * fora deste contrato).
 *
 * @module modules/rh/application/use-cases/training/GetCannotOperateReportUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import TrainingCourseRepository from '../../../domain/repositories/TrainingCourseRepository';
import EmployeeTrainingRepository from '../../../domain/repositories/EmployeeTrainingRepository';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import { isTrainingExpired } from '../../../domain/services/trainingRules';

interface GetCannotOperateReportInput {
  department_id?: number;
  today?: string;
}

class GetCannotOperateReportUseCase extends UseCase<GetCannotOperateReportInput, any> {
  private readonly trainingCourseRepository: TrainingCourseRepository;
  private readonly employeeTrainingRepository: EmployeeTrainingRepository;
  private readonly employeeDirectoryService: EmployeeDirectoryService;

  public constructor(
    trainingCourseRepository: TrainingCourseRepository,
    employeeTrainingRepository: EmployeeTrainingRepository,
    employeeDirectoryService: EmployeeDirectoryService,
  ) {
    super();
    this.trainingCourseRepository = trainingCourseRepository;
    this.employeeTrainingRepository = employeeTrainingRepository;
    this.employeeDirectoryService = employeeDirectoryService;
  }

  public async execute(input: GetCannotOperateReportInput): Promise<any> {
    const today = input.today ?? new Date().toISOString().slice(0, 10);
    const employees = await this.employeeDirectoryService.listActiveWithJobPosition(input.department_id ?? null);

    const requiredCoursesByJobPosition = new Map<number, any[]>();
    const items: any[] = [];

    for (const employee of employees) {
      if (!employee.job_position_id) continue;

      let requiredLinks = requiredCoursesByJobPosition.get(employee.job_position_id);
      if (!requiredLinks) {
        requiredLinks = await this.trainingCourseRepository.listRequiredByJobPosition(employee.job_position_id);
        requiredCoursesByJobPosition.set(employee.job_position_id, requiredLinks);
      }

      for (const link of requiredLinks) {
        const course = (link as any).trainingCourse ?? link;
        const latest = await this.employeeTrainingRepository.findLatestByEmployeeAndCourse(employee.id, course.id);

        if (!latest) {
          items.push({
            employee_id: employee.id,
            employee_name: employee.name,
            department_id: employee.department_id,
            training_course_id: course.id,
            training_course_name: course.name,
            reason: 'ausente',
            valid_until: null,
          });
          continue;
        }

        if (isTrainingExpired(latest.valid_until, today)) {
          items.push({
            employee_id: employee.id,
            employee_name: employee.name,
            department_id: employee.department_id,
            training_course_id: course.id,
            training_course_name: course.name,
            reason: 'vencido',
            valid_until: latest.valid_until,
          });
        }
      }
    }

    return { items, total: items.length };
  }
}

export = GetCannotOperateReportUseCase;
