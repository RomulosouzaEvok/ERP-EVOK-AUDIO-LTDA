/**
 * `POST /api/rh/employee-trainings` — RF-RH-057, §11.3 do contrato de API.
 * `valid_until` é sempre calculado no servidor (`completed_at +
 * TrainingCourse.validity_months`), nunca aceito no payload.
 *
 * @module modules/rh/application/use-cases/training/CreateEmployeeTrainingUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError, ValidationError } from '../../../../../errors';
import EmployeeTrainingRepository from '../../../domain/repositories/EmployeeTrainingRepository';
import TrainingCourseRepository from '../../../domain/repositories/TrainingCourseRepository';
import EmployeeDirectoryService from '../../services/EmployeeDirectoryService';
import { calculateValidUntil, normativeWarning } from '../../../domain/services/trainingRules';

interface CreateEmployeeTrainingInput {
  employee_id: number;
  training_course_id: number;
  completed_at: string;
  instructor_or_provider?: string | null;
  certificate_file_path?: string | null;
  createdBy: number;
}

class CreateEmployeeTrainingUseCase extends UseCase<CreateEmployeeTrainingInput, any> {
  private readonly employeeTrainingRepository: EmployeeTrainingRepository;
  private readonly trainingCourseRepository: TrainingCourseRepository;
  private readonly employeeDirectoryService: EmployeeDirectoryService;

  public constructor(
    employeeTrainingRepository: EmployeeTrainingRepository,
    trainingCourseRepository: TrainingCourseRepository,
    employeeDirectoryService: EmployeeDirectoryService,
  ) {
    super();
    this.employeeTrainingRepository = employeeTrainingRepository;
    this.trainingCourseRepository = trainingCourseRepository;
    this.employeeDirectoryService = employeeDirectoryService;
  }

  /**
   * @throws {ValidationError} Campos obrigatórios ausentes (400).
   * @throws {NotFoundError} `employee_id`/`training_course_id` não existe (404).
   */
  public async execute(input: CreateEmployeeTrainingInput): Promise<any> {
    if (!input.employee_id || !input.training_course_id || !input.completed_at) {
      throw new ValidationError('employee_id, training_course_id e completed_at são obrigatórios.');
    }

    const employee = await this.employeeDirectoryService.findById(input.employee_id);
    if (!employee) throw new NotFoundError('Funcionário não encontrado.');

    const course = await this.trainingCourseRepository.findById(input.training_course_id);
    if (!course) throw new NotFoundError('Curso de treinamento não encontrado.');

    const validUntil = calculateValidUntil(input.completed_at, course.validity_months);

    const created = await this.employeeTrainingRepository.create({
      employee_id: input.employee_id,
      training_course_id: input.training_course_id,
      completed_at: input.completed_at,
      instructor_or_provider: input.instructor_or_provider ?? null,
      certificate_file_path: input.certificate_file_path ?? null,
      valid_until: validUntil,
      created_by: input.createdBy,
    });

    const plain = typeof (created as any)?.toJSON === 'function' ? (created as any).toJSON() : created;
    const warning = normativeWarning(Boolean(course.is_normative));
    return warning ? { ...plain, warning } : plain;
  }
}

export = CreateEmployeeTrainingUseCase;
