/**
 * `GET /api/rh/training-courses` — RF-RH-055.
 * @module modules/rh/application/use-cases/training/ListTrainingCoursesUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import TrainingCourseRepository from '../../../domain/repositories/TrainingCourseRepository';

interface ListTrainingCoursesInput {
  is_normative?: boolean;
  active?: boolean;
  page?: number;
  limit?: number;
}

class ListTrainingCoursesUseCase extends UseCase<ListTrainingCoursesInput, any> {
  private readonly trainingCourseRepository: TrainingCourseRepository;

  public constructor(trainingCourseRepository: TrainingCourseRepository) {
    super();
    this.trainingCourseRepository = trainingCourseRepository;
  }

  public async execute(input: ListTrainingCoursesInput): Promise<any> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const { count, rows } = await this.trainingCourseRepository.findAndCount(
      { is_normative: input.is_normative, active: input.active },
      { limit, offset: (page - 1) * limit },
    );
    return { count, rows, page, limit, totalPages: Math.ceil(count / limit) || 1 };
  }
}

export = ListTrainingCoursesUseCase;
