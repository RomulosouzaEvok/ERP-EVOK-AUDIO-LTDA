/**
 * Controller HTTP do modulo de Laboratorio (testes acusticos / Thiele-Small).
 *
 * @module modules/laboratory/presentation/controllers/laboratoryController
 */

const { logAction } = require('../../../../services/auditLogService');
const SequelizeLaboratoryRepository = require('../../infrastructure/sequelize/SequelizeLaboratoryRepository');
const CreateAcousticTestUseCase = require('../../application/use-cases/CreateAcousticTestUseCase');
const ListAcousticTestsUseCase = require('../../application/use-cases/ListAcousticTestsUseCase');
const GetAcousticTestsSummaryUseCase = require('../../application/use-cases/GetAcousticTestsSummaryUseCase');
const {
  createTestSchema,
  listTestsQuerySchema,
  getSummaryQuerySchema,
  handleZodError,
} = require('../validators/laboratoryValidators');
const { ValidationError } = require('../../../../errors');

const laboratoryRepository = new SequelizeLaboratoryRepository();

/** `POST /api/laboratory/tests` — registra um resultado de teste de laboratorio. */
exports.createTest = async (req: any, res: any, next: any) => {
  try {
    const parsed = createTestSchema.safeParse(req.body);
    if (!parsed.success) handleZodError(parsed.error);

    const useCase = new CreateAcousticTestUseCase(laboratoryRepository);
    const test = await useCase.execute({ ...parsed.data, testerId: req.user.id });

    logAction(req, {
      action: 'create',
      entityType: 'AcousticTestResult',
      entityId: test?.id,
      entityDescription: `${test?.test_type} - produto #${test?.product_id}`,
      newValues: { test_type: test?.test_type, passed: test?.passed, product_id: test?.product_id },
      description: `Teste de laboratorio ${test?.test_type} registrado (passed=${test?.passed})`,
    });

    res.status(201).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

/** `GET /api/laboratory/tests` — lista paginada de testes de laboratorio (filtros + include product/tester). */
exports.listTests = async (req: any, res: any, next: any) => {
  try {
    const query = listTestsQuerySchema.parse(req.query);
    const useCase = new ListAcousticTestsUseCase(laboratoryRepository);
    const { rows, count, page, limit, totalPages } = await useCase.execute({
      ...query,
      offset: (query.page - 1) * query.limit,
    });

    res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages } });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};

/** `GET /api/laboratory/tests/summary` — agregado total/passed/failed/pass_rate por test_type. */
exports.getSummary = async (req: any, res: any, next: any) => {
  try {
    const query = getSummaryQuerySchema.parse(req.query);
    const useCase = new GetAcousticTestsSummaryUseCase(laboratoryRepository);
    const summary = await useCase.execute(query);

    res.json({ success: true, data: summary });
  } catch (error: any) {
    if (error?.issues) {
      return next(new ValidationError('Payload invalido.', error.issues));
    }
    next(error);
  }
};
