/**
 * `PATCH /api/rh/absences/:id/esocial-confirmation` — confirmação de envio
 * do evento S-2230 ao eSocial. Identidade de quem confirma vem sempre de
 * `req.user.id` (anti-spoofing), nunca do body.
 *
 * @module modules/rh/application/use-cases/absence/ConfirmAbsenceEsocialUseCase
 */
import UseCase from '../../../../../shared/application/UseCase';
import { NotFoundError } from '../../../../../errors';
import AbsenceRepository from '../../../domain/repositories/AbsenceRepository';

interface ConfirmAbsenceEsocialInput {
  id: number | string;
  confirmedBy: number;
}

class ConfirmAbsenceEsocialUseCase extends UseCase<ConfirmAbsenceEsocialInput, any> {
  private readonly absenceRepository: AbsenceRepository;

  public constructor(absenceRepository: AbsenceRepository) {
    super();
    this.absenceRepository = absenceRepository;
  }

  /** @throws {NotFoundError} Afastamento não existe (404). */
  public async execute(input: ConfirmAbsenceEsocialInput): Promise<any> {
    const absence = await this.absenceRepository.findById(input.id);
    if (!absence) throw new NotFoundError('Afastamento não encontrado.');

    return this.absenceRepository.update(input.id, {
      s2230_confirmed_at: new Date(),
      s2230_confirmed_by: input.confirmedBy,
    });
  }
}

export = ConfirmAbsenceEsocialUseCase;
